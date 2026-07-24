// ---------------------------------------------------------------------------
// RECIPE PARSER — turns a fetched recipe-page HTML into the app's recipe shape.
// FREE, no AI: reads schema.org/Recipe data expressed as either JSON-LD or
// microdata. Danish quantity/unit parsing + keyword categorisation is done here
// so the /api/import-recipe route stays thin.
// ---------------------------------------------------------------------------
import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';

// The five fixed shopping categories the app groups by.
export const CATEGORY_ORDER = [
  'Frugt & grønt',
  'Kød & fisk',
  'Mejeri & køl',
  'Tørvarer',
  'Krydderi & andet',
] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

export interface Ingredient {
  id: string;
  name: string;
  amount: number | null; // null = unquantified ("salt og peber")
  unit: string;
  category: Category;
  pantryStaple?: boolean;
  shoppable?: false;
}

export interface Step {
  title: string;
  body: string;
  ingredientIds: string[];
  timerSeconds: number | null;
}

export interface Recipe {
  id: string;
  title: string;
  kicker: string;
  baseServings: number;
  servingUnit: string;
  totalTimeLabel: string;
  macros: { kcal: number; protein: number } | null;
  ingredients: Ingredient[];
  steps: Step[];
  isUserRecipe: true;
  sourceUrl?: string;
  image?: string;
}

// Intermediate shape both extractors produce before normalisation.
interface RawRecipe {
  title: string;
  category?: string;
  yield?: string | number;
  totalTimeIso?: string;
  ingredientStrings: string[];
  stepStrings: string[];
  kcal?: number | null;
  protein?: number | null;
  image?: string;
}

// ---------------------------------------------------------------------------
// DANISH DOMAIN KNOWLEDGE — tweak these two maps to improve categorisation.
// ---------------------------------------------------------------------------
const UNIT_ALIASES: Record<string, string> = {
  gram: 'g', g: 'g', 'g.': 'g', kg: 'kg', hg: 'hg', mg: 'mg',
  liter: 'l', l: 'l', dl: 'dl', cl: 'cl', ml: 'ml',
  spsk: 'spsk', 'spsk.': 'spsk', spiseskefuld: 'spsk', spiseskefulde: 'spsk',
  tsk: 'tsk', 'tsk.': 'tsk', teskefuld: 'tsk', teskefulde: 'tsk',
  knsp: 'knivspids', knivspids: 'knivspids',
  fed: 'fed', stk: 'stk', 'stk.': 'stk', styk: 'stk', stykker: 'stk',
  dåse: 'dåse', dåser: 'dåse', ds: 'dåse', 'ds.': 'dåse',
  pakke: 'pakke', pakker: 'pakke', bundt: 'bundt',
  kvist: 'kvist', kviste: 'kvist', blad: 'blad', blade: 'blad',
  skive: 'skive', skiver: 'skive', 'håndfuld': 'håndfuld', 'håndfulde': 'håndfuld',
  glas: 'glas', ps: 'pose', pose: 'pose', poser: 'pose',
};

// First matching keyword wins. Keep specific words before generic ones.
const CATEGORY_KEYWORDS: [Category, string[]][] = [
  ['Kød & fisk', ['kylling', 'oksekød', 'okse', 'svinekød', 'svin', 'flæsk', 'bacon', 'pølse', 'hakket', 'fars', 'kød', 'skinke', 'kalkun', 'and ', 'lam', 'laks', 'torsk', 'fisk', 'rejer', 'tun', 'muslinger', 'kotelet', 'bøf', 'mørbrad', 'culotte']],
  ['Mejeri & køl', ['mælk', 'fløde', 'smør', 'ost', 'skyr', 'yoghurt', 'creme fraiche', 'cremefraiche', 'æg', 'burrata', 'mozzarella', 'feta', 'parmesan', 'kærnemælk', 'ymer', 'flødeost']],
  ['Frugt & grønt', ['tomat', 'løg', 'hvidløg', 'kartoffel', 'kartofler', 'gulerod', 'gulerødder', 'peberfrugt', 'salat', 'spinat', 'agurk', 'squash', 'auberg', 'champignon', 'svamp', 'æble', 'banan', 'citron', 'lime', 'appelsin', 'basilikum', 'persille', 'koriander', 'dild', 'mynte', 'ingefær', 'chili', 'porre', 'selleri', 'broccoli', 'blomkål', 'ærter', 'bønner', 'majs', 'rødløg', 'forårsløg', 'bær', 'druer', 'mango', 'avocado', 'grønt']],
  ['Tørvarer', ['mel', 'ris', 'pasta', 'spaghetti', 'nudler', 'havregryn', 'gryn', 'sukker', 'kokosmælk', 'tomater på dåse', 'flåede', 'bouillon', 'linser', 'kikærter', 'quinoa', 'couscous', 'bulgur', 'olie', 'eddike', 'soja', 'honning', 'sirup', 'gær', 'bagepulver', 'natron', 'kakao', 'chokolade', 'nødder', 'mandler', 'pinjekerner', 'rosiner', 'protein', 'valle']],
  ['Krydderi & andet', ['salt', 'peber', 'karry', 'paprika', 'spidskommen', 'kanel', 'kardemomme', 'oregano', 'timian', 'rosmarin', 'muskat', 'krydderi', 'pesto', 'sennep', 'ketchup', 'fleur de sel']],
];

const PANTRY_STAPLE_KEYWORDS = ['salt', 'peber', 'olivenolie', 'olie', 'vand', 'fleur de sel'];

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅛': 0.125, '⅜': 0.375,
};

// ---------------------------------------------------------------------------
// PURE HELPERS
// ---------------------------------------------------------------------------
function clean(s: string): string {
  return String(s || '').replace(/\s+/g, ' ').replace(/ /g, ' ').trim();
}

// "PT1H30M" / "PT45M" / "PT2H" → total minutes.
export function isoDurationToMinutes(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = String(iso).match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const days = Number(m[1] || 0);
  const hours = Number(m[2] || 0);
  const mins = Number(m[3] || 0);
  const total = days * 1440 + hours * 60 + mins;
  return total > 0 ? total : null;
}

// Pick the longest of several ISO durations. Recipe sites often split time
// into totalTime (active) + cookTime (oven/wait); the wall-clock experience is
// the larger, so we surface that rather than the schema's mislabelled "total".
function longestIso(...isos: (string | undefined)[]): string | undefined {
  let best: string | undefined;
  let bestMin = -1;
  for (const iso of isos) {
    const m = isoDurationToMinutes(iso);
    if (m != null && m > bestMin) {
      bestMin = m;
      best = iso;
    }
  }
  return best;
}

export function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h} t ${m} min` : `~${h} t`;
}

// Group sub-headers that some sites mix into the ingredient list
// ("Bagte tomater", "Til servering") — skip them, they aren't ingredients.
function looksLikeHeader(raw: string): boolean {
  const s = clean(raw);
  if (!s || /\d/.test(s)) return false;
  if (/,/.test(s)) return false;
  if (/\b(salt|peber|olie|vand)\b/i.test(s)) return false;
  if (/^(til |pynt|tilbehør|topping|sauce|dressing|marinade|fyld|bund|top)\b/i.test(s)) return true;
  const words = s.split(/\s+/);
  return words.length <= 3 && /^[A-ZÆØÅ]/.test(s);
}

// "400 g cherrytomater" / "½ dl pesto" / "1 fed hvidløg, fintrevet"
// → { amount, unit, name }. amount is null when no quantity is stated.
export function parseDanishQuantity(raw: string): { amount: number | null; unit: string; name: string } {
  let s = clean(raw);
  // A leading range ("30-45 g", "2-3 spsk") → use the lower bound.
  s = s.replace(/^(\d+(?:[.,]\d+)?)\s*[-–—]\s*\d+(?:[.,]\d+)?/, '$1');

  let amount: number | null = null;
  const numMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*/);
  if (numMatch) {
    amount = parseFloat(numMatch[1].replace(',', '.'));
    s = s.slice(numMatch[0].length);
  }
  // A unicode fraction may follow an integer ("1 ½") or stand alone ("½").
  const fracMatch = s.match(/^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅛⅜])\s*/);
  if (fracMatch) {
    amount = (amount || 0) + UNICODE_FRACTIONS[fracMatch[1]];
    s = s.slice(fracMatch[0].length);
  }

  let unit = '';
  const unitMatch = s.match(/^([^\s]+)\s+/);
  if (unitMatch) {
    const candidate = unitMatch[1].toLowerCase().replace(/\.$/, '');
    if (UNIT_ALIASES[candidate] || UNIT_ALIASES[unitMatch[1].toLowerCase()]) {
      unit = UNIT_ALIASES[candidate] || UNIT_ALIASES[unitMatch[1].toLowerCase()];
      s = s.slice(unitMatch[0].length);
    }
  }

  const name = clean(s);
  return { amount, unit, name: name || clean(raw) };
}

function categorise(name: string): Category {
  const lower = name.toLowerCase();
  for (const [cat, words] of CATEGORY_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return cat;
  }
  return 'Krydderi & andet';
}

function isPantryStaple(name: string): boolean {
  const lower = name.toLowerCase();
  return PANTRY_STAPLE_KEYWORDS.some((w) => lower.includes(w));
}

// Detect a cooking wait ("i 30 minutter", "30-45 min", "1 time") → seconds.
function detectTimerSeconds(body: string): number | null {
  const hourMatch = body.match(/(\d+(?:[.,]\d+)?)\s*(?:time|timer)\b/i);
  if (hourMatch) return Math.round(parseFloat(hourMatch[1].replace(',', '.')) * 3600);
  // Range "30-45 min" → lower bound; single "30 min" → that value.
  const minMatch = body.match(/(\d+)(?:\s*[-–—]\s*\d+)?\s*(?:min|minut|minutter)\b/i);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;
  return null;
}

// Short imperative title from the first clause of a step body.
function deriveTitle(body: string, index: number): string {
  const firstClause = clean(body).split(/[.,:]/)[0];
  const words = firstClause.split(/\s+/).slice(0, 5).join(' ');
  if (words.length >= 3 && words.length <= 42) {
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return `Trin ${index + 1}`;
}

// ---------------------------------------------------------------------------
// NORMALISATION — RawRecipe → Recipe
// ---------------------------------------------------------------------------
function normalise(raw: RawRecipe, id: string, sourceUrl?: string): Recipe {
  const seen = new Set<string>();
  const ingredients: Ingredient[] = [];
  raw.ingredientStrings
    .map(clean)
    .filter((s) => s.length > 0 && !looksLikeHeader(s))
    .forEach((line, i) => {
      const { amount, unit, name } = parseDanishQuantity(line);
      let ingId = `i${i + 1}`;
      while (seen.has(ingId)) ingId += 'x';
      seen.add(ingId);
      ingredients.push({
        id: ingId,
        name,
        amount,
        unit,
        category: categorise(name),
        pantryStaple: isPantryStaple(name) || undefined,
      });
    });

  const steps: Step[] = raw.stepStrings
    .map(clean)
    .filter((s) => s.length > 0)
    .map((body, i) => {
      const linked = ingredients
        .filter((ing) => {
          const key = ing.name.toLowerCase().split(/[\s,]/)[0];
          return key.length >= 3 && body.toLowerCase().includes(key);
        })
        .map((ing) => ing.id);
      return { title: deriveTitle(body, i), body, ingredientIds: linked, timerSeconds: detectTimerSeconds(body) };
    });

  if (ingredients.length === 0 && steps.length === 0) {
    throw new Error('Fandt en opskrift, men uden ingredienser eller fremgangsmåde.');
  }

  const yieldNum = parseInt(String(raw.yield ?? ''), 10);
  const macros = raw.kcal != null && raw.protein != null
    ? { kcal: Math.round(raw.kcal), protein: Math.round(raw.protein) }
    : null;

  let image: string | undefined;
  if (raw.image) {
    try {
      image = new URL(String(raw.image).trim(), sourceUrl).toString();
    } catch {
      image = undefined;
    }
  }

  return {
    id,
    image,
    title: clean(raw.title) || 'Importeret opskrift',
    kicker: clean(raw.category || '') || 'Importeret opskrift',
    baseServings: Number.isFinite(yieldNum) && yieldNum > 0 ? yieldNum : 4,
    servingUnit: 'personer',
    totalTimeLabel: formatDuration(isoDurationToMinutes(raw.totalTimeIso)),
    macros,
    ingredients,
    steps,
    isUserRecipe: true,
    sourceUrl,
  };
}

// ---------------------------------------------------------------------------
// EXTRACTOR 1 — JSON-LD  (<script type="application/ld+json">)
// ---------------------------------------------------------------------------
function collectJsonLdNodes(root: unknown, out: any[]): void {
  if (!root || typeof root !== 'object') return;
  if (Array.isArray(root)) {
    root.forEach((n) => collectJsonLdNodes(n, out));
    return;
  }
  const node = root as any;
  out.push(node);
  if (Array.isArray(node['@graph'])) node['@graph'].forEach((n: unknown) => collectJsonLdNodes(n, out));
}

function isRecipeType(t: unknown): boolean {
  if (typeof t === 'string') return t.toLowerCase().includes('recipe');
  if (Array.isArray(t)) return t.some((x) => typeof x === 'string' && x.toLowerCase().includes('recipe'));
  return false;
}

function jsonLdInstructionsToStrings(instr: unknown): string[] {
  if (!instr) return [];
  if (typeof instr === 'string') {
    return instr.split(/\r?\n+/).map(clean).filter(Boolean);
  }
  if (Array.isArray(instr)) {
    return instr.flatMap((el) => {
      if (typeof el === 'string') return [clean(el)];
      const node = el as any;
      if (node?.itemListElement) return jsonLdInstructionsToStrings(node.itemListElement);
      if (node?.text) return [clean(node.text)];
      if (node?.name) return [clean(node.name)];
      return [];
    }).filter(Boolean);
  }
  return [];
}

function parseNutritionNumber(v: unknown): number | null {
  if (v == null) return null;
  const m = String(v).match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

// schema.org image can be a string, an array, or an ImageObject {url}.
function firstImageUrl(img: unknown): string | undefined {
  if (!img) return undefined;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return firstImageUrl(img[0]);
  if (typeof img === 'object') {
    const o = img as any;
    return firstImageUrl(o.url || o.contentUrl || o['@id']);
  }
  return undefined;
}

function extractJsonLd($: CheerioAPI): RawRecipe | null {
  const nodes: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text();
    if (!txt) return;
    try {
      collectJsonLdNodes(JSON.parse(txt), nodes);
    } catch {
      /* malformed JSON-LD block — ignore and try the next one */
    }
  });

  const recipe = nodes.find((n) => isRecipeType(n?.['@type']));
  if (!recipe) return null;

  const ingredientStrings: string[] = ([] as unknown[])
    .concat(recipe.recipeIngredient || recipe.ingredients || [])
    .map((x) => clean(String(x)));

  const nutrition = recipe.nutrition || {};
  return {
    title: clean(recipe.name || ''),
    category: Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory[0] : recipe.recipeCategory,
    yield: Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield,
    totalTimeIso: longestIso(recipe.totalTime, recipe.cookTime, recipe.prepTime),
    ingredientStrings,
    stepStrings: jsonLdInstructionsToStrings(recipe.recipeInstructions),
    kcal: parseNutritionNumber(nutrition.calories),
    protein: parseNutritionNumber(nutrition.proteinContent),
    image: firstImageUrl(recipe.image),
  };
}

// ---------------------------------------------------------------------------
// EXTRACTOR 2 — microdata  ([itemtype~=schema.org/Recipe] + [itemprop])
// ---------------------------------------------------------------------------
function microdataInstructions($: CheerioAPI, instrEls: Cheerio<AnyNode>): string[] {
  const out: string[] = [];
  instrEls.each((_, el) => {
    const node = $(el);
    const items = node.find('li');
    if (items.length > 0) {
      items.each((__, li) => { out.push(clean($(li).text())); });
    } else {
      const paras = node.find('p');
      if (paras.length > 0) {
        paras.each((__, p) => { out.push(clean($(p).text())); });
      } else {
        out.push(clean(node.text()));
      }
    }
  });
  // A single blob → split on line breaks so we still get multiple steps.
  if (out.length === 1) {
    return out[0].split(/\r?\n+/).map(clean).filter(Boolean);
  }
  return out.filter(Boolean);
}

function attrOrText($: CheerioAPI, el: AnyNode): string {
  const node = $(el);
  const content = node.attr('content');
  return clean(content || node.text());
}

function extractMicrodata($: CheerioAPI): RawRecipe | null {
  const scope = $('[itemtype*="schema.org/Recipe" i]').first();
  if (scope.length === 0) return null;

  // A property belongs to this recipe only if its nearest *ancestor* itemscope
  // is the recipe element itself — otherwise a nested publisher/author object's
  // own name/etc. would leak in (e.g. "Valdemarsro" instead of the dish title).
  const owns = (el: AnyNode) => {
    const owner = $(el).parent().closest('[itemscope]');
    return owner.length > 0 && owner[0] === scope[0];
  };
  const direct = (selector: string) => scope.find(selector).filter((_, el) => owns(el));

  const ingredientStrings: string[] = [];
  direct('[itemprop="recipeIngredient"], [itemprop="ingredients"]').each((_, el) => {
    ingredientStrings.push(clean($(el).text()));
  });

  const name = direct('[itemprop="name"]').first();
  const yieldEl = direct('[itemprop="recipeYield"]').first();
  const totalEl = direct('[itemprop="totalTime"]').first();
  const cookEl = direct('[itemprop="cookTime"]').first();
  const catEl = direct('[itemprop="recipeCategory"]').first();
  const imgEl = direct('[itemprop="image"]').first();

  if (ingredientStrings.length === 0) return null;

  return {
    title: name.length ? attrOrText($, name[0]) : clean(scope.find('h1').first().text()),
    category: catEl.length ? attrOrText($, catEl[0]) : undefined,
    yield: yieldEl.length ? attrOrText($, yieldEl[0]) : undefined,
    totalTimeIso: longestIso(
      totalEl.length ? totalEl.attr('content') || totalEl.text() : undefined,
      cookEl.length ? cookEl.attr('content') || cookEl.text() : undefined,
    ),
    ingredientStrings,
    stepStrings: microdataInstructions($, direct('[itemprop="recipeInstructions"]')),
    kcal: null,
    protein: null,
    image: imgEl.length ? (imgEl.attr('src') || imgEl.attr('content') || imgEl.attr('href') || undefined) : undefined,
  };
}

// ---------------------------------------------------------------------------
// FREE-TEXT PARSING — pasted text or OCR'd photo → Recipe. No schema, so we
// classify lines heuristically, then reuse normalise() for all the Danish
// quantity/category/timer processing.
// ---------------------------------------------------------------------------
// Danish imperative cooking verbs — a strong signal that a line is a step.
const STEP_VERB = /^(pisk|rør|tilsæt|steg|bland|lad|kom|hæld|skær|hak|bag|kog|server|vend|drys|pynt|krydr|smag|fordel|form|si|riv|mos|pensl|snit|skyl|dryp|brun|saut[eé]r|simr|anret|montér|del|læg|sæt|tag|varm|opvarm|forvarm|marin[eé]r|panér|tern|skær|skru|dæk|servér)\b/i;

function looksLikeStepText(line: string): boolean {
  if (/^\s*\d+\s*[.)]\s/.test(line)) return true; // "1. …" / "2) …" numbered step
  if (line.length > 55) return true; // long prose line
  if (/[.!?]$/.test(line) && line.split(/\s+/).length >= 3) return true; // sentence
  if (STEP_VERB.test(line)) return true; // starts with a cooking verb
  return false;
}

function looksLikeIngredientText(line: string): boolean {
  if (/^\s*\d+\s*[.)]\s/.test(line)) return false; // numbered → step, not ingredient
  const startsQty = /^\s*(\d+([.,]\d+)?|[½¼¾⅓⅔⅕⅖⅗⅘⅙⅛⅜])/.test(line);
  const unitEarly = /^\s*(?:\S+\s+)?(g|kg|hg|mg|dl|cl|ml|l|spsk|tsk|knsp|knivspids|fed|stk|dåse|dåser|pakke|bundt|kvist|blad|skive|håndfuld|glas|pose)\b/i.test(line);
  return (startsQty || unitEarly) && line.length < 80;
}

const isIngredientHeader = (l: string) => /^(ingredienser|det skal du bruge|du skal bruge|dette skal du bruge|indk[øo]bsliste)\b/i.test(l);
const isStepHeader = (l: string) => /^(fremgangsm[åa]de|s[åa]dan g[øo]r du|s[åa]dan laver du|tilberedning|instruktioner|g[øo]r s[åa]dan|metode|s[åa]dan gør du)\b/i.test(l);

export function parseRecipeText(text: string, id = `user-${Date.now()}`): Recipe {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) {
    throw new Error('For lidt tekst — indsæt hele opskriften med titel, ingredienser og fremgangsmåde.');
  }

  let title = lines[0];
  let body = lines.slice(1);
  if (isIngredientHeader(title) || isStepHeader(title)) {
    title = 'Importeret opskrift';
    body = lines;
  }

  const ingH = body.findIndex(isIngredientHeader);
  const stepH = body.findIndex(isStepHeader);

  let ingredientStrings: string[] = [];
  let stepStrings: string[] = [];

  if (ingH !== -1 && stepH !== -1) {
    // Both sections labelled — split cleanly.
    if (ingH < stepH) {
      ingredientStrings = body.slice(ingH + 1, stepH);
      stepStrings = body.slice(stepH + 1);
    } else {
      stepStrings = body.slice(stepH + 1, ingH);
      ingredientStrings = body.slice(ingH + 1);
    }
  } else {
    // No clear sections — classify each line by shape.
    for (const l of body) {
      if (isIngredientHeader(l) || isStepHeader(l)) continue;
      if (looksLikeStepText(l)) stepStrings.push(l);
      else if (looksLikeIngredientText(l)) ingredientStrings.push(l);
      else if (l.length <= 45) ingredientStrings.push(l);
      else stepStrings.push(l);
    }
  }

  stepStrings = stepStrings.map((s) => s.replace(/^\s*\d+\s*[.)]\s*/, '').trim()).filter(Boolean);
  ingredientStrings = ingredientStrings.map((s) => s.replace(/^[-•*•·]\s*/, '').trim()).filter(Boolean);

  const yieldMatch = String(text).match(/(\d+)\s*(?:personer|portioner|pers\b)/i);

  return normalise({
    title,
    ingredientStrings,
    stepStrings,
    yield: yieldMatch ? yieldMatch[1] : undefined,
    kcal: null,
    protein: null,
  }, id);
}

// ---------------------------------------------------------------------------
// PUBLIC ENTRY POINT
// ---------------------------------------------------------------------------
export function parseRecipe(html: string, sourceUrl?: string): Recipe {
  const $ = cheerio.load(html);
  const raw = extractJsonLd($) || extractMicrodata($);
  if (!raw || (raw.ingredientStrings.length === 0 && raw.stepStrings.length === 0)) {
    throw new Error('Kunne ikke finde en opskrift på siden. Prøv et direkte link til selve opskriften.');
  }
  if (!raw.image) {
    raw.image = $('meta[property="og:image"]').attr('content')
      || $('meta[name="og:image"]').attr('content')
      || $('meta[property="og:image:url"]').attr('content')
      || undefined;
  }
  return normalise(raw, `user-${Date.now()}`, sourceUrl);
}
