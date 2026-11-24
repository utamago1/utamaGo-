import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatBunpouFormulaInline,
  humanizeFormulaText,
  normalizeFormulaLines,
  parseBunpouFormulaRows,
} from './bunpouFormulaFormatter';

test('normalizeFormulaLines preserves distinct formula lines while joining wrapped continuations', () => {
  const joined = normalizeFormulaLines([
    'N の + ためだ・ため(に)',
    'Bentuk biasa (Adj-na だ→な / ~である, N だ→の / ~である) + ためだ・ため(に)',
  ]);
  assert.equal(joined.split('\n').length, 2);

  const wrappedOperator = normalizeFormulaLines([
    'N-の / V・Adj bentuk biasa (Adj-na: な・である ; N: の・である)',
    '+ わりに(は)',
  ]);
  assert.equal(wrappedOperator.split('\n').length, 1);
  assert.ok(wrappedOperator.includes('+ わりに(は)'));

  const wrappedParen = normalizeFormulaLines([
    'Bentuk potensial kata kerja (V-I: -u→-eru, V-II: -ru→-rareru,',
    'V-III: する→できる, 来る→来られる)',
  ]);
  assert.equal(wrappedParen.split('\n').length, 1);
});

test('parseBunpouFormulaRows transforms N3 [5-1] into two clear Indonesian rows with extracted conjugation note', () => {
  const raw = [
    'N の + ためだ・ため(に)',
    'Bentuk biasa (Adj-na だ→な / ~である, N だ→の / ~である) + ためだ・ため(に)',
  ].join('\n');

  const rows = parseBunpouFormulaRows(raw);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].kind, 'formula');
  assert.equal(rows[0].expression, 'Kata Benda + の + ためだ・ため(に)');
  assert.equal(rows[1].kind, 'formula');
  assert.equal(rows[1].expression, 'Bentuk biasa + ためだ・ため(に)');
  assert.ok(rows[1].subNote?.includes('Kata Sifat-na'));
  assert.ok(rows[1].subNote?.includes('Kata Benda'));
  assert.ok(!rows[1].expression.includes('Adj-na'));
});

test('humanizeFormulaText expands raw JP/EN grammar shorthand cleanly without breaking Japanese', () => {
  const out1 = humanizeFormulaText('普通形 (Adj-na: だ→ー/である ; N: だ→ー/である) + に違いない');
  assert.ok(out1.includes('Bentuk biasa'));
  assert.ok(out1.includes('Kata Sifat-na'));
  assert.ok(out1.includes('tanpa だ / ~である'));
  assert.ok(out1.includes('に違いない'));

  const out2 = humanizeFormulaText('V-masu stem + たいです');
  assert.equal(out2, 'Kata Kerja bentuk ます (tanpa ます) + たいです');

  const inline = formatBunpouFormulaInline('N + より\nN + ほど…ません');
  assert.equal(inline, 'Kata Benda + より  ·  Kata Benda + ほど…ません');
});
