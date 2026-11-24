import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getFirstSundayOfMonth,
  isValidJlptExamSession,
  resolveNextJlptExam,
} from './jlptCountdown';

test('getFirstSundayOfMonth returns exact first Sunday for July and December', () => {
  // 2026: July 1 is Wednesday -> first Sunday is July 5
  const july2026 = getFirstSundayOfMonth(2026, 6);
  assert.equal(july2026.getFullYear(), 2026);
  assert.equal(july2026.getMonth(), 6);
  assert.equal(july2026.getDate(), 5);
  assert.equal(july2026.getDay(), 0);

  // 2026: Dec 1 is Tuesday -> first Sunday is Dec 6
  const dec2026 = getFirstSundayOfMonth(2026, 11);
  assert.equal(dec2026.getFullYear(), 2026);
  assert.equal(dec2026.getMonth(), 11);
  assert.equal(dec2026.getDate(), 6);
  assert.equal(dec2026.getDay(), 0);

  // 2027: July 1 is Thursday -> first Sunday is July 4
  const july2027 = getFirstSundayOfMonth(2027, 6);
  assert.equal(july2027.getDate(), 4);
  assert.equal(july2027.getDay(), 0);
});

test('resolveNextJlptExam auto selects nearest upcoming session across year boundaries', () => {
  // Nov 24, 2026 -> Dec 6, 2026 (12 days remaining)
  const nov24 = resolveNextJlptExam('auto', 30, new Date(2026, 10, 24));
  assert.equal(nov24.session, 'december');
  assert.equal(nov24.year, 2026);
  assert.equal(nov24.daysRemaining, 12);
  assert.equal(nov24.isExamDay, false);
  assert.equal(nov24.estimatedTotalHours, 6);
  assert.equal(nov24.formattedDateId, 'Minggu, 6 Desember 2026');

  // Exact exam day: Dec 6, 2026 -> 0 days remaining, isExamDay = true
  const examDay = resolveNextJlptExam('auto', 30, new Date(2026, 11, 6));
  assert.equal(examDay.session, 'december');
  assert.equal(examDay.daysRemaining, 0);
  assert.equal(examDay.isExamDay, true);

  // Day after Dec exam: Dec 7, 2026 -> rolls over to July 4, 2027
  const afterDec = resolveNextJlptExam('auto', 20, new Date(2026, 11, 7));
  assert.equal(afterDec.session, 'july');
  assert.equal(afterDec.year, 2027);
  assert.equal(afterDec.formattedDateId, 'Minggu, 4 Juli 2027');
  assert.ok(afterDec.daysRemaining > 200);
});

test('resolveNextJlptExam honors explicit july or december session preference', () => {
  const preferJuly = resolveNextJlptExam('july', 30, new Date(2026, 10, 24));
  assert.equal(preferJuly.session, 'july');
  assert.equal(preferJuly.year, 2027);
  assert.equal(preferJuly.formattedDateId, 'Minggu, 4 Juli 2027');

  const preferDec = resolveNextJlptExam('december', 30, new Date(2026, 2, 10));
  assert.equal(preferDec.session, 'december');
  assert.equal(preferDec.year, 2026);
  assert.equal(preferDec.formattedDateId, 'Minggu, 6 Desember 2026');

  assert.equal(isValidJlptExamSession('auto'), true);
  assert.equal(isValidJlptExamSession('july'), true);
  assert.equal(isValidJlptExamSession('december'), true);
  assert.equal(isValidJlptExamSession('march'), false);
});
