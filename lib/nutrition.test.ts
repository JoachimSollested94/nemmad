// Unit tests for the nutrition engine. Run with: npm test
import assert from 'node:assert';
import { test } from 'node:test';
import {
  resolveFood,
  ingredientGrams,
  computeRecipeNutrition,
  macroEnergyShares,
} from './nutrition';

// --- resolveFood: longest keyword wins over generic ones -------------------
test('resolveFood — kokosmælk beats mælk', () => {
  const f = resolveFood('Kokosmælk');
  assert.equal(f?.per100.fat, 21); // coconut milk, not dairy milk (1.5)
});

test('resolveFood — rødløg beats løg', () => {
  const f = resolveFood('Rødløg, hakket');
  assert.equal(f?.per100.kcal, 42); // red onion, not yellow (40)
});

test('resolveFood — flødeost beats fløde', () => {
  const f = resolveFood('Flødeost naturel');
  assert.equal(f?.per100.fat, 24); // cream cheese, not cream (37)
});

test('resolveFood — unknown ingredient returns null', () => {
  assert.equal(resolveFood('enhjørningestøv'), null);
});

// --- ingredientGrams: unit conversions -------------------------------------
test('ingredientGrams — grams pass through', () => {
  assert.equal(ingredientGrams({ name: 'mel', amount: 180, unit: 'g' }, resolveFood('mel')), 180);
});

test('ingredientGrams — kg scales to grams', () => {
  assert.equal(ingredientGrams({ name: 'kartofler', amount: 1.5, unit: 'kg' }, resolveFood('kartofler')), 1500);
});

test('ingredientGrams — spsk olie uses oil density', () => {
  // 2 spsk = 30 ml × 0.91 g/ml ≈ 27.3 g
  const g = ingredientGrams({ name: 'olivenolie', amount: 2, unit: 'spsk' }, resolveFood('olivenolie'));
  assert.ok(g !== null && Math.abs(g - 27.3) < 0.1, `expected ~27.3, got ${g}`);
});

test('ingredientGrams — dl mel uses flour density (not water)', () => {
  // 1 dl = 100 ml × 0.6 g/ml = 60 g (Danish convention), not 100 g
  const g = ingredientGrams({ name: 'hvedemel', amount: 1, unit: 'dl' }, resolveFood('hvedemel'));
  assert.equal(g, 60);
});

test('ingredientGrams — bare count uses egg piece weight', () => {
  // "2 æg" → amount 2, unit '' → 2 × 58 g
  assert.equal(ingredientGrams({ name: 'æg', amount: 2, unit: '' }, resolveFood('æg')), 116);
});

test('ingredientGrams — fed is a fixed clove weight', () => {
  assert.equal(ingredientGrams({ name: 'hvidløg', amount: 2, unit: 'fed' }, resolveFood('hvidløg')), 10);
});

test('ingredientGrams — unknown piece weight returns null', () => {
  // "1 pakke ..." can't be weighed reliably
  assert.equal(ingredientGrams({ name: 'butterdej', amount: 1, unit: 'pakke' }, null), null);
});

test('ingredientGrams — null amount returns null', () => {
  assert.equal(ingredientGrams({ name: 'salt', amount: null, unit: '' }, resolveFood('salt')), null);
});

// --- computeRecipeNutrition: end-to-end ------------------------------------
test('computeRecipeNutrition — protein scones per 100 g', () => {
  const recipe = {
    baseServings: 8,
    ingredients: [
      { name: 'Havregrynsmel', amount: 180, unit: 'g' },
      { name: 'Valleproteinpulver (isolat)', amount: 30, unit: 'g' },
      { name: 'Bagepulver', amount: 8, unit: 'g' },
      { name: 'Salt', amount: 0.5, unit: 'g' },
      { name: 'Skyr 0%', amount: 150, unit: 'g' },
      { name: 'Æg, pisket', amount: 60, unit: 'g' },
      { name: 'Sødemiddel (erythritol)', amount: 12, unit: 'g' },
      { name: 'Vand', amount: 30, unit: 'g' },
    ],
  };
  const n = computeRecipeNutrition(recipe);
  assert.ok(n, 'expected a result');
  assert.equal(n!.matched, 8);
  assert.equal(n!.coverage, 1);
  // Total mass is the sum of gram amounts (470.5 g), rounded for display.
  assert.equal(n!.totalGrams, 471);
  // Sanity range for a protein-scone dough: ~150–230 kcal/100 g.
  assert.ok(n!.per100g.kcal > 150 && n!.per100g.kcal < 230, `kcal/100g=${n!.per100g.kcal}`);
  assert.ok(n!.per100g.protein > 8, `protein/100g=${n!.per100g.protein}`);
});

test('computeRecipeNutrition — mixed units (curry) resolve fully', () => {
  const recipe = {
    baseServings: 4,
    ingredients: [
      { name: 'Kyllingebryst, i tern', amount: 500, unit: 'g' },
      { name: 'Løg, hakket', amount: 1, unit: 'stk' },
      { name: 'Hvidløgsfed, hakket', amount: 2, unit: 'fed' },
      { name: 'Karry', amount: 2, unit: 'spsk' },
      { name: 'Kokosmælk', amount: 400, unit: 'ml' },
      { name: 'Olie', amount: 2, unit: 'spsk' },
      { name: 'Jasminris', amount: 200, unit: 'g' },
      { name: 'Salt', amount: 1, unit: 'knivspids' },
    ],
  };
  const n = computeRecipeNutrition(recipe);
  assert.ok(n, 'expected a result');
  assert.equal(n!.coverage, 1);
  // Reasonable dinner range per portion.
  assert.ok(n!.perServing.kcal > 400 && n!.perServing.kcal < 800, `kcal/serving=${n!.perServing.kcal}`);
});

test('computeRecipeNutrition — partial coverage is reported, not hidden', () => {
  const recipe = {
    baseServings: 2,
    ingredients: [
      { name: 'Havregryn', amount: 100, unit: 'g' },
      { name: 'Enhjørningestøv', amount: 1, unit: 'pakke' }, // unresolvable
    ],
  };
  const n = computeRecipeNutrition(recipe);
  assert.ok(n, 'expected a result');
  assert.equal(n!.matched, 1);
  assert.equal(n!.considered, 2);
  assert.equal(n!.coverage, 0.5);
  assert.deepEqual(n!.unmatched, ['Enhjørningestøv']);
});

test('computeRecipeNutrition — nothing resolvable returns null', () => {
  const n = computeRecipeNutrition({ baseServings: 2, ingredients: [{ name: 'xyz', amount: 1, unit: 'pakke' }] });
  assert.equal(n, null);
});

test('macroEnergyShares — sums to 1 and weights fat by 9', () => {
  const s = macroEnergyShares({ kcal: 0, protein: 10, carbs: 10, fat: 10 });
  const sum = s.protein + s.carbs + s.fat;
  assert.ok(Math.abs(sum - 1) < 1e-9, `shares sum to ${sum}`);
  assert.ok(s.fat > s.protein, 'fat share should exceed protein share at equal grams');
});
