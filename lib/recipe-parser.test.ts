// Unit tests for the pure parsing helpers. Run with: npm test
// (Node's built-in test runner; requires the TS to be run via a loader, so
// these are written to also work when compiled. For quick local checks the
// logic mirrors what the route exercises end-to-end.)
import assert from 'node:assert';
import { test } from 'node:test';
import {
  parseDanishQuantity,
  isoDurationToMinutes,
  formatDuration,
  parseRecipe,
} from './recipe-parser';

test('parseDanishQuantity — gram', () => {
  assert.deepEqual(parseDanishQuantity('400 g cherrytomater'), { amount: 400, unit: 'g', name: 'cherrytomater' });
});

test('parseDanishQuantity — spsk', () => {
  assert.deepEqual(parseDanishQuantity('2 spsk olivenolie'), { amount: 2, unit: 'spsk', name: 'olivenolie' });
});

test('parseDanishQuantity — unicode fraction + dl', () => {
  const r = parseDanishQuantity('½ dl pesto');
  assert.equal(r.amount, 0.5);
  assert.equal(r.unit, 'dl');
  assert.equal(r.name, 'pesto');
});

test('parseDanishQuantity — fed (clove) keeps descriptor in name', () => {
  assert.deepEqual(parseDanishQuantity('1 fed hvidløg, fintrevet'), { amount: 1, unit: 'fed', name: 'hvidløg, fintrevet' });
});

test('parseDanishQuantity — comma decimal', () => {
  const r = parseDanishQuantity('0,5 l mælk');
  assert.equal(r.amount, 0.5);
  assert.equal(r.unit, 'l');
});

test('parseDanishQuantity — range uses lower bound', () => {
  const r = parseDanishQuantity('2-3 spsk sukker');
  assert.equal(r.amount, 2);
  assert.equal(r.unit, 'spsk');
});

test('parseDanishQuantity — unquantified staple', () => {
  const r = parseDanishQuantity('salt og friskkværnet peber');
  assert.equal(r.amount, null);
  assert.equal(r.unit, '');
  assert.equal(r.name, 'salt og friskkværnet peber');
});

test('isoDurationToMinutes', () => {
  assert.equal(isoDurationToMinutes('PT60M'), 60);
  assert.equal(isoDurationToMinutes('PT1H30M'), 90);
  assert.equal(isoDurationToMinutes('PT2H'), 120);
  assert.equal(isoDurationToMinutes(undefined), null);
});

test('formatDuration', () => {
  assert.equal(formatDuration(45), '~45 min');
  assert.equal(formatDuration(90), '~1 t 30 min');
  assert.equal(formatDuration(120), '~2 t');
  assert.equal(formatDuration(null), '—');
});

test('parseRecipe — JSON-LD', () => {
  const html = `<html><head><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: 'Testret',
    recipeYield: '4 personer',
    totalTime: 'PT30M',
    recipeCategory: 'Aftensmad',
    recipeIngredient: ['500 g kyllingebryst', '2 spsk olie', 'salt'],
    recipeInstructions: [
      { '@type': 'HowToStep', text: 'Steg kyllingen i olie i 6 minutter.' },
      { '@type': 'HowToStep', text: 'Smag til med salt og server.' },
    ],
  })}</script></head><body></body></html>`;
  const r = parseRecipe(html, 'https://example.com/x');
  assert.equal(r.title, 'Testret');
  assert.equal(r.baseServings, 4);
  assert.equal(r.totalTimeLabel, '~30 min');
  assert.equal(r.ingredients.length, 3);
  assert.equal(r.ingredients[0].category, 'Kød & fisk');
  assert.equal(r.steps.length, 2);
  assert.equal(r.steps[0].timerSeconds, 360);
});

test('parseRecipe — microdata', () => {
  const html = `<div itemscope itemtype="http://schema.org/Recipe">
    <h2 itemprop="name">Microret</h2>
    <span itemprop="recipeYield">2</span>
    <time itemprop="totalTime" content="PT20M">20 min</time>
    <ul>
      <li itemprop="recipeIngredient">200 g pasta</li>
      <li itemprop="recipeIngredient">1 dl fløde</li>
    </ul>
    <div itemprop="recipeInstructions"><p>Kog pastaen i 10 minutter.</p><p>Vend med fløde.</p></div>
  </div>`;
  const r = parseRecipe(html);
  assert.equal(r.title, 'Microret');
  assert.equal(r.baseServings, 2);
  assert.equal(r.totalTimeLabel, '~20 min');
  assert.equal(r.ingredients.length, 2);
  assert.equal(r.steps[0].timerSeconds, 600);
});

test('parseRecipe — no recipe data throws', () => {
  assert.throws(() => parseRecipe('<html><body><p>ingen opskrift</p></body></html>'));
});
