// ---------------------------------------------------------------------------
// NUTRITION ENGINE — estimates calories + macros per 100 g for a recipe.
// FREE, no AI, runs anywhere: a curated Danish food table (values close to
// DTU Frida / product labels), Danish unit→gram conversion, and a longest-
// keyword-match resolver. The hard part is turning "2 spsk olie" or "1 løg"
// into grams — that needs food-specific densities and piece weights, both
// carried on each food row below.
//
// Method:  grams(i) = amount × unitFactor(unit, food)
//          per100g   = Σ macro(i) / Σ grams(i) × 100
// Anything we cannot resolve is left out and surfaced as a coverage figure,
// so the number shown never silently pretends to be complete.
// ---------------------------------------------------------------------------

export interface Macros {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

// A food's per-100 g nutrition plus the physical properties needed to weigh it.
export interface Food {
  keywords: string[]; // lowercase substrings; longest match across all foods wins
  per100: Macros;
  density?: number; // g per ml — for volume units (dl/spsk/…). Default 1.0.
  piece?: number; // g per single item — for count units (stk / bare number).
}

// Minimal shape the engine needs from an ingredient (matches the app's model).
export interface NutritionInput {
  name: string;
  amount: number | null;
  unit: string;
}

export interface RecipeLike {
  baseServings?: number;
  ingredients: NutritionInput[];
}

export interface NutritionResult {
  per100g: Macros;
  perServing: Macros; // per one of `baseServings` portions
  total: Macros; // whole recipe as listed
  totalGrams: number;
  matched: number; // ingredients that contributed
  considered: number; // quantified ingredients we tried to weigh
  coverage: number; // matched / considered, 0..1
  unmatched: string[]; // names we could not weigh or identify
}

// ---------------------------------------------------------------------------
// UNIT CONVERSION
// ---------------------------------------------------------------------------
const MASS_TO_G: Record<string, number> = { mg: 0.001, g: 1, hg: 100, kg: 1000 };

// Danish kitchen volumes. 1 spsk = 15 ml, 1 tsk = 5 ml, 1 dl = 100 ml.
const VOL_TO_ML: Record<string, number> = {
  ml: 1, cl: 10, dl: 100, l: 1000, spsk: 15, tsk: 5, knivspids: 0.5,
};

// Fallback grams for count units when the food has no specific piece weight.
const GENERIC_PIECE_G: Record<string, number> = {
  skive: 20, bundt: 80, kvist: 2, blad: 1, håndfuld: 30, dåse: 380, glas: 200,
};

// ---------------------------------------------------------------------------
// FOOD TABLE — [keywords, kcal, protein, carbs, fat, density?, piece?]
// Values are per 100 g. Ordered by category for readability only; the resolver
// picks the longest matching keyword, so "kokosmælk" beats "mælk" regardless
// of position. Keep keywords lowercase.
// ---------------------------------------------------------------------------
type Row = [string[], number, number, number, number, (number | null)?, (number | null)?];

const ROWS: Row[] = [
  // — Kød & fisk —
  [['kyllingebryst', 'kyllingefilet'], 115, 23, 0, 1.8, null, 150],
  [['kyllingelår', 'kyllingeoverlår'], 175, 18, 0, 11],
  [['hakket kylling', 'kyllingefars', 'hakket kalkun', 'kalkunfars'], 145, 19, 0, 8],
  [['kylling'], 130, 20, 0, 5],
  [['kalkun'], 120, 22, 0, 3],
  [['hakket okse', 'hakket oksekød', 'oksefars', 'hakket kød', 'kød, hakket', 'fars'], 200, 19, 0, 13],
  [['culotte', 'mørbrad', 'bøf', 'oksekød', 'okse', 'kalv'], 130, 21, 0, 5],
  [['bacon'], 400, 13, 0, 39],
  [['skinke'], 110, 18, 1, 4],
  [['pølse'], 300, 12, 3, 27],
  [['kotelet', 'svinekød', 'svinemørbrad', 'flæsk', 'nakkefilet', 'svin'], 210, 19, 0, 15],
  [['lammekød', 'lam'], 230, 18, 0, 17],
  [['laks'], 208, 20, 0, 13],
  [['torsk'], 82, 18, 0, 0.7],
  [['tunfisk', 'tun'], 110, 25, 0, 1],
  [['rejer'], 85, 18, 0, 1],
  [['muslinger'], 86, 12, 3, 2],
  [['fisk'], 110, 20, 0, 3],

  // — Mejeri & køl —
  [['æg'], 143, 12.6, 0.7, 9.9, null, 58],
  [['skyr'], 63, 11, 4, 0.2, 1.05],
  [['kærnemælk'], 40, 3.4, 4.5, 1, 1.03],
  [['kokosmælk'], 200, 2, 3, 21, 1.0],
  [['sødmælk', 'letmælk', 'minimælk', 'mælk'], 46, 3.5, 4.8, 1.5, 1.03],
  [['piskefløde', 'flødeskum', 'fløde'], 350, 2, 3, 37, 1.0],
  [['creme fraiche', 'cremefraiche', 'crème fraîche'], 190, 2.7, 4, 18, 1.0],
  [['flødeost'], 250, 6, 4, 24],
  [['mozzarella'], 250, 18, 2, 19],
  [['parmesan'], 400, 36, 3, 27],
  [['feta'], 265, 14, 2, 22],
  [['burrata'], 290, 12, 2, 26],
  [['revet ost', 'cheddar', 'ost'], 380, 25, 1, 30],
  [['smør'], 740, 0.7, 0.6, 82, 0.91],
  [['yoghurt', 'ymer'], 62, 4.5, 5, 3, 1.03],

  // — Frugt & grønt —
  [['cherrytomat', 'tomat'], 20, 0.9, 3.5, 0.2, null, 90],
  [['rødløg'], 42, 1.2, 9, 0.1, null, 100],
  [['forårsløg', 'forårsløgene'], 32, 1.8, 7, 0.4, null, 15],
  [['hvidløg'], 149, 6.4, 33, 0.5, null, 5],
  [['skalotteløg', 'løg'], 40, 1.2, 9, 0.1, null, 110],
  [['kartoffel', 'kartofler', 'kartoflerne'], 75, 2, 16, 0.1, null, 90],
  [['gulerod', 'gulerødder', 'gulerødderne'], 41, 0.9, 10, 0.2, null, 70],
  [['peberfrugt', 'peberfrugten'], 30, 1, 6, 0.3, null, 150],
  [['spidskål', 'hvidkål', 'rødkål', 'grønkål', 'kål'], 28, 1.5, 5, 0.2],
  [['broccoli'], 34, 2.8, 7, 0.4],
  [['blomkål'], 25, 1.9, 5, 0.3],
  [['spinat'], 23, 2.9, 3.6, 0.4],
  [['salat', 'rucola'], 15, 1.2, 2, 0.2],
  [['agurk'], 12, 0.7, 2, 0.1, null, 350],
  [['squash', 'zucchini'], 17, 1.2, 3, 0.3, null, 250],
  [['aubergine'], 25, 1, 6, 0.2, null, 250],
  [['champignon', 'svampe', 'svamp'], 22, 3, 3, 0.3, null, 20],
  [['porre', 'porrer'], 30, 1.5, 6, 0.3, null, 150],
  [['selleri', 'bladselleri'], 17, 0.7, 3, 0.2],
  [['ærter'], 81, 5, 14, 0.4],
  [['grønne bønner', 'bønner'], 31, 1.8, 7, 0.2],
  [['majs'], 86, 3.2, 19, 1.2],
  [['ingefær'], 80, 1.8, 18, 0.8],
  [['chili', 'chilifrugt'], 40, 2, 9, 0.4, null, 15],
  [['avocado'], 160, 2, 9, 15, null, 140],
  [['citron'], 29, 1.1, 9, 0.3, null, 90],
  [['lime'], 30, 0.7, 11, 0.2, null, 60],
  [['appelsin'], 47, 0.9, 12, 0.1, null, 130],
  [['æble', 'æbler'], 52, 0.3, 14, 0.2, null, 150],
  [['banan'], 89, 1.1, 23, 0.3, null, 120],
  [['mango'], 60, 0.8, 15, 0.4],
  [['druer'], 69, 0.7, 18, 0.2],
  [['jordbær', 'hindbær', 'blåbær', 'bær'], 45, 1, 10, 0.3],
  [['basilikum', 'persille', 'koriander', 'dild', 'mynte', 'krydderurter'], 30, 3, 4, 0.6],

  // — Tørvarer —
  [['havregryn', 'havregryns', 'gryn'], 372, 13, 60, 7, 0.35],
  [['rugmel', 'durummel', 'hvedemel', 'mel'], 340, 10, 72, 1.2, 0.6],
  [['jasminris', 'basmatiris', 'grødris', 'ris'], 360, 6.8, 79, 0.6, 0.85],
  [['fuldkornspasta', 'spaghetti', 'pasta', 'penne', 'lasagneplader'], 360, 12, 72, 1.5],
  [['nudler', 'nudel'], 350, 11, 71, 1.5],
  [['couscous'], 376, 13, 77, 0.6, 0.7],
  [['bulgur'], 342, 12, 76, 1.3, 0.7],
  [['quinoa'], 368, 14, 64, 6, 0.7],
  [['røde linser', 'linser'], 340, 24, 50, 1.5, 0.8],
  [['kikærter'], 120, 7, 20, 2],
  [['flåede tomater', 'hakkede tomater', 'dåsetomat', 'tomater på dåse'], 30, 1.3, 5, 0.3, 1.0],
  [['tomatpuré', 'tomatpure', 'tomatpasta'], 82, 4.3, 15, 0.5, 1.1],
  [['bouillon', 'fond'], 8, 0.8, 0.8, 0.2, 1.0],
  [['olivenolie', 'rapsolie', 'solsikkeolie', 'olie'], 884, 0, 0, 100, 0.91],
  [['balsamico', 'eddike'], 20, 0, 1, 0, 1.01],
  [['sojasovs', 'soja'], 60, 8, 6, 0, 1.1],
  [['honning'], 304, 0.3, 82, 0, 1.42],
  [['sirup', 'agavesirup'], 300, 0, 78, 0, 1.33],
  [['brun farin', 'farin', 'rørsukker', 'sukker'], 400, 0, 100, 0, 0.85],
  [['flormelis', 'melis'], 400, 0, 100, 0, 0.55],
  [['gær'], 105, 12, 12, 2],
  [['bagepulver'], 90, 0, 22, 0, 0.9],
  [['natron'], 0, 0, 0, 0, 0.9],
  [['kakao'], 230, 20, 12, 14, 0.5],
  [['mørk chokolade', 'chokolade'], 550, 6, 46, 38],
  [['mandler', 'mandel'], 590, 21, 22, 50],
  [['pinjekerner'], 670, 14, 13, 68],
  [['valnødder', 'hasselnødder', 'cashewnødder', 'nødder'], 620, 15, 20, 55],
  [['solsikkekerner', 'græskarkerner', 'kerner'], 580, 20, 15, 50],
  [['rosiner'], 300, 3, 79, 0.5],
  [['kokosmel', 'kokosflager', 'kokos'], 650, 7, 24, 62, 0.4],
  [['valleprotein', 'proteinpulver', 'protein', 'valle'], 375, 82, 8, 5, 0.45],
  [['rasp'], 350, 12, 65, 5, 0.4],

  // — Krydderi & andet —
  [['pesto'], 450, 5, 6, 45, 1.0],
  [['sennep'], 100, 6, 6, 6, 1.1],
  [['ketchup'], 110, 1.5, 26, 0.2, 1.1],
  [['mayonnaise', 'mayo'], 680, 1, 2, 75, 0.95],
  [['erythritol', 'sødemiddel', 'sødningsmiddel', 'stevia'], 0, 0, 0, 0, 0.75],
  [['salt', 'fleur de sel'], 0, 0, 0, 0, 1.2],
  [['peber'], 250, 10, 64, 3, 0.5],
  [['karry', 'paprika', 'spidskommen', 'kanel', 'kardemomme', 'oregano', 'timian',
    'rosmarin', 'muskat', 'gurkemeje', 'krydderi'], 320, 12, 55, 12, 0.5],
  [['vand'], 0, 0, 0, 0, 1.0],
];

const FOODS: Food[] = ROWS.map(([keywords, kcal, protein, carbs, fat, density, piece]) => ({
  keywords,
  per100: { kcal, protein, carbs, fat },
  density: density ?? undefined,
  piece: piece ?? undefined,
}));

// ---------------------------------------------------------------------------
// RESOLUTION
// ---------------------------------------------------------------------------
// Longest matching keyword wins, so specific foods beat generic ones without
// depending on table order ("kokosmælk" > "mælk", "rødløg" > "løg").
export function resolveFood(name: string): Food | null {
  const lower = ` ${name.toLowerCase()} `;
  let best: Food | null = null;
  let bestLen = 0;
  for (const food of FOODS) {
    for (const kw of food.keywords) {
      if (kw.length > bestLen && lower.includes(kw)) {
        best = food;
        bestLen = kw.length;
      }
    }
  }
  return best;
}

// Convert one ingredient to grams, or null when it can't be weighed reliably.
export function ingredientGrams(input: NutritionInput, food: Food | null): number | null {
  const { amount, unit } = input;
  if (amount === null || !Number.isFinite(amount) || amount <= 0) return null;
  const u = (unit || '').toLowerCase();

  if (u in MASS_TO_G) return amount * MASS_TO_G[u];
  if (u in VOL_TO_ML) return amount * VOL_TO_ML[u] * (food?.density ?? 1.0);

  // A clove is a fixed small weight regardless of the food it belongs to.
  if (u === 'fed') return amount * (food?.piece ?? 5);

  // Count units and bare numbers ("2 æg") use a per-item weight.
  if (u === '' || u === 'stk') {
    if (food?.piece) return amount * food.piece;
    return null; // unknown item weight — better to omit than to guess
  }
  if (u in GENERIC_PIECE_G) return amount * (food?.piece ?? GENERIC_PIECE_G[u]);

  return null; // unrecognised unit (pakke, pose, …)
}

// ---------------------------------------------------------------------------
// RECIPE AGGREGATION
// ---------------------------------------------------------------------------
const roundMacros = (m: Macros): Macros => ({
  kcal: Math.round(m.kcal),
  protein: Math.round(m.protein * 10) / 10,
  carbs: Math.round(m.carbs * 10) / 10,
  fat: Math.round(m.fat * 10) / 10,
});

export function computeRecipeNutrition(recipe: RecipeLike): NutritionResult | null {
  const total: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  let totalGrams = 0;
  let matched = 0;
  let considered = 0;
  const unmatched: string[] = [];

  for (const ing of recipe.ingredients) {
    // Unquantified lines ("salt og peber") add negligible mass — skip them
    // entirely so they neither distort the total nor dent the coverage figure.
    if (ing.amount === null || !Number.isFinite(ing.amount)) continue;
    considered += 1;

    const food = resolveFood(ing.name);
    const grams = ingredientGrams(ing, food);
    if (!food || grams === null || grams <= 0) {
      unmatched.push(ing.name);
      continue;
    }

    const factor = grams / 100;
    total.kcal += food.per100.kcal * factor;
    total.protein += food.per100.protein * factor;
    total.carbs += food.per100.carbs * factor;
    total.fat += food.per100.fat * factor;
    totalGrams += grams;
    matched += 1;
  }

  if (matched === 0 || totalGrams <= 0) return null;

  const scale100 = 100 / totalGrams;
  const per100g: Macros = {
    kcal: total.kcal * scale100,
    protein: total.protein * scale100,
    carbs: total.carbs * scale100,
    fat: total.fat * scale100,
  };

  const servings = recipe.baseServings && recipe.baseServings > 0 ? recipe.baseServings : 1;
  const perServing: Macros = {
    kcal: total.kcal / servings,
    protein: total.protein / servings,
    carbs: total.carbs / servings,
    fat: total.fat / servings,
  };

  return {
    per100g: roundMacros(per100g),
    perServing: roundMacros(perServing),
    total: roundMacros(total),
    totalGrams: Math.round(totalGrams),
    matched,
    considered,
    coverage: considered > 0 ? matched / considered : 0,
    unmatched,
  };
}

// Split total energy into the share coming from each macro (Atwater factors:
// protein/carbs 4 kcal/g, fat 9 kcal/g). Used to draw the macro bar.
export function macroEnergyShares(m: Macros): { protein: number; carbs: number; fat: number } {
  const p = Math.max(0, m.protein) * 4;
  const c = Math.max(0, m.carbs) * 4;
  const f = Math.max(0, m.fat) * 9;
  const sum = p + c + f;
  if (sum <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: p / sum, carbs: c / sum, fat: f / sum };
}
