import { NextResponse } from 'next/server';
import { parseRecipe, parseRecipeText } from '@/lib/recipe-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Block requests to private / loopback / link-local hosts (SSRF guard).
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h === '0.0.0.0' || h === '::1' || h === '[::1]') return true;
  // IPv4 private ranges: 10.x, 127.x, 192.168.x, 169.254.x, 172.16–31.x
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function validateUrl(input: unknown): URL | null {
  if (typeof input !== 'string' || input.trim().length === 0) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (isBlockedHost(url.hostname)) return null;
  return url;
}

export async function POST(request: Request) {
  let body: { url?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørgsel.' }, { status: 400 });
  }

  // Free-text path (pasted text or OCR'd screenshot) — no network fetch.
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (text) {
    try {
      const recipe = parseRecipeText(text);
      return NextResponse.json({ recipe });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunne ikke læse opskriften fra teksten.';
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  const url = validateUrl(body?.url);
  if (!url) {
    return NextResponse.json({ error: 'Indsæt et gyldigt link (http/https).' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let html: string;
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NemMadRecipeImporter/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Kunne ikke hente siden (status ${res.status}). Tjek linket.` },
        { status: 502 },
      );
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('html')) {
      return NextResponse.json({ error: 'Linket peger ikke på en webside med en opskrift.' }, { status: 415 });
    }
    html = await res.text();
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: aborted ? 'Siden svarede for langsomt. Prøv igen.' : 'Kunne ikke nå siden. Tjek din forbindelse og linket.' },
      { status: 504 },
    );
  } finally {
    clearTimeout(timeout);
  }

  try {
    const recipe = parseRecipe(html, url.toString());
    return NextResponse.json({ recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kunne ikke læse opskriften fra siden.';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
