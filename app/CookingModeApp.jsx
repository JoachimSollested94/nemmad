'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, Play, Pause, RotateCcw,
  Check, Clock, Users, Flame, UtensilsCrossed, Minus, Plus,
  ChefHat, ShoppingBag, Link2, Trash2, AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// DESIGN TOKENS — light "porcelain & bronze" kitchen palette.
// ---------------------------------------------------------------------------
const T = {
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceSoft: '#F3EEE6',
  ink: '#211C15',
  body: '#4A443B',
  muted: '#8A8178',
  faint: '#B8AFA3',
  hairline: '#E9E2D7',
  bronze: '#8B7355',
  bronzeSoft: '#F1EAE0',
  herb: '#4A6741',
  herbSoft: '#EDF1EA',
  clay: '#A34A3C',
  claySoft: '#F5EAE7',
  shadowCard: '0 1px 2px rgba(33,28,21,0.05), 0 8px 24px rgba(33,28,21,0.06)',
  shadowFloat: '0 2px 6px rgba(33,28,21,0.08), 0 16px 40px rgba(33,28,21,0.10)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

const font = {
  display: { fontFamily: "'Fraunces', serif" },
  mono: { fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' },
};

// ---------------------------------------------------------------------------
// DATA — built-in demo recipes. User recipes (imported from links) are stored
// in localStorage and merged in at runtime.
// ---------------------------------------------------------------------------
const CATEGORY_ORDER = ['Frugt & grønt', 'Kød & fisk', 'Mejeri & køl', 'Tørvarer', 'Krydderi & andet'];

const BUILT_IN_RECIPES = [
  {
    id: 'scones',
    title: 'Proteinscones',
    kicker: 'Bagt · Protein',
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

// Renders an amount, or '' when the ingredient is unquantified (e.g. "salt og
// peber" imported from a link with no stated quantity).
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
// Same name + unit sums together; pantry staples (salt, oil) merge by name
// only. If any contribution is unquantified the merged amount stays null.
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
// LINK IMPORT — POST the URL to our own backend, which fetches the page,
// parses schema.org recipe data (JSON-LD or microdata) and returns a recipe.
// No AI, no API key, no cost.
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
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Kunne ikke læse opskriften fra linket.');
  }
  if (!data.recipe) throw new Error('Uventet svar fra serveren.');
  return data.recipe;
}

// ---------------------------------------------------------------------------
// PERSISTENCE — localStorage. All user recipes live under one key. Fails soft:
// the app works in-memory if storage is unavailable (e.g. private mode).
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
function Eyebrow({ children, color = T.bronze }) {
  return (
    <p className="text-xs uppercase mb-2" style={{ ...font.mono, letterSpacing: '0.18em', color }}>
      {children}
    </p>
  );
}

function CheckCircle({ checked }) {
  return (
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
      style={{
        border: `1.5px solid ${checked ? T.herb : T.faint}`,
        background: checked ? T.herb : 'transparent',
        transition: `all 200ms ${T.spring}`,
      }}
    >
      {checked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
    </span>
  );
}

function MetaRow({ recipe }) {
  return (
    <div className="flex items-center gap-4 text-sm" style={{ color: T.muted }}>
      <span className="flex items-center gap-1.5"><Clock size={14} /> {recipe.totalTimeLabel}</span>
      <span className="flex items-center gap-1.5"><Users size={14} /> {recipe.baseServings} {recipe.servingUnit}</span>
      {recipe.macros && <span className="flex items-center gap-1.5"><Flame size={14} /> {recipe.macros.kcal} kcal</span>}
    </div>
  );
}

function IngredientCard({ recipe }) {
  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: T.surface, border: `1px solid ${T.hairline}`, boxShadow: T.shadowCard }}>
      <h2 className="text-lg mb-2" style={{ ...font.display, fontWeight: 600, color: T.ink }}>Ingredienser</h2>
      <ul>
        {recipe.ingredients.map((ing, i) => (
          <li
            key={ing.id}
            className="flex items-center justify-between py-2.5"
            style={{ borderBottom: i < recipe.ingredients.length - 1 ? `1px solid ${T.hairline}` : 'none', color: T.body }}
          >
            <span>{ing.name}</span>
            <span className="text-sm" style={{ ...font.mono, color: T.bronze }}>{formatAmount(ing.amount)}{ing.unit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepsCard({ recipe }) {
  return (
    <div className="rounded-2xl p-5 mb-7" style={{ background: T.surface, border: `1px solid ${T.hairline}`, boxShadow: T.shadowCard }}>
      <h2 className="text-lg mb-3" style={{ ...font.display, fontWeight: 600, color: T.ink }}>Fremgangsmåde</h2>
      <ol className="space-y-4">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-3.5">
            <span className="shrink-0 w-5 pt-0.5 text-sm" style={{ ...font.mono, color: T.bronze }}>{i + 1}</span>
            <div>
              <p style={{ color: T.ink, fontWeight: 500 }}>{step.title}</p>
              <p className="text-sm mt-0.5" style={{ color: T.muted }}>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TIMER RING — the signature element. A brass kitchen dial on porcelain.
// ---------------------------------------------------------------------------
function TimerRing({ total, remaining, size = 184 }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, remaining / total) : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={T.surfaceSoft} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={T.bronze}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl" style={{ ...font.mono, color: T.ink, fontWeight: 500 }}>{formatTime(remaining)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COOKING MODE — step-by-step guided view for one recipe.
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
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: T.bg, color: T.ink }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.hairline}` }}>
        <button onClick={onExit} aria-label="Luk cooking mode" className="p-2 -ml-2 rounded-full focus-bronze" style={{ color: T.muted }}>
          <X size={22} />
        </button>
        <div className="flex items-center gap-1.5">
          {recipe.steps.map((_, i) => (
            <span
              key={i}
              className="rounded-full"
              style={{
                height: 5,
                width: i === stepIndex ? 24 : 5,
                background: i === stepIndex ? T.bronze : i < stepIndex ? T.herb : T.hairline,
                transition: `all 400ms ${T.spring}`,
              }}
            />
          ))}
        </div>
        <button onClick={() => setShowIngredients(true)} aria-label="Vis ingredienser" className="p-2 -mr-2 rounded-full focus-bronze" style={{ color: T.muted }}>
          <UtensilsCrossed size={20} />
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 py-8 gap-6">
        <div>
          <Eyebrow>Trin {stepIndex + 1} af {recipe.steps.length}</Eyebrow>
          <h2 className="text-4xl leading-tight" style={{ ...font.display, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {step.title}
          </h2>
        </div>

        <p className="text-xl leading-relaxed" style={{ color: T.body }}>{step.body}</p>

        {step.ingredientIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {step.ingredientIds.map((id) => {
              const ing = recipe.ingredients.find((x) => x.id === id);
              if (!ing) return null;
              const amt = formatAmount(scaledAmount(ing, recipe.baseServings, servings));
              return (
                <span
                  key={id}
                  className="text-sm px-3 py-1.5 rounded-full"
                  style={{ background: T.surface, border: `1px solid ${T.hairline}`, color: T.body, boxShadow: '0 1px 2px rgba(33,28,21,0.04)' }}
                >
                  {ing.name}{amt ? <> · <span style={{ ...font.mono, color: T.bronze }}>{amt}{ing.unit}</span></> : null}
                </span>
              );
            })}
          </div>
        )}

        {step.timerSeconds ? (
          <div className="flex flex-col items-center gap-5 mt-auto py-4">
            <TimerRing total={step.timerSeconds} remaining={remaining} />
            <div className="flex items-center gap-3">
              {remaining > 0 ? (
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-medium focus-bronze"
                  style={{ background: T.ink, color: T.bg, boxShadow: T.shadowFloat, transition: `transform 200ms ${T.spring}` }}
                >
                  {running ? <Pause size={18} /> : <Play size={18} />}
                  {running ? 'Pause' : remaining === step.timerSeconds ? 'Start timer' : 'Fortsæt'}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-6 py-3 rounded-full font-medium" style={{ background: T.herbSoft, color: T.herb, border: `1px solid ${T.herb}` }}>
                  <Check size={18} /> Timer færdig
                </div>
              )}
              <button
                onClick={() => { setRemaining(step.timerSeconds); setRunning(false); }}
                aria-label="Nulstil timer"
                className="p-3 rounded-full focus-bronze"
                style={{ background: T.surface, border: `1px solid ${T.hairline}`, color: T.muted }}
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="flex items-center gap-3 px-5 py-5" style={{ borderTop: `1px solid ${T.hairline}`, paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl focus-bronze"
          style={{
            background: T.surface,
            border: `1px solid ${T.hairline}`,
            color: T.body,
            opacity: isFirst ? 0.35 : 1,
            boxShadow: isFirst ? 'none' : '0 1px 2px rgba(33,28,21,0.04)',
          }}
        >
          <ChevronLeft size={20} /> Forrige
        </button>
        {isLast ? (
          <button
            onClick={onExit}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-medium focus-bronze"
            style={{ background: T.herb, color: '#FFFFFF', boxShadow: T.shadowFloat }}
          >
            <Check size={20} /> Færdig
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-medium focus-bronze"
            style={{ background: T.ink, color: T.bg, boxShadow: T.shadowFloat }}
          >
            Næste <ChevronRight size={20} />
          </button>
        )}
      </footer>

      {showIngredients && (
        <div className="absolute inset-0 z-20">
          <div className="absolute inset-0" style={{ background: 'rgba(33,28,21,0.35)' }} onClick={() => setShowIngredients(false)} />
          <div className="absolute bottom-0 inset-x-0 rounded-t-3xl max-h-96 overflow-y-auto" style={{ background: T.surface, boxShadow: '0 -8px 40px rgba(33,28,21,0.18)' }}>
            <div className="sticky top-0 px-5 pt-5 pb-3 flex items-center justify-between" style={{ background: T.surface, borderBottom: `1px solid ${T.hairline}` }}>
              <h3 className="text-xl" style={{ ...font.display, fontWeight: 600 }}>Ingredienser</h3>
              <button onClick={() => setShowIngredients(false)} aria-label="Luk ingrediensliste" className="p-1 rounded-full focus-bronze" style={{ color: T.muted }}>
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm" style={{ color: T.muted }}>Portioner</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                  aria-label="Færre portioner"
                  className="w-9 h-9 rounded-full flex items-center justify-center focus-bronze"
                  style={{ border: `1px solid ${T.hairline}`, color: T.body }}
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center" style={{ ...font.mono, color: T.ink }}>{servings}</span>
                <button
                  onClick={() => setServings((s) => s + 1)}
                  aria-label="Flere portioner"
                  className="w-9 h-9 rounded-full flex items-center justify-center focus-bronze"
                  style={{ border: `1px solid ${T.hairline}`, color: T.body }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <ul className="px-5 pb-8">
              {recipe.ingredients.map((ing) => {
                const amt = formatAmount(scaledAmount(ing, recipe.baseServings, servings));
                return (
                  <li key={ing.id} onClick={() => toggleCheck(ing.id)} className="flex items-center gap-3 py-3 cursor-pointer" style={{ borderBottom: `1px solid ${T.hairline}` }}>
                    <CheckCircle checked={checked.has(ing.id)} />
                    <span className="flex-1" style={{ color: checked.has(ing.id) ? T.faint : T.ink, textDecoration: checked.has(ing.id) ? 'line-through' : 'none' }}>
                      {ing.name}
                    </span>
                    <span className="text-sm" style={{ ...font.mono, color: T.muted }}>
                      {amt}{ing.unit}
                    </span>
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
// ADD RECIPE — paste a recipe-page link → backend extraction → review → save.
// ---------------------------------------------------------------------------
function AddRecipe({ onSaved, onCancel, persistAvailable }) {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState('input'); // input | loading | review
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveWarning, setSaveWarning] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = url.trim().length > 0 && phase !== 'loading';

  const analyze = async () => {
    if (!canSubmit) return;
    setPhase('loading');
    setErrorMsg('');
    try {
      const recipe = await importRecipeFromUrl(url.trim());
      setExtracted(recipe);
      setPhase('review');
    } catch (err) {
      setErrorMsg(err.message || 'Kunne ikke læse en opskrift fra linket. Prøv et direkte link til selve opskriften.');
      setPhase('input');
    }
  };

  const save = async () => {
    if (!extracted || saving) return;
    setSaving(true);
    const ok = await onSaved(extracted);
    if (!ok && persistAvailable) setSaveWarning(true);
    setSaving(false);
  };

  return (
    <div className="px-6 py-6">
      <button onClick={onCancel} className="flex items-center gap-1.5 mb-5 rounded focus-bronze" style={{ color: T.muted }}>
        <ChevronLeft size={18} /> Tilbage
      </button>

      <Eyebrow>Fra link</Eyebrow>
      <h1 className="text-4xl -mt-1 mb-2" style={{ ...font.display, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>
        Ny opskrift
      </h1>
      <p className="mb-6" style={{ color: T.muted }}>
        Indsæt et link til en opskrift fra nettet — fx fra en madblog eller opskriftsside — så henter vi den og gør den til opskrift og indkøbsliste her i appen.
      </p>

      {(phase === 'input') && (
        <>
          <label className="block mb-2 text-sm" style={{ color: T.body, fontWeight: 500 }}>Link til opskrift</label>
          <input
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') analyze(); }}
            placeholder="https://www.valdemarsro.dk/..."
            className="w-full rounded-2xl px-4 py-3.5 focus-bronze"
            style={{ background: T.surface, border: `1px solid ${T.hairline}`, color: T.ink, boxShadow: '0 1px 2px rgba(33,28,21,0.04)' }}
          />

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl p-4 mt-4" style={{ background: T.claySoft, color: T.clay, border: `1px solid ${T.clay}` }}>
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          <button
            onClick={analyze}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-medium mt-6 focus-bronze"
            style={{ background: T.ink, color: T.bg, boxShadow: T.shadowFloat, opacity: canSubmit ? 1 : 0.45 }}
          >
            <Link2 size={18} /> Hent opskriften
          </button>

          <p className="text-xs mt-4" style={{ color: T.faint }}>
            Virker bedst med et direkte link til selve opskriften. Vi henter kun opskriftens tekst — ingen billeder.
          </p>
        </>
      )}

      {phase === 'loading' && (
        <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.hairline}`, boxShadow: T.shadowCard }}>
          <p className="mb-5" style={{ ...font.mono, fontSize: 13, color: T.bronze }}>Henter opskriften…</p>
          {[64, 40, 88, 56, 72, 48].map((w, i) => (
            <div
              key={i}
              className="rounded-full mb-3 skeleton-pulse"
              style={{ height: 12, width: `${w}%`, background: T.surfaceSoft, animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      )}

      {phase === 'review' && extracted && (
        <>
          <div className="flex items-start gap-2.5 rounded-xl p-4 mb-6" style={{ background: T.bronzeSoft, border: `1px solid ${T.bronze}`, color: T.body }}>
            <Link2 size={18} className="shrink-0 mt-0.5" style={{ color: T.bronze }} />
            <p className="text-sm">Sådan læste vi opskriften fra linket — tjek at det ser rigtigt ud, før du gemmer.</p>
          </div>

          <Eyebrow>{extracted.kicker}</Eyebrow>
          <h2 className="text-3xl -mt-1 mb-3" style={{ ...font.display, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>
            {extracted.title}
          </h2>
          <div className="mb-6"><MetaRow recipe={extracted} /></div>

          <IngredientCard recipe={extracted} />
          <StepsCard recipe={extracted} />

          {saveWarning && (
            <div className="flex items-start gap-2.5 rounded-xl p-4 mb-4" style={{ background: T.claySoft, color: T.clay, border: `1px solid ${T.clay}` }}>
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">Kunne ikke gemme permanent — opskriften findes kun i denne session.</p>
            </div>
          )}

          <div className="flex gap-3 pb-6">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-medium focus-bronze"
              style={{ background: T.herb, color: '#FFFFFF', boxShadow: T.shadowFloat, opacity: saving ? 0.6 : 1 }}
            >
              <Check size={18} /> {saving ? 'Gemmer…' : 'Gem opskrift'}
            </button>
            <button
              onClick={() => { setExtracted(null); setPhase('input'); }}
              className="px-5 rounded-2xl focus-bronze"
              style={{ background: T.surface, border: `1px solid ${T.hairline}`, color: T.body }}
            >
              Forkast
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RECIPE LIST + CARD
// ---------------------------------------------------------------------------
function RecipeCard({ recipe, isSelected, onOpen, onToggleShopping }) {
  return (
    <div
      className="w-full rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: T.surface,
        border: `1px solid ${isSelected ? T.herb : T.hairline}`,
        boxShadow: T.shadowCard,
        transition: 'border-color 200ms ease',
      }}
    >
      <button onClick={() => onOpen(recipe.id)} className="text-left flex flex-col gap-2.5 rounded focus-bronze">
        <Eyebrow>{recipe.kicker}</Eyebrow>
        <h3 className="text-2xl leading-snug -mt-1" style={{ ...font.display, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>
          {recipe.title}
        </h3>
        <MetaRow recipe={recipe} />
      </button>
      <button
        onClick={() => onToggleShopping(recipe.id)}
        aria-label={isSelected ? 'Fjern fra indkøbsliste' : 'Tilføj til indkøbsliste'}
        className="self-start flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full focus-bronze"
        style={{
          background: isSelected ? T.herbSoft : T.bg,
          color: isSelected ? T.herb : T.body,
          border: `1px solid ${isSelected ? T.herb : T.hairline}`,
          transition: `all 200ms ${T.spring}`,
        }}
      >
        {isSelected ? <Check size={14} /> : <Plus size={14} />} Indkøb
      </button>
    </div>
  );
}

function RecipeList({ userRecipes, selectedIds, onOpen, onToggleShopping, onAdd }) {
  return (
    <div className="px-6 py-6">
      <h1 className="text-3xl mb-1" style={{ ...font.display, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>
        Hvad skal vi lave?
      </h1>
      <p className="mb-6" style={{ color: T.muted }}>Vælg en opskrift, læg den i indkøb — eller tilføj din egen fra et link.</p>

      {userRecipes.length > 0 && (
        <>
          <Eyebrow>Mine opskrifter</Eyebrow>
          <div className="flex flex-col gap-4 mb-7">
            {userRecipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} isSelected={selectedIds.has(r.id)} onOpen={onOpen} onToggleShopping={onToggleShopping} />
            ))}
          </div>
        </>
      )}

      {userRecipes.length === 0 && (
        <button
          onClick={onAdd}
          className="w-full rounded-2xl py-8 flex flex-col items-center gap-2 mb-7 focus-bronze"
          style={{ border: `1.5px dashed ${T.faint}`, color: T.muted, background: 'transparent' }}
        >
          <Link2 size={22} style={{ color: T.bronze }} />
          <span className="text-sm" style={{ color: T.body }}>Tilføj din første opskrift fra et link</span>
        </button>
      )}

      <Eyebrow>Inspiration</Eyebrow>
      <div className="flex flex-col gap-4">
        {BUILT_IN_RECIPES.map((r) => (
          <RecipeCard key={r.id} recipe={r} isSelected={selectedIds.has(r.id)} onOpen={onOpen} onToggleShopping={onToggleShopping} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RECIPE DETAIL
// ---------------------------------------------------------------------------
function RecipeDetail({ recipe, isSelected, onToggleShopping, onStartCooking, onBack, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="px-6 py-6">
      <button onClick={onBack} className="flex items-center gap-1.5 mb-5 rounded focus-bronze" style={{ color: T.muted }}>
        <ChevronLeft size={18} /> Opskrifter
      </button>

      <Eyebrow>{recipe.kicker}</Eyebrow>
      <h1 className="text-4xl -mt-1 mb-3" style={{ ...font.display, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>
        {recipe.title}
      </h1>
      <div className="mb-7"><MetaRow recipe={recipe} /></div>

      <IngredientCard recipe={recipe} />
      <StepsCard recipe={recipe} />

      <div className="flex gap-3 pb-2">
        <button
          onClick={onStartCooking}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-medium focus-bronze"
          style={{ background: T.ink, color: T.bg, boxShadow: T.shadowFloat, transition: `transform 200ms ${T.spring}` }}
        >
          <Play size={18} /> Start cooking mode
        </button>
        <button
          onClick={onToggleShopping}
          aria-label={isSelected ? 'Fjern fra indkøbsliste' : 'Tilføj til indkøbsliste'}
          className="px-4 rounded-2xl focus-bronze"
          style={{
            background: isSelected ? T.herbSoft : T.surface,
            border: `1px solid ${isSelected ? T.herb : T.hairline}`,
            color: isSelected ? T.herb : T.body,
            transition: `all 200ms ${T.spring}`,
          }}
        >
          {isSelected ? <Check size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {recipe.sourceUrl && (
        <p className="text-xs mt-4 text-center truncate" style={{ color: T.faint }}>
          Kilde: {recipe.sourceUrl}
        </p>
      )}

      {recipe.isUserRecipe && (
        <div className="pb-6 pt-3 flex justify-center">
          <button
            onClick={() => (confirmDelete ? onDelete(recipe.id) : setConfirmDelete(true))}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full focus-bronze"
            style={{
              color: T.clay,
              background: confirmDelete ? T.claySoft : 'transparent',
              border: confirmDelete ? `1px solid ${T.clay}` : '1px solid transparent',
              transition: 'all 200ms ease',
            }}
          >
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
    <li
      onClick={onToggle}
      className="flex items-center gap-3 py-3 cursor-pointer"
      style={{ borderBottom: isLast ? 'none' : `1px solid ${T.hairline}` }}
    >
      <CheckCircle checked={checked} />
      <span
        className="flex-1"
        style={{ color: checked ? T.faint : T.ink, textDecoration: checked ? 'line-through' : 'none', transition: 'color 200ms ease' }}
      >
        {item.name}
      </span>
      {!hideAmount && amt && (
        <span className="text-sm" style={{ ...font.mono, color: T.muted }}>{amt}{item.unit}</span>
      )}
    </li>
  );
}

function ShoppingList({ allRecipes, selectedIds, onRemove, checked, onToggleCheck }) {
  const selectedRecipes = allRecipes.filter((r) => selectedIds.has(r.id));

  if (selectedRecipes.length === 0) {
    return (
      <div className="px-6 py-20 text-center">
        <ShoppingBag size={28} className="mx-auto mb-4" style={{ color: T.faint }} />
        <p className="mb-1" style={{ color: T.body }}>Ingen opskrifter i indkøbslisten endnu.</p>
        <p className="text-sm" style={{ color: T.muted }}>Tryk "Indkøb" på en opskrift for at tilføje den.</p>
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
    <div className="px-6 py-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-3xl" style={{ ...font.display, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>Indkøb</h1>
        <span className="text-sm" style={{ ...font.mono, color: T.muted }}>{doneCount}/{items.length}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {selectedRecipes.map((r) => (
          <button
            key={r.id}
            onClick={() => onRemove(r.id)}
            className="flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full focus-bronze"
            style={{ background: T.surface, border: `1px solid ${T.hairline}`, color: T.body, boxShadow: '0 1px 2px rgba(33,28,21,0.04)' }}
          >
            {r.title} <X size={13} style={{ color: T.faint }} />
          </button>
        ))}
      </div>

      {byCategory.map((group) => (
        <div
          key={group.category}
          className="rounded-2xl px-5 pt-4 pb-1.5 mb-4"
          style={{ background: T.surface, border: `1px solid ${T.hairline}`, boxShadow: T.shadowCard }}
        >
          <Eyebrow>{group.category}</Eyebrow>
          <ul>
            {group.items.map((item, i) => (
              <ShoppingRow
                key={item.key}
                item={item}
                checked={checked.has(item.key)}
                onToggle={() => onToggleCheck(item.key)}
                isLast={i === group.items.length - 1}
              />
            ))}
          </ul>
        </div>
      ))}

      {staples.length > 0 && (
        <div className="rounded-2xl px-5 pt-4 pb-1.5" style={{ background: T.surfaceSoft, border: `1px solid ${T.hairline}` }}>
          <Eyebrow color={T.muted}>Tjek at du har</Eyebrow>
          <ul>
            {staples.map((item, i) => (
              <ShoppingRow
                key={item.key}
                item={item}
                checked={checked.has(item.key)}
                onToggle={() => onToggleCheck(item.key)}
                hideAmount
                isLast={i === staples.length - 1}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TOP BAR + TAB BAR
// ---------------------------------------------------------------------------
function TopBar() {
  return (
    <header className="flex items-center px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.hairline}`, background: T.bg }}>
      <span className="text-xl" style={{ ...font.display, fontWeight: 600, fontStyle: 'italic', color: T.ink }}>NemMad</span>
    </header>
  );
}

function TabBar({ view, onChange, shoppingCount }) {
  const tabs = [
    { id: 'list', label: 'Opskrifter', icon: ChefHat },
    { id: 'shopping', label: 'Indkøb', icon: ShoppingBag },
  ];
  return (
    <nav className="flex shrink-0" style={{ borderTop: `1px solid ${T.hairline}`, background: T.surface, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = view === tab.id || (tab.id === 'list' && (view === 'detail' || view === 'add'));
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 focus-bronze"
            style={{ color: active ? T.bronze : T.faint, transition: 'color 200ms ease' }}
          >
            <span className="relative">
              <Icon size={20} />
              {tab.id === 'shopping' && shoppingCount > 0 && (
                <span
                  className="absolute -top-1 -right-2 leading-none rounded-full w-4 h-4 flex items-center justify-center"
                  style={{ ...font.mono, background: T.bronze, color: '#FFFFFF', fontSize: 10 }}
                >
                  {shoppingCount}
                </span>
              )}
            </span>
            <span className="text-xs" style={{ fontWeight: active ? 600 : 400 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// ROOT
// ---------------------------------------------------------------------------
export default function CookingModeApp() {
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'shopping' | 'cooking' | 'add'
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleShoppingChecked = (key) => {
    setShoppingChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openRecipe = (id) => { setActiveRecipeId(id); setView('detail'); };

  // Save a newly imported recipe: update state, persist, open detail.
  // Returns whether the persistent write succeeded (for the UI warning).
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
    setSelectedForShopping((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setView('list');
    setActiveRecipeId(null);
    await saveUserRecipes(nextRecipes);
  };

  const shoppingItemCount = buildShoppingList(allRecipes.filter((r) => selectedForShopping.has(r.id)))
    .filter((i) => !shoppingChecked.has(i.key)).length;

  const showFab = view === 'list';

  return (
    <div className="min-h-screen flex justify-center" style={{ background: '#EFEAE1' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,600&family=Manrope:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        body { font-family: 'Manrope', sans-serif; }
        .focus-bronze:focus { outline: none; }
        .focus-bronze:focus-visible { outline: 2px solid #8B7355; outline-offset: 2px; }
        button:active { transform: scale(0.98); }
        @keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        .skeleton-pulse { animation: skeletonPulse 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
          button:active { transform: none; }
        }
      `}</style>
      <div
        className="w-full max-w-md relative flex flex-col h-screen"
        style={{ fontFamily: "'Manrope', sans-serif", background: T.bg, boxShadow: '0 0 60px rgba(33,28,21,0.08)' }}
      >
        {view === 'cooking' && activeRecipe ? (
          <CookingMode recipe={activeRecipe} onExit={() => setView('detail')} />
        ) : (
          <>
            <TopBar />
            <main className="flex-1 overflow-y-auto" style={{ background: T.bg }}>
              {view === 'list' && (
                <RecipeList
                  userRecipes={userRecipes}
                  selectedIds={selectedForShopping}
                  onOpen={openRecipe}
                  onToggleShopping={toggleShopping}
                  onAdd={() => setView('add')}
                />
              )}
              {view === 'add' && (
                <AddRecipe onSaved={handleRecipeSaved} onCancel={() => setView('list')} persistAvailable={persistAvailable} />
              )}
              {view === 'detail' && activeRecipe && (
                <RecipeDetail
                  recipe={activeRecipe}
                  isSelected={selectedForShopping.has(activeRecipe.id)}
                  onToggleShopping={() => toggleShopping(activeRecipe.id)}
                  onStartCooking={() => setView('cooking')}
                  onBack={() => setView('list')}
                  onDelete={handleRecipeDeleted}
                />
              )}
              {view === 'shopping' && (
                <ShoppingList
                  allRecipes={allRecipes}
                  selectedIds={selectedForShopping}
                  onRemove={toggleShopping}
                  checked={shoppingChecked}
                  onToggleCheck={toggleShoppingChecked}
                />
              )}
            </main>

            {showFab && (
              <button
                onClick={() => setView('add')}
                aria-label="Tilføj opskrift fra link"
                className="absolute w-14 h-14 rounded-full flex items-center justify-center focus-bronze"
                style={{
                  right: 20,
                  bottom: 84,
                  background: T.ink,
                  color: T.bg,
                  boxShadow: T.shadowFloat,
                  transition: `transform 200ms ${T.spring}`,
                }}
              >
                <Link2 size={22} />
              </button>
            )}

            <TabBar view={view} onChange={setView} shoppingCount={shoppingItemCount} />
          </>
        )}
      </div>
    </div>
  );
}
