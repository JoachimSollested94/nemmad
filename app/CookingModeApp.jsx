'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, Play, Pause, RotateCcw,
  Check, Clock, Users, Flame, UtensilsCrossed, Minus, Plus,
  ChefHat, ShoppingBag, ShoppingCart, Link2, Trash2, AlertCircle, Leaf, FileText, ScanText,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// DESIGN TOKENS — fresh "grocery green" palette. Forest header, grass-green
// actions, mint backgrounds, white cards. All colors via inline styles.
// ---------------------------------------------------------------------------
const T = {
  bg: '#E9F4E3',           // light mint page
  bgAlt: '#D6EBCD',        // deeper mint — blobs / featured areas
  surface: '#FFFFFF',
  surfaceSoft: '#F1F8ED',  // very light mint — thumb tiles
  forest: '#2E5D3A',       // dark green header
  forestSoft: '#3C6E48',
  green: '#57A45B',        // primary grass green (buttons, accents)
  greenDark: '#3C8B45',    // stronger green — prices / accent text
  greenSoft: '#E2F0DC',    // soft green fill — active chips
  ink: '#20291F',          // near-black text
  body: '#4A564C',
  muted: '#8A9A87',        // muted grey-green
  faint: '#B4C1B0',
  hairline: '#E3EBDD',
  clay: '#C0492F',         // destructive red
  claySoft: '#F6E8E3',
  onForest: '#EAF4E5',     // text on the dark green header
  shadowCard: '0 1px 2px rgba(30,70,40,0.05), 0 10px 26px rgba(30,70,40,0.08)',
  shadowFloat: '0 4px 12px rgba(30,70,40,0.12), 0 18px 40px rgba(30,70,40,0.16)',
  shadowBtn: '0 8px 20px rgba(87,164,91,0.36)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

const font = {
  display: { fontFamily: "'Poppins', sans-serif" },
  num: { fontFamily: "'Poppins', sans-serif", fontVariantNumeric: 'tabular-nums' },
};

// ---------------------------------------------------------------------------
// DATA — built-in demo recipes (get an emoji tile since they have no photo).
// ---------------------------------------------------------------------------
const CATEGORY_ORDER = ['Frugt & grønt', 'Kød & fisk', 'Mejeri & køl', 'Tørvarer', 'Krydderi & andet'];

const BUILT_IN_RECIPES = [
  {
    id: 'scones',
    title: 'Proteinscones',
    kicker: 'Bagt · Protein',
    emoji: '🥯',
    baseServings: 8,
    servingUnit: 'scones',
    totalTimeLabel: '~30 min',
    macros: { kcal: 127, protein: 10 },
    ingredients: [
      { id: 'oat', name: 'Havregrynsmel', amount: 180, unit: 'g', category: 'Tørvarer' },
      { id: 'whey', name: 'Valleproteinpulver (isolat)', amount: 30, unit: 'g', category: 'Tørvarer' },
      { id: 'bp', name: 'Bagepulver', amount: 8, unit: 'g', category: 'Krydderi & andet' },
      { id: 'salt', name: 'Salt', amount: 0.5, unit: 'g', category: 'Krydderi & andet', pantryStaple: true },
      { id: 'skyr', name: 'Skyr 0%', amount: 150, unit: 'g', category: 'Mejeri & køl' },
      { id: 'egg', name: 'Æg, pisket', amount: 60, unit: 'g', category: 'Mejeri & køl' },
      { id: 'sweet', name: 'Sødemiddel (erythritol)', amount: 12, unit: 'g', category: 'Tørvarer' },
      { id: 'water', name: 'Vand (efter behov)', amount: 30, unit: 'g', category: 'Tørvarer', shoppable: false },
    ],
    steps: [
      { title: 'Bland det tørre', body: 'Forvarm ovnen til 200°C (180°C varmluft). Bland havregrynsmel, valleprotein, bagepulver og salt godt i en skål.', ingredientIds: ['oat', 'whey', 'bp', 'salt'], timerSeconds: null },
      { title: 'Rør det våde sammen', body: 'Pisk skyr, æg og sødemiddel sammen i en anden skål, til det er jævnt.', ingredientIds: ['skyr', 'egg', 'sweet'], timerSeconds: null },
      { title: 'Saml dejen', body: 'Rør det våde i det tørre til en sammenhængende dej. Tilsæt vand lidt ad gangen, hvis dejen er for tør.', ingredientIds: ['water'], timerSeconds: null },
      { title: 'Form og skær', body: 'Form dejen til en flad skive (ca. 3 cm tyk) på bagepapir. Skær i 8 trekanter uden at skille dem helt ad.', ingredientIds: [], timerSeconds: null },
      { title: 'Bag scones', body: 'Bag på ovnens midterste rille til de er gyldne og gennembagte.', ingredientIds: [], timerSeconds: 960 },
      { title: 'Lad dem sætte sig', body: 'Lad scones hvile et par minutter på en bagerist inden servering.', ingredientIds: [], timerSeconds: 300 },
    ],
  },
  {
    id: 'curry',
    title: 'Kylling i karry med ris',
    kicker: 'Gryde · Aftensmad',
    emoji: '🍲',
    baseServings: 4,
    servingUnit: 'personer',
    totalTimeLabel: '~35 min',
    macros: null,
    ingredients: [
      { id: 'chicken', name: 'Kyllingebryst, i tern', amount: 500, unit: 'g', category: 'Kød & fisk' },
      { id: 'onion', name: 'Løg, hakket', amount: 1, unit: 'stk', category: 'Frugt & grønt' },
      { id: 'garlic', name: 'Hvidløgsfed, hakket', amount: 2, unit: 'stk', category: 'Frugt & grønt' },
      { id: 'curry', name: 'Karry', amount: 2, unit: 'spsk', category: 'Krydderi & andet' },
      { id: 'coconut', name: 'Kokosmælk', amount: 400, unit: 'ml', category: 'Tørvarer' },
      { id: 'oil', name: 'Olie', amount: 2, unit: 'spsk', category: 'Krydderi & andet', pantryStaple: true },
      { id: 'rice', name: 'Jasminris', amount: 200, unit: 'g', category: 'Tørvarer' },
      { id: 'saltc', name: 'Salt', amount: 1, unit: 'knivspids', category: 'Krydderi & andet', pantryStaple: true },
    ],
    steps: [
      { title: 'Forbered', body: 'Skær kylling i tern. Hak løg og hvidløg.', ingredientIds: ['chicken', 'onion', 'garlic'], timerSeconds: null },
      { title: 'Kog ris', body: 'Sæt ris over efter posens anvisning. Den kan koge færdig, mens du laver resten.', ingredientIds: ['rice'], timerSeconds: 720 },
      { title: 'Steg kyllingen', body: 'Steg kyllingetern i olie ved høj varme til gyldne på alle sider.', ingredientIds: ['chicken', 'oil'], timerSeconds: 360 },
      { title: 'Tilsæt smag', body: 'Tilsæt løg, hvidløg og karry. Steg med et par minutter.', ingredientIds: ['onion', 'garlic', 'curry'], timerSeconds: 120 },
      { title: 'Lad simre', body: 'Hæld kokosmælk i og lad det simre, til saucen samler sig.', ingredientIds: ['coconut'], timerSeconds: 720 },
      { title: 'Server', body: 'Smag til med salt og server over risen.', ingredientIds: ['saltc'], timerSeconds: null },
    ],
  },
];

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Renders an amount, or '' when the ingredient is unquantified ("salt og peber").
function formatAmount(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
}

function scaledAmount(ingredient, baseServings, servings) {
  if (ingredient.amount === null || ingredient.amount === undefined || !baseServings) return null;
  return (ingredient.amount / baseServings) * servings;
}

// Merge ingredients from every selected recipe into one shopping list.
function buildShoppingList(recipes) {
  const groups = new Map();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      if (ing.shoppable === false) continue;
      const key = ing.pantryStaple ? `staple:${ing.name.toLowerCase()}` : `${ing.name.toLowerCase()}|${ing.unit || ''}`;
      const existing = groups.get(key);
      const amount = ing.amount === undefined ? null : ing.amount;
      if (existing) {
        if (existing.amount === null || amount === null) existing.amount = null;
        else existing.amount += amount;
        existing.recipeTitles.add(recipe.title);
      } else {
        groups.set(key, {
          key,
          name: ing.name,
          unit: ing.unit,
          category: ing.category,
          amount,
          pantryStaple: !!ing.pantryStaple,
          recipeTitles: new Set([recipe.title]),
        });
      }
    }
  }
  return Array.from(groups.values());
}

// ---------------------------------------------------------------------------
// LINK IMPORT — POST the URL to our backend, which parses schema.org data.
// ---------------------------------------------------------------------------
async function importRecipeFromUrl(url) {
  let res;
  try {
    res = await fetch('/api/import-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new Error('Kunne ikke nå serveren. Tjek din forbindelse og prøv igen.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || 'Kunne ikke læse opskriften fra linket.');
  if (!data.recipe) throw new Error('Uventet svar fra serveren.');
  return data.recipe;
}

// Free-text import — pasted text or text read from a screenshot via OCR.
async function importRecipeFromText(text) {
  let res;
  try {
    res = await fetch('/api/import-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new Error('Kunne ikke nå serveren. Tjek din forbindelse og prøv igen.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || 'Kunne ikke læse opskriften fra teksten.');
  if (!data.recipe) throw new Error('Uventet svar fra serveren.');
  return data.recipe;
}

// Downscale an image file to a JPEG data URL — keeps OCR fast and reliable.
async function downscaleImage(file, maxDim = 2000) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Kunne ikke læse filen'));
    r.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Billedformatet understøttes ikke'));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.92);
}

// Read text from a screenshot with Tesseract.js (Danish). Loaded on demand so
// the ~2 MB engine never bloats the initial page load. Free, runs in-browser.
async function ocrImageToText(file, onProgress) {
  const dataUrl = await downscaleImage(file);
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(dataUrl, 'dan', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });
  return (data?.text || '').trim();
}

// ---------------------------------------------------------------------------
// PERSISTENCE — localStorage.
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'nemmad-user-recipes';

async function loadUserRecipes() {
  if (typeof window === 'undefined') return { recipes: [], persisted: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return { recipes: Array.isArray(parsed) ? parsed : [], persisted: true };
  } catch {
    return { recipes: [], persisted: false };
  }
}

async function saveUserRecipes(recipes) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// SMALL SHARED PIECES
// ---------------------------------------------------------------------------
function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg" style={{ ...font.display, fontWeight: 600, color: T.ink }}>{children}</h2>
      {action}
    </div>
  );
}

function CheckCircle({ checked }) {
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
      style={{
        border: `2px solid ${checked ? T.green : T.faint}`,
        background: checked ? T.green : 'transparent',
        transition: `all 200ms ${T.spring}`,
      }}
    >
      {checked && <Check size={13} color="#FFFFFF" strokeWidth={3.5} />}
    </span>
  );
}

function MetaRow({ recipe, color = T.muted }) {
  return (
    <div className="flex items-center gap-3 text-sm flex-wrap" style={{ color }}>
      <span className="flex items-center gap-1"><Clock size={14} /> {recipe.totalTimeLabel}</span>
      <span className="flex items-center gap-1"><Users size={14} /> {recipe.baseServings} {recipe.servingUnit}</span>
      {recipe.macros && <span className="flex items-center gap-1"><Flame size={14} /> {recipe.macros.kcal} kcal</span>}
    </div>
  );
}

// Recipe photo (from the imported link) or an emoji tile fallback.
function RecipeThumb({ recipe, radius = 18, emojiSize = 52 }) {
  const [failed, setFailed] = useState(false);
  const showImg = recipe.image && !failed;
  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-hidden"
      style={{ background: T.surfaceSoft, borderRadius: radius }}
    >
      {showImg ? (
        <img
          src={recipe.image}
          alt={recipe.title}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span style={{ fontSize: emojiSize, lineHeight: 1 }}>{recipe.emoji || '🍽️'}</span>
      )}
    </div>
  );
}

function CartButton({ active, onClick, size = 34 }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={active ? 'Fjern fra indkøbskurv' : 'Læg i indkøbskurv'}
      className="rounded-full flex items-center justify-center focus-green"
      style={{
        width: size,
        height: size,
        background: active ? T.green : T.surface,
        boxShadow: active ? T.shadowBtn : '0 2px 6px rgba(30,70,40,0.14)',
        transition: `all 200ms ${T.spring}`,
      }}
    >
      <ShoppingCart size={size * 0.5} strokeWidth={2.2} color={active ? '#FFFFFF' : T.muted} />
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 py-4 rounded-full focus-green"
      style={{ ...font.display, fontWeight: 600, background: T.green, color: '#FFFFFF', boxShadow: T.shadowBtn, opacity: disabled ? 0.55 : 1, transition: `transform 200ms ${T.spring}`, ...style }}
    >
      {children}
    </button>
  );
}

function OutlineButton({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-4 rounded-full focus-green"
      style={{ ...font.display, fontWeight: 600, background: 'transparent', color: T.green, border: `2px solid ${T.green}`, ...style }}
    >
      {children}
    </button>
  );
}

function Stepper({ value, onDec, onInc, min = 1 }) {
  const btn = {
    width: 40, height: 40, borderRadius: 999,
    border: `2px solid ${T.green}`, color: T.green, background: T.surface,
  };
  return (
    <div className="flex items-center gap-4">
      <button onClick={onDec} disabled={value <= min} aria-label="Færre" className="flex items-center justify-center focus-green" style={{ ...btn, opacity: value <= min ? 0.4 : 1 }}>
        <Minus size={16} strokeWidth={2.5} />
      </button>
      <span className="w-6 text-center text-lg" style={{ ...font.num, fontWeight: 600, color: T.ink }}>{value}</span>
      <button onClick={onInc} aria-label="Flere" className="flex items-center justify-center focus-green" style={btn}>
        <Plus size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function IngredientCard({ recipe, servings }) {
  const s = servings || recipe.baseServings;
  return (
    <div className="rounded-3xl p-5 mb-5" style={{ background: T.surface, boxShadow: T.shadowCard }}>
      <h2 className="text-lg mb-2" style={{ ...font.display, fontWeight: 600, color: T.ink }}>Ingredienser</h2>
      <ul>
        {recipe.ingredients.map((ing, i) => {
          const amt = formatAmount(scaledAmount(ing, recipe.baseServings, s));
          return (
            <li key={ing.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: i < recipe.ingredients.length - 1 ? `1px solid ${T.hairline}` : 'none', color: T.body }}>
              <span>{ing.name}</span>
              <span className="text-sm shrink-0 ml-3" style={{ ...font.num, fontWeight: 600, color: T.greenDark }}>{amt}{ing.unit}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StepsCard({ recipe }) {
  return (
    <div className="rounded-3xl p-5 mb-6" style={{ background: T.surface, boxShadow: T.shadowCard }}>
      <h2 className="text-lg mb-3" style={{ ...font.display, fontWeight: 600, color: T.ink }}>Fremgangsmåde</h2>
      <ol className="space-y-4">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-3.5">
            <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ ...font.num, fontWeight: 600, background: T.greenSoft, color: T.greenDark }}>{i + 1}</span>
            <div className="pt-0.5">
              <p style={{ ...font.display, color: T.ink, fontWeight: 600 }}>{step.title}</p>
              <p className="text-sm mt-0.5 leading-relaxed" style={{ color: T.muted }}>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Curved forest-green header used across the main screens.
function GreenHeader({ onBack, right, subtitle }) {
  return (
    <header
      className="shrink-0 px-5 relative"
      style={{
        background: T.forest,
        color: T.onForest,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
        paddingTop: 'calc(0.9rem + env(safe-area-inset-top))',
        paddingBottom: '1rem',
        boxShadow: '0 6px 20px rgba(30,70,40,0.18)',
      }}
    >
      <div className="flex items-center justify-between" style={{ minHeight: 34 }}>
        <div className="w-9">
          {onBack && (
            <button onClick={onBack} aria-label="Tilbage" className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center focus-green" style={{ color: T.onForest }}>
              <ChevronLeft size={24} />
            </button>
          )}
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <Leaf size={16} style={{ color: '#A7D89C' }} />
            <span className="text-lg" style={{ ...font.display, fontWeight: 700, letterSpacing: '-0.01em' }}>NemMad</span>
          </div>
          {subtitle && <span className="text-xs" style={{ color: '#B9D6AE' }}>{subtitle}</span>}
        </div>
        <div className="w-9 flex justify-end">{right}</div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// TIMER RING
// ---------------------------------------------------------------------------
function TimerRing({ total, remaining, size = 188 }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, remaining / total) : 0;
  const offset = circumference * (1 - progress);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={T.bgAlt} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={T.green} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl" style={{ ...font.num, color: T.ink, fontWeight: 600 }}>{formatTime(remaining)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COOKING MODE
// ---------------------------------------------------------------------------
function CookingMode({ recipe, onExit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [servings, setServings] = useState(recipe.baseServings);
  const [showIngredients, setShowIngredients] = useState(false);
  const [checked, setChecked] = useState(() => new Set());
  const [remaining, setRemaining] = useState(recipe.steps[0].timerSeconds || 0);
  const [running, setRunning] = useState(false);
  const touchStartX = useRef(null);

  const step = recipe.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === recipe.steps.length - 1;

  useEffect(() => {
    setRemaining(recipe.steps[stepIndex].timerSeconds || 0);
    setRunning(false);
  }, [stepIndex, recipe]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { setRunning(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    let sentinel = null;
    if (running && typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((s) => { sentinel = s; }).catch(() => {});
    }
    return () => { if (sentinel) sentinel.release?.(); };
  }, [running]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, recipe.steps.length - 1));
  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 60 && !isFirst) goPrev();
    if (delta < -60 && !isLast) goNext();
    touchStartX.current = null;
  };

  const toggleCheck = (id) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: T.bg, color: T.ink }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="flex items-center justify-between px-5" style={{ background: T.forest, color: T.onForest, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, paddingTop: 'calc(0.9rem + env(safe-area-inset-top))', paddingBottom: '1rem' }}>
        <button onClick={onExit} aria-label="Luk cooking mode" className="p-2 -ml-2 rounded-full focus-green" style={{ color: T.onForest }}>
          <X size={22} />
        </button>
        <div className="flex items-center gap-1.5">
          {recipe.steps.map((_, i) => (
            <span key={i} className="rounded-full" style={{ height: 5, width: i === stepIndex ? 26 : 5, background: i === stepIndex ? '#A7D89C' : i < stepIndex ? '#7FC078' : 'rgba(255,255,255,0.28)', transition: `all 400ms ${T.spring}` }} />
          ))}
        </div>
        <button onClick={() => setShowIngredients(true)} aria-label="Vis ingredienser" className="p-2 -mr-2 rounded-full focus-green" style={{ color: T.onForest }}>
          <UtensilsCrossed size={20} />
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 py-7 gap-5">
        <div>
          <p className="text-sm mb-1" style={{ ...font.display, fontWeight: 600, color: T.green }}>Trin {stepIndex + 1} af {recipe.steps.length}</p>
          <h2 className="text-3xl leading-tight" style={{ ...font.display, fontWeight: 700, letterSpacing: '-0.01em', color: T.ink }}>{step.title}</h2>
        </div>

        <p className="text-xl leading-relaxed" style={{ color: T.body }}>{step.body}</p>

        {(() => {
          if (step.ingredientIds.length === 0) return null;
          const seen = new Set();
          const stepIngs = [];
          for (const id of step.ingredientIds) {
            const ing = recipe.ingredients.find((x) => x.id === id);
            if (!ing) continue;
            const amt = formatAmount(scaledAmount(ing, recipe.baseServings, servings));
            const key = `${ing.name.toLowerCase()}|${amt}|${ing.unit}`;
            if (seen.has(key)) continue; // collapse duplicate links (e.g. olie twice)
            seen.add(key);
            stepIngs.push({ id, name: ing.name, amt, unit: ing.unit });
          }
          if (stepIngs.length === 0) return null;
          return (
            <div className="rounded-2xl px-4 py-3" style={{ background: T.surface, boxShadow: '0 1px 3px rgba(30,70,40,0.08)' }}>
              <p className="text-xs uppercase mb-1.5" style={{ ...font.display, fontWeight: 600, letterSpacing: '0.08em', color: T.green }}>Til dette trin</p>
              <ul>
                {stepIngs.map((it, i) => (
                  <li key={it.id} className="flex items-center justify-between py-2" style={{ borderBottom: i < stepIngs.length - 1 ? `1px solid ${T.hairline}` : 'none' }}>
                    <span style={{ color: T.ink }}>{it.name}</span>
                    {it.amt && <span className="text-sm shrink-0 ml-4" style={{ ...font.num, fontWeight: 600, color: T.greenDark }}>{it.amt}{it.unit}</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {step.timerSeconds ? (
          <div className="flex flex-col items-center gap-5 mt-auto py-3">
            <TimerRing total={step.timerSeconds} remaining={remaining} />
            <div className="flex items-center gap-3">
              {remaining > 0 ? (
                <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-2 px-7 py-3.5 rounded-full focus-green" style={{ ...font.display, fontWeight: 600, background: T.green, color: '#FFF', boxShadow: T.shadowBtn }}>
                  {running ? <Pause size={18} /> : <Play size={18} />}
                  {running ? 'Pause' : remaining === step.timerSeconds ? 'Start timer' : 'Fortsæt'}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-7 py-3.5 rounded-full" style={{ ...font.display, fontWeight: 600, background: T.greenSoft, color: T.greenDark }}>
                  <Check size={18} /> Timer færdig
                </div>
              )}
              <button onClick={() => { setRemaining(step.timerSeconds); setRunning(false); }} aria-label="Nulstil timer" className="p-3.5 rounded-full focus-green" style={{ background: T.surface, color: T.muted, boxShadow: '0 1px 3px rgba(30,70,40,0.08)' }}>
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="flex items-center gap-3 px-5 py-4" style={{ background: T.surface, borderTop: `1px solid ${T.hairline}`, paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <button onClick={goPrev} disabled={isFirst} className="flex-1 flex items-center justify-center gap-1 py-3.5 rounded-full focus-green" style={{ ...font.display, fontWeight: 600, background: T.bg, color: T.body, opacity: isFirst ? 0.4 : 1 }}>
          <ChevronLeft size={20} /> Forrige
        </button>
        {isLast ? (
          <PrimaryButton onClick={onExit} style={{ flex: 1 }}><Check size={20} /> Færdig</PrimaryButton>
        ) : (
          <PrimaryButton onClick={goNext} style={{ flex: 1 }}>Næste <ChevronRight size={20} /></PrimaryButton>
        )}
      </footer>

      {showIngredients && (
        <div className="absolute inset-0 z-20">
          <div className="absolute inset-0" style={{ background: 'rgba(20,40,25,0.4)' }} onClick={() => setShowIngredients(false)} />
          <div className="absolute bottom-0 inset-x-0 rounded-t-3xl max-h-96 overflow-y-auto" style={{ background: T.surface }}>
            <div className="sticky top-0 px-5 pt-5 pb-3 flex items-center justify-between" style={{ background: T.surface, borderBottom: `1px solid ${T.hairline}` }}>
              <h3 className="text-xl" style={{ ...font.display, fontWeight: 600 }}>Ingredienser</h3>
              <button onClick={() => setShowIngredients(false)} aria-label="Luk" className="p-1 rounded-full focus-green" style={{ color: T.muted }}>
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm" style={{ color: T.muted }}>Portioner</span>
              <Stepper value={servings} onDec={() => setServings((s) => Math.max(1, s - 1))} onInc={() => setServings((s) => s + 1)} />
            </div>
            <ul className="px-5 pb-8">
              {recipe.ingredients.map((ing) => {
                const amt = formatAmount(scaledAmount(ing, recipe.baseServings, servings));
                return (
                  <li key={ing.id} onClick={() => toggleCheck(ing.id)} className="flex items-center gap-3 py-3 cursor-pointer" style={{ borderBottom: `1px solid ${T.hairline}` }}>
                    <CheckCircle checked={checked.has(ing.id)} />
                    <span className="flex-1" style={{ color: checked.has(ing.id) ? T.faint : T.ink, textDecoration: checked.has(ing.id) ? 'line-through' : 'none' }}>{ing.name}</span>
                    <span className="text-sm" style={{ ...font.num, color: T.muted }}>{amt}{ing.unit}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ADD RECIPE — three ways in: link, pasted text, or a screenshot (free OCR).
// Text and screenshot both end up as plain text sent to the same parser.
// ---------------------------------------------------------------------------
const ADD_MODES = [
  { id: 'link', label: 'Link', icon: Link2 },
  { id: 'text', label: 'Tekst', icon: FileText },
  { id: 'photo', label: 'Screenshot', icon: ScanText },
];

function AddRecipe({ onSaved, onCancel, persistAvailable }) {
  const [mode, setMode] = useState('link'); // link | text | photo
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('input'); // input | loading | review
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveWarning, setSaveWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(null); // null | 0..100

  const runImport = async (fn) => {
    setPhase('loading');
    setErrorMsg('');
    try {
      const recipe = await fn();
      setExtracted(recipe);
      setPhase('review');
    } catch (err) {
      setErrorMsg(err.message || 'Kunne ikke læse opskriften.');
      setPhase('input');
    }
  };

  const analyzeLink = () => { if (url.trim()) runImport(() => importRecipeFromUrl(url.trim())); };
  const analyzeText = () => { if (text.trim().length >= 10) runImport(() => importRecipeFromText(text.trim())); };

  const handleScreenshot = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg('');
    setOcrProgress(0);
    try {
      const t = await ocrImageToText(file, (p) => setOcrProgress(p));
      setOcrProgress(null);
      if (!t || t.length < 10) {
        setErrorMsg('Kunne ikke læse tekst fra billedet. Prøv et skarpere screenshot af selve opskriften.');
        return;
      }
      setText(t);
      setMode('text'); // let the user review/fix the recognised text before parsing
    } catch (err) {
      setOcrProgress(null);
      setErrorMsg('Kunne ikke læse billedet. Prøv et andet screenshot.');
    }
  };

  const save = async () => {
    if (!extracted || saving) return;
    setSaving(true);
    const ok = await onSaved(extracted);
    if (!ok && persistAvailable) setSaveWarning(true);
    setSaving(false);
  };

  const fileInputStyle = { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' };
  const inputBox = { background: T.surface, border: `1.5px solid ${T.hairline}`, color: T.ink };

  return (
    <div className="px-5 py-6">
      <h1 className="text-3xl mb-2" style={{ ...font.display, fontWeight: 700, color: T.ink, letterSpacing: '-0.015em' }}>Ny opskrift</h1>
      <p className="mb-5" style={{ color: T.muted }}>Tilføj fra et link, indsæt teksten, eller læs den fra et screenshot.</p>

      {phase === 'input' && (
        <>
          <div className="flex gap-1 p-1 rounded-full mb-6" style={{ background: T.greenSoft }}>
            {ADD_MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); setErrorMsg(''); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm focus-green whitespace-nowrap"
                  style={{ ...font.display, fontWeight: 600, background: active ? T.surface : 'transparent', color: active ? T.greenDark : T.muted, boxShadow: active ? '0 1px 3px rgba(30,70,40,0.12)' : 'none', transition: `all 200ms ${T.spring}` }}
                >
                  <Icon size={15} /> {m.label}
                </button>
              );
            })}
          </div>

          {mode === 'link' && (
            <>
              <input
                type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                value={url} onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') analyzeLink(); }}
                placeholder="https://www.valdemarsro.dk/..."
                className="w-full rounded-2xl px-4 py-3.5 focus-green" style={inputBox}
              />
              <PrimaryButton onClick={analyzeLink} disabled={!url.trim()} style={{ width: '100%', marginTop: 16 }}>
                <Link2 size={18} /> Hent opskriften
              </PrimaryButton>
              <p className="text-xs mt-4" style={{ color: T.faint }}>Virker bedst med et direkte link til selve opskriften.</p>
            </>
          )}

          {mode === 'text' && (
            <>
              <textarea
                value={text} onChange={(e) => setText(e.target.value)} rows={9}
                placeholder={'Titel på opskriften\n\nIngredienser\n2 dl mel\n1 æg\n200 g smør\n\nFremgangsmåde\nBland det tørre…\nRør det våde i…'}
                className="w-full rounded-2xl px-4 py-3 focus-green" style={{ ...inputBox, resize: 'vertical', minHeight: 210, lineHeight: 1.5 }}
              />
              <PrimaryButton onClick={analyzeText} disabled={text.trim().length < 10} style={{ width: '100%', marginTop: 16 }}>
                <FileText size={18} /> Læs opskriften
              </PrimaryButton>
              <p className="text-xs mt-4" style={{ color: T.faint }}>Skriv titlen øverst. Overskrifterne "Ingredienser" og "Fremgangsmåde" gør læsningen mest præcis.</p>
            </>
          )}

          {mode === 'photo' && (
            ocrProgress === null ? (
              <>
                <label className="relative w-full rounded-3xl py-10 flex flex-col items-center gap-2.5 cursor-pointer focus-green" style={{ background: T.surface, border: `2px dashed ${T.faint}` }}>
                  <input type="file" accept="image/*" onChange={handleScreenshot} style={fileInputStyle} tabIndex={-1} />
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: T.greenSoft }}>
                    <ScanText size={26} style={{ color: T.green }} />
                  </div>
                  <span style={{ ...font.display, fontWeight: 600, color: T.ink }}>Vælg et screenshot</span>
                  <span className="text-sm text-center px-6" style={{ color: T.muted }}>Fra din billedrulle — fx en opskrift fra en hjemmeside, en besked eller Instagram</span>
                </label>
                <p className="text-xs mt-4" style={{ color: T.faint }}>Læses gratis på din enhed. Virker bedst med skarpe screenshots af trykt tekst.</p>
              </>
            ) : (
              <div className="rounded-3xl p-6" style={{ background: T.surface, boxShadow: T.shadowCard }}>
                <div className="flex items-center gap-2 mb-3" style={{ ...font.display, fontWeight: 600, color: T.green }}>
                  <ScanText size={18} /> {ocrProgress > 0 ? `Læser teksten… ${ocrProgress}%` : 'Forbereder tekstgenkendelse…'}
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 8, background: T.bgAlt }}>
                  {ocrProgress > 0 ? (
                    <div style={{ height: '100%', width: `${ocrProgress}%`, background: T.green, transition: 'width 200ms ease' }} />
                  ) : (
                    <div className="skeleton-pulse" style={{ height: '100%', width: '40%', background: T.green }} />
                  )}
                </div>
                <p className="text-xs mt-4" style={{ color: T.faint }}>Første gang hentes OCR-motoren — det kan tage et øjeblik.</p>
              </div>
            )
          )}

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl p-4 mt-4" style={{ background: T.claySoft, color: T.clay }}>
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}
        </>
      )}

      {phase === 'loading' && (
        <div className="rounded-3xl p-5" style={{ background: T.surface, boxShadow: T.shadowCard }}>
          <p className="mb-5 text-sm" style={{ ...font.display, fontWeight: 600, color: T.green }}>Læser opskriften…</p>
          {[64, 40, 88, 56, 72, 48].map((w, i) => (
            <div key={i} className="rounded-full mb-3 skeleton-pulse" style={{ height: 12, width: `${w}%`, background: T.bgAlt, animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      )}

      {phase === 'review' && extracted && (
        <>
          <div className="flex items-start gap-2.5 rounded-2xl p-4 mb-6" style={{ background: T.greenSoft, color: T.greenDark }}>
            <Check size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm">Sådan tolkede vi opskriften — tjek at det ser rigtigt ud, før du gemmer.</p>
          </div>

          {extracted.image && (
            <div className="w-full h-44 rounded-3xl overflow-hidden mb-4" style={{ boxShadow: T.shadowCard }}>
              <RecipeThumb recipe={extracted} radius={24} />
            </div>
          )}
          <p className="text-sm mb-1" style={{ ...font.display, fontWeight: 600, color: T.green }}>{extracted.kicker}</p>
          <h2 className="text-2xl mb-3" style={{ ...font.display, fontWeight: 700, color: T.ink }}>{extracted.title}</h2>
          <div className="mb-6"><MetaRow recipe={extracted} /></div>

          <IngredientCard recipe={extracted} />
          <StepsCard recipe={extracted} />

          {saveWarning && (
            <div className="flex items-start gap-2.5 rounded-2xl p-4 mb-4" style={{ background: T.claySoft, color: T.clay }}>
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">Kunne ikke gemme permanent — opskriften findes kun i denne session.</p>
            </div>
          )}

          <div className="flex gap-3 pb-6">
            <PrimaryButton onClick={save} disabled={saving} style={{ flex: 1 }}>
              <Check size={18} /> {saving ? 'Gemmer…' : 'Gem opskrift'}
            </PrimaryButton>
            <button onClick={() => { setExtracted(null); setPhase('input'); }} className="px-5 rounded-full focus-green" style={{ ...font.display, fontWeight: 600, background: T.surface, color: T.body, border: `1.5px solid ${T.hairline}` }}>
              Forkast
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RECIPE CARD (compact, for horizontal rows)
// ---------------------------------------------------------------------------
function RecipeCard({ recipe, isSelected, onOpen, onToggleShopping }) {
  return (
    <div
      onClick={() => onOpen(recipe.id)}
      className="shrink-0 rounded-3xl overflow-hidden cursor-pointer focus-green"
      style={{ width: 176, background: T.surface, boxShadow: T.shadowCard, transition: `transform 200ms ${T.spring}` }}
    >
      <div className="relative" style={{ height: 128, padding: 8 }}>
        <div className="w-full h-full"><RecipeThumb recipe={recipe} radius={16} /></div>
        <div className="absolute top-2.5 right-2.5">
          <CartButton active={isSelected} onClick={() => onToggleShopping(recipe.id)} />
        </div>
      </div>
      <div className="px-3.5 pb-3.5 pt-1">
        <h3 className="text-base leading-tight mb-1 line-clamp-2" style={{ ...font.display, fontWeight: 600, color: T.ink, minHeight: 40 }}>{recipe.title}</h3>
        <div className="flex items-center gap-1 text-sm" style={{ ...font.display, fontWeight: 600, color: T.greenDark }}>
          <Clock size={13} /> {recipe.totalTimeLabel}
        </div>
      </div>
    </div>
  );
}

// Wide card variant for the empty/first-run and single-column contexts.
function RecipeRow({ recipe, isSelected, onOpen, onToggleShopping }) {
  return (
    <div onClick={() => onOpen(recipe.id)} className="flex gap-3.5 rounded-3xl p-3 cursor-pointer focus-green" style={{ background: T.surface, boxShadow: T.shadowCard }}>
      <div style={{ width: 88, height: 88 }} className="shrink-0"><RecipeThumb recipe={recipe} radius={16} emojiSize={38} /></div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-xs mb-0.5" style={{ ...font.display, fontWeight: 600, color: T.green }}>{recipe.kicker}</p>
        <h3 className="text-lg leading-tight line-clamp-1" style={{ ...font.display, fontWeight: 600, color: T.ink }}>{recipe.title}</h3>
        <div className="mt-1"><MetaRow recipe={recipe} /></div>
      </div>
      <div className="self-center pr-1"><CartButton active={isSelected} onClick={() => onToggleShopping(recipe.id)} /></div>
    </div>
  );
}

function RecipeList({ userRecipes, selectedIds, onOpen, onToggleShopping, onAdd }) {
  return (
    <div className="py-6">
      <div className="px-5 mb-5">
        <h1 className="text-2xl" style={{ ...font.display, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>Hvad skal vi lave?</h1>
        <p style={{ color: T.muted }}>Vælg en opskrift eller tilføj din egen fra et link.</p>
      </div>

      {userRecipes.length > 0 ? (
        <div className="mb-7">
          <div className="px-5"><SectionTitle>Mine opskrifter</SectionTitle></div>
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 no-scrollbar">
            {userRecipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} isSelected={selectedIds.has(r.id)} onOpen={onOpen} onToggleShopping={onToggleShopping} />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 mb-7">
          <button onClick={onAdd} className="w-full rounded-3xl py-9 flex flex-col items-center gap-2 focus-green" style={{ border: `2px dashed ${T.faint}`, background: T.surface }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: T.greenSoft }}>
              <Link2 size={22} style={{ color: T.green }} />
            </div>
            <span className="text-sm" style={{ ...font.display, fontWeight: 600, color: T.body }}>Tilføj din første opskrift fra et link</span>
          </button>
        </div>
      )}

      <div className="px-5"><SectionTitle>Inspiration</SectionTitle></div>
      <div className="flex flex-col gap-3.5 px-5">
        {BUILT_IN_RECIPES.map((r) => (
          <RecipeRow key={r.id} recipe={r} isSelected={selectedIds.has(r.id)} onOpen={onOpen} onToggleShopping={onToggleShopping} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RECIPE DETAIL
// ---------------------------------------------------------------------------
function RecipeDetail({ recipe, isSelected, onToggleShopping, onStartCooking, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [servings, setServings] = useState(recipe.baseServings);

  return (
    <div className="px-5 py-6">
      <div className="relative rounded-3xl p-5 mb-5" style={{ background: T.bgAlt }}>
        <div className="absolute top-4 right-4 z-10"><CartButton active={isSelected} onClick={onToggleShopping} size={40} /></div>
        <div className="mx-auto" style={{ width: '72%', maxWidth: 240, aspectRatio: '1 / 1' }}>
          <RecipeThumb recipe={recipe} radius={28} emojiSize={92} />
        </div>
      </div>

      <p className="text-sm mb-1" style={{ ...font.display, fontWeight: 600, color: T.green }}>{recipe.kicker}</p>
      <h1 className="text-3xl mb-3" style={{ ...font.display, fontWeight: 700, color: T.ink, letterSpacing: '-0.015em' }}>{recipe.title}</h1>
      <div className="mb-5"><MetaRow recipe={recipe} /></div>

      <div className="flex items-center justify-between rounded-3xl px-5 py-4 mb-6" style={{ background: T.surface, boxShadow: T.shadowCard }}>
        <span className="text-sm" style={{ ...font.display, fontWeight: 600, color: T.body }}>Portioner</span>
        <Stepper value={servings} onDec={() => setServings((s) => Math.max(1, s - 1))} onInc={() => setServings((s) => s + 1)} />
      </div>

      <IngredientCard recipe={recipe} servings={servings} />
      <StepsCard recipe={recipe} />

      <div className="flex gap-3 pb-2">
        <PrimaryButton onClick={onStartCooking} style={{ flex: 1 }}><Play size={18} /> Start cooking mode</PrimaryButton>
        <OutlineButton onClick={onToggleShopping} style={{ paddingLeft: 18, paddingRight: 18 }}>
          {isSelected ? <Check size={20} /> : <ShoppingCart size={20} />}
        </OutlineButton>
      </div>

      {recipe.sourceUrl && (
        <p className="text-xs mt-4 text-center truncate" style={{ color: T.faint }}>Kilde: {recipe.sourceUrl}</p>
      )}

      {recipe.isUserRecipe && (
        <div className="pb-4 pt-3 flex justify-center">
          <button onClick={() => (confirmDelete ? onDelete(recipe.id) : setConfirmDelete(true))} className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full focus-green" style={{ ...font.display, fontWeight: 600, color: T.clay, background: confirmDelete ? T.claySoft : 'transparent' }}>
            <Trash2 size={15} /> {confirmDelete ? 'Tryk igen for at slette' : 'Slet opskrift'}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHOPPING LIST
// ---------------------------------------------------------------------------
function ShoppingRow({ item, checked, onToggle, hideAmount, isLast }) {
  const amt = formatAmount(item.amount);
  return (
    <li onClick={onToggle} className="flex items-center gap-3 py-3 cursor-pointer" style={{ borderBottom: isLast ? 'none' : `1px solid ${T.hairline}` }}>
      <CheckCircle checked={checked} />
      <span className="flex-1" style={{ color: checked ? T.faint : T.ink, textDecoration: checked ? 'line-through' : 'none', transition: 'color 200ms ease' }}>{item.name}</span>
      {!hideAmount && amt && <span className="text-sm" style={{ ...font.num, fontWeight: 600, color: T.muted }}>{amt}{item.unit}</span>}
    </li>
  );
}

function ShoppingList({ allRecipes, selectedIds, onRemove, checked, onToggleCheck }) {
  const selectedRecipes = allRecipes.filter((r) => selectedIds.has(r.id));

  if (selectedRecipes.length === 0) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: T.greenSoft }}>
          <ShoppingBag size={28} style={{ color: T.green }} />
        </div>
        <p className="mb-1" style={{ ...font.display, fontWeight: 600, color: T.ink }}>Ingen opskrifter i indkøb endnu</p>
        <p className="text-sm" style={{ color: T.muted }}>Tryk på indkøbskurven på en opskrift for at tilføje den.</p>
      </div>
    );
  }

  const items = buildShoppingList(selectedRecipes);
  const staples = items.filter((i) => i.pantryStaple);
  const byCategory = CATEGORY_ORDER
    .map((cat) => ({ category: cat, items: items.filter((i) => !i.pantryStaple && i.category === cat) }))
    .filter((g) => g.items.length > 0);
  const doneCount = items.filter((i) => checked.has(i.key)).length;

  return (
    <div className="py-6 px-5">
      <div className="flex flex-wrap gap-2 mb-5">
        {selectedRecipes.map((r) => (
          <button key={r.id} onClick={() => onRemove(r.id)} className="flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full focus-green" style={{ background: T.greenSoft, color: T.greenDark, fontWeight: 500 }}>
            {r.title} <X size={13} />
          </button>
        ))}
      </div>

      {byCategory.map((group) => (
        <div key={group.category} className="rounded-3xl px-5 pt-4 pb-2 mb-4" style={{ background: T.surface, boxShadow: T.shadowCard }}>
          <p className="text-sm mb-1" style={{ ...font.display, fontWeight: 600, color: T.green }}>{group.category}</p>
          <ul>
            {group.items.map((item, i) => (
              <ShoppingRow key={item.key} item={item} checked={checked.has(item.key)} onToggle={() => onToggleCheck(item.key)} isLast={i === group.items.length - 1} />
            ))}
          </ul>
        </div>
      ))}

      {staples.length > 0 && (
        <div className="rounded-3xl px-5 pt-4 pb-2" style={{ background: T.surfaceSoft }}>
          <p className="text-sm mb-1" style={{ ...font.display, fontWeight: 600, color: T.muted }}>Tjek at du har</p>
          <ul>
            {staples.map((item, i) => (
              <ShoppingRow key={item.key} item={item} checked={checked.has(item.key)} onToggle={() => onToggleCheck(item.key)} hideAmount isLast={i === staples.length - 1} />
            ))}
          </ul>
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}

// Sticky total bar shown at the bottom of the shopping screen.
function ShoppingTotalBar({ total, done }) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: T.surface, borderTop: `1px solid ${T.hairline}` }}>
      <div className="flex items-center gap-2" style={{ color: T.body }}>
        <ShoppingBag size={18} style={{ color: T.green }} />
        <span style={{ ...font.display, fontWeight: 600 }}>{total} {total === 1 ? 'vare' : 'varer'}</span>
      </div>
      <span style={{ ...font.num, fontWeight: 700, color: T.greenDark }}>{done}/{total} klaret</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB BAR
// ---------------------------------------------------------------------------
function TabBar({ view, onChange, shoppingCount }) {
  const tabs = [
    { id: 'list', label: 'Opskrifter', icon: ChefHat },
    { id: 'shopping', label: 'Indkøb', icon: ShoppingBag },
  ];
  return (
    <nav className="shrink-0" style={{ background: T.surface, borderTop: `1px solid ${T.hairline}`, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.id || (tab.id === 'list' && (view === 'detail' || view === 'add'));
          return (
            <button key={tab.id} onClick={() => onChange(tab.id)} className="flex-1 flex flex-col items-center gap-1 pt-3 pb-1.5 focus-green" style={{ color: active ? T.green : T.faint, transition: 'color 200ms ease' }}>
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {tab.id === 'shopping' && shoppingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 leading-none rounded-full w-4 h-4 flex items-center justify-center" style={{ ...font.num, background: T.green, color: '#FFF', fontSize: 10, fontWeight: 700 }}>{shoppingCount}</span>
                )}
              </span>
              <span className="text-xs" style={{ ...font.display, fontWeight: active ? 600 : 500 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-center pb-1.5">
        <div style={{ width: 128, height: 5, borderRadius: 999, background: T.green, opacity: 0.85 }} />
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// ROOT
// ---------------------------------------------------------------------------
export default function CookingModeApp() {
  const [view, setView] = useState('list');
  const [activeRecipeId, setActiveRecipeId] = useState(null);
  const [selectedForShopping, setSelectedForShopping] = useState(() => new Set());
  const [shoppingChecked, setShoppingChecked] = useState(() => new Set());
  const [userRecipes, setUserRecipes] = useState([]);
  const [persistAvailable, setPersistAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadUserRecipes().then(({ recipes, persisted }) => {
      if (cancelled) return;
      setUserRecipes(recipes);
      setPersistAvailable(persisted);
    });
    return () => { cancelled = true; };
  }, []);

  const allRecipes = [...userRecipes, ...BUILT_IN_RECIPES];
  const activeRecipe = allRecipes.find((r) => r.id === activeRecipeId);

  const toggleShopping = (id) => {
    setSelectedForShopping((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleShoppingChecked = (key) => {
    setShoppingChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const openRecipe = (id) => { setActiveRecipeId(id); setView('detail'); };

  const handleRecipeSaved = async (recipe) => {
    const nextRecipes = [recipe, ...userRecipes];
    setUserRecipes(nextRecipes);
    setActiveRecipeId(recipe.id);
    setView('detail');
    return saveUserRecipes(nextRecipes);
  };

  const handleRecipeDeleted = async (id) => {
    const nextRecipes = userRecipes.filter((r) => r.id !== id);
    setUserRecipes(nextRecipes);
    setSelectedForShopping((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setView('list');
    setActiveRecipeId(null);
    await saveUserRecipes(nextRecipes);
  };

  const shoppingItems = buildShoppingList(allRecipes.filter((r) => selectedForShopping.has(r.id)));
  const shoppingItemCount = shoppingItems.filter((i) => !shoppingChecked.has(i.key)).length;
  const shoppingDone = shoppingItems.filter((i) => shoppingChecked.has(i.key)).length;

  const showFab = view === 'list';

  return (
    <div className="min-h-screen flex justify-center" style={{ background: '#CFE3C6' }}>
      <div className="w-full max-w-md relative flex flex-col h-screen" style={{ fontFamily: "'Poppins', sans-serif", background: T.bg, boxShadow: '0 0 60px rgba(30,70,40,0.12)' }}>
        {view === 'cooking' && activeRecipe ? (
          <CookingMode recipe={activeRecipe} onExit={() => setView('detail')} />
        ) : (
          <>
            <GreenHeader
              onBack={view === 'detail' || view === 'add' ? () => setView(view === 'add' ? 'list' : 'list') : undefined}
              subtitle={view === 'shopping' ? 'Indkøbsliste' : undefined}
              right={view === 'detail' && activeRecipe ? (
                <CartButton active={selectedForShopping.has(activeRecipe.id)} onClick={() => toggleShopping(activeRecipe.id)} size={34} />
              ) : null}
            />
            <main className="flex-1 overflow-y-auto" style={{ background: T.bg }}>
              {view === 'list' && (
                <RecipeList userRecipes={userRecipes} selectedIds={selectedForShopping} onOpen={openRecipe} onToggleShopping={toggleShopping} onAdd={() => setView('add')} />
              )}
              {view === 'add' && (
                <AddRecipe onSaved={handleRecipeSaved} onCancel={() => setView('list')} persistAvailable={persistAvailable} />
              )}
              {view === 'detail' && activeRecipe && (
                <RecipeDetail recipe={activeRecipe} isSelected={selectedForShopping.has(activeRecipe.id)} onToggleShopping={() => toggleShopping(activeRecipe.id)} onStartCooking={() => setView('cooking')} onDelete={handleRecipeDeleted} />
              )}
              {view === 'shopping' && (
                <ShoppingList allRecipes={allRecipes} selectedIds={selectedForShopping} onRemove={toggleShopping} checked={shoppingChecked} onToggleCheck={toggleShoppingChecked} />
              )}
            </main>

            {view === 'shopping' && shoppingItems.length > 0 && (
              <ShoppingTotalBar total={shoppingItems.length} done={shoppingDone} />
            )}

            {showFab && (
              <button onClick={() => setView('add')} aria-label="Tilføj opskrift fra link" className="absolute w-14 h-14 rounded-full flex items-center justify-center focus-green" style={{ right: 18, bottom: 92, background: T.green, color: '#FFF', boxShadow: T.shadowBtn, transition: `transform 200ms ${T.spring}` }}>
                <Plus size={26} />
              </button>
            )}

            <TabBar view={view} onChange={setView} shoppingCount={shoppingItemCount} />
          </>
        )}
      </div>
    </div>
  );
}
