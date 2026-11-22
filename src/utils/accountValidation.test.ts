import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NAME_MAX_LENGTH,
  normalizeEmail,
  normalizeUsername,
  sanitizeDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from './accountValidation';

test('normalizeUsername and validateUsername enforce pattern and boundaries', () => {
  assert.equal(normalizeUsername('  Ryan_Utama01  '), 'ryan_utama01');

  const ok = validateUsername('Ryan.Utama_1');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, 'ryan.utama_1');

  assert.equal(validateUsername('ab').valid, false);
  assert.equal(validateUsername('a'.repeat(25)).valid, false);
  assert.equal(validateUsername('ryan utama').valid, false);
  assert.equal(validateUsername('ryan@gmail.com').valid, false);
});

test('validateEmail trims, lowercases, and rejects invalid addresses', () => {
  assert.equal(normalizeEmail('  Siswa@Gmail.COM '), 'siswa@gmail.com');

  const ok = validateEmail('  UtamaGo@Example.COM ');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, 'utamago@example.com');

  assert.equal(validateEmail('').valid, false);
  assert.equal(validateEmail('bukan-email').valid, false);
  assert.equal(validateEmail(`${'a'.repeat(115)}@x.com`).valid, false);
});

test('validatePassword checks minimum and maximum length', () => {
  assert.equal(validatePassword('').valid, false);
  assert.equal(validatePassword('12345').valid, false);
  assert.equal(validatePassword('123456').valid, true);
  assert.equal(validatePassword('a'.repeat(129)).valid, false);
});

test('sanitizeDisplayName trims and caps display name to schema maxLength', () => {
  const trimmed = sanitizeDisplayName(`  ${'x'.repeat(80)}  `);
  assert.equal(trimmed.length, NAME_MAX_LENGTH);
});
