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
  assert.equal(
    lookupStaticEn('Minggu, 6 Desember 2026'),
    'Sunday, December 6, 2026',
  );
  assert.equal(
    lookupStaticEn('Lanjutkan Sesi (14 tersisa)'),
    'Resume Session (14 left)',
  );
  assert.equal(
    lookupStaticEn('25 Kartu Siap Dipelajari'),
    '25 Cards Ready to Study',
  );
  assert.equal(lookupStaticEn('Tampilkan 12 Bab'), 'Show 12 Chapters');
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

  // Mixed Indonesian + English loanword strings must be detected
  assert.equal(needsIndonesianTranslation('Auto-play Audio di Anki'), true);
  assert.equal(needsIndonesianTranslation('Reset Semua Progres?'), true);
  assert.equal(needsIndonesianTranslation('Simulasi N3, N2 & N1'), true);
  assert.equal(needsIndonesianTranslation('Materi Kosakata — Segera Hadir'), true);

  // Pure Japanese must NEVER be queued for translation
  assert.equal(needsIndonesianTranslation('このかばんは軽いです。'), false);
  assert.equal(needsIndonesianTranslation('水をください。'), false);
  assert.equal(needsIndonesianTranslation('日本語能力試験'), false);

  // Already-English UI strings & codes must be skipped
  assert.equal(needsIndonesianTranslation('Sign in to UtamaGo!'), false);
  assert.equal(needsIndonesianTranslation('Start Studying'), false);
  assert.equal(needsIndonesianTranslation('Auto-play Audio in Anki'), false);
  assert.equal(needsIndonesianTranslation('Main App Navigation'), false);
  assert.equal(needsIndonesianTranslation('UtamaGo!'), false);
  assert.equal(needsIndonesianTranslation('N3'), false);
  assert.equal(needsIndonesianTranslation('@budi_jlpt'), false);
  assert.equal(needsIndonesianTranslation('https://example.com'), false);
});
