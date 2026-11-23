import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppInquiryUrl,
  calculateTryOutReport,
  TEACHER_INSTAGRAM_HANDLE,
  TEACHER_INSTAGRAM_URL,
} from './jlptReport';
import { MINI_TRYOUT_QUESTIONS } from '../data/utamagoContent';

test('calculateTryOutReport calculates 100% when all answers are correct', () => {
  const answers: Record<string, number> = {};
  for (const q of MINI_TRYOUT_QUESTIONS) {
    answers[q.id] = q.correctIndex;
  }

  const report = calculateTryOutReport(answers, MINI_TRYOUT_QUESTIONS);
  assert.equal(report.average, 100);
  assert.equal(report.correctCount, 4);
  assert.equal(report.statusLabel, 'Siap Evaluasi Lanjut');
  assert.equal(report.rows.every((r) => r.score === 100), true);
});

test('calculateTryOutReport calculates partial score and correct status label', () => {
  const answers: Record<string, number> = {
    'q-mojigoi': 0,
    'q-bunpou': 0,
    'q-dokkai': 1,
    'q-choukai': 2,
  };

  const report = calculateTryOutReport(answers, MINI_TRYOUT_QUESTIONS);
  assert.equal(report.average, 50);
  assert.equal(report.correctCount, 2);
  assert.equal(report.statusLabel, 'Perlu Penguatan');
  assert.equal(report.rows.find((r) => r.section === 'Moji-Goi')?.score, 100);
  assert.equal(report.rows.find((r) => r.section === 'Dokkai')?.score, 0);
});

test('buildWhatsAppInquiryUrl encodes learner question note cleanly', () => {
  const url = buildWhatsAppInquiryUrl('Tanya pola Bunpou N2');
  assert.ok(url.startsWith('https://wa.me/?text='));
  assert.ok(decodeURIComponent(url).includes('Tanya pola Bunpou N2'));
});

test('teacher Instagram contact points to official @ryan_lief profile', () => {
  assert.equal(TEACHER_INSTAGRAM_HANDLE, '@ryan_lief');
  assert.equal(TEACHER_INSTAGRAM_URL, 'https://www.instagram.com/ryan_lief/');
});
