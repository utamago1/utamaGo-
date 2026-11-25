import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lookupStaticEn,
  needsIndonesianTranslation,
} from '../i18n/staticEnDict.ts';

test('lookupStaticEn translates exact UI strings while preserving surrounding whitespace', () => {
  assert.equal(lookupStaticEn('Mulai Belajar'), 'Start Studying');
  assert.equal(lookupStaticEn('  Lihat Jawaban  '), '  Show Answer  ');
  assert.equal(lookupStaticEn('Kata benda'), 'Noun');
  assert.equal(lookupStaticEn('Kata sifat-i'), 'i-Adjective');
});

test('lookupStaticEn translates dynamic counters and mixed Japanese + POS strings', () => {
  assert.equal(lookupStaticEn('30 menit'), '30 min');
  assert.equal(lookupStaticEn('12 kartu jatuh tempo'), '12 cards due');
  assert.equal(lookupStaticEn('1/6 selesai'), '1/6 completed');
  assert.equal(lookupStaticEn('Bab 3'), 'Chapter 3');
  assert.equal(lookupStaticEn('かばん　Kata benda'), 'かばん　Noun');
  assert.equal(
    lookupStaticEn('いる　Kata kerja (Ichidan) - intransitif'),
    'いる　Ichidan Verb (intransitive)',
  );
});

test('needsIndonesianTranslation detects Indonesian and mixed strings while skipping pure Japanese and English', () => {
  assert.equal(needsIndonesianTranslation('Tas ini ringan.'), true);
  assert.equal(needsIndonesianTranslation('Tolong beri saya air.'), true);
  assert.equal(needsIndonesianTranslation('かばん　Tas (tas jinjing)'), true);
  assert.equal(needsIndonesianTranslation('Daftar laporan bug dan saran'), true);

  // Pure Japanese must NEVER be queued for translation
  assert.equal(needsIndonesianTranslation('このかばんは軽いです。'), false);
  assert.equal(needsIndonesianTranslation('水をください。'), false);
  assert.equal(needsIndonesianTranslation('日本語能力試験'), false);

  // Already-English UI strings & codes must be skipped
  assert.equal(needsIndonesianTranslation('Sign in to UtamaGo!'), false);
  assert.equal(needsIndonesianTranslation('Start Studying'), false);
  assert.equal(needsIndonesianTranslation('UtamaGo!'), false);
  assert.equal(needsIndonesianTranslation('N3'), false);
  assert.equal(needsIndonesianTranslation('@budi_jlpt'), false);
  assert.equal(needsIndonesianTranslation('https://example.com'), false);
});
