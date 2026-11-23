import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampSpeechRate,
  cleanJapaneseSpeechText,
  DEFAULT_SPEECH_PREFERENCES,
  detectJapaneseVoiceGender,
  formatSpeechRateLabel,
  formatSpeechStyleLabel,
  resolveJapaneseVoiceSelection,
  sanitizeSpeechPreferences,
} from './japaneseSpeech';

test('clampSpeechRate keeps values within 0.5x..1.5x and handles invalid inputs', () => {
  assert.equal(clampSpeechRate(0.2), 0.5);
  assert.equal(clampSpeechRate(2.8), 1.5);
  assert.equal(clampSpeechRate(0.75), 0.75);
  assert.equal(clampSpeechRate(Number.NaN), DEFAULT_SPEECH_PREFERENCES.rate);
});

test('sanitizeSpeechPreferences validates rate, style, voiceURI, and autoPlayAnki', () => {
  const sanitized = sanitizeSpeechPreferences({
    rate: 1.9,
    voiceStyle: 'invalid' as 'auto',
    voiceURI: '  Kyoko  ',
    autoPlayAnki: true,
  });
  assert.equal(sanitized.rate, 1.5);
  assert.equal(sanitized.voiceStyle, 'auto');
  assert.equal(sanitized.voiceURI, 'Kyoko');
  assert.equal(sanitized.autoPlayAnki, true);
});

test('detectJapaneseVoiceGender recognizes common Japanese female and male voices', () => {
  assert.equal(detectJapaneseVoiceGender('Kyoko'), 'female');
  assert.equal(detectJapaneseVoiceGender('Microsoft Haruka - Japanese'), 'female');
  assert.equal(detectJapaneseVoiceGender('Microsoft Nanami Online'), 'female');
  assert.equal(detectJapaneseVoiceGender('Otoya'), 'male');
  assert.equal(detectJapaneseVoiceGender('Microsoft Ichiro'), 'male');
  assert.equal(detectJapaneseVoiceGender('Microsoft Keita Online'), 'male');
  assert.equal(detectJapaneseVoiceGender('Google 日本語'), 'unknown');
});

test('resolveJapaneseVoiceSelection picks matching voice or calibrates pitch fallback', () => {
  const mixedVoices = [
    { voiceURI: 'en-1', name: 'Samantha', lang: 'en-US', localService: true },
    { voiceURI: 'ja-f', name: 'Kyoko', lang: 'ja-JP', localService: true },
    { voiceURI: 'ja-m', name: 'Otoya', lang: 'ja-JP', localService: true },
  ];

  const femalePick = resolveJapaneseVoiceSelection(mixedVoices, {
    voiceStyle: 'female',
    voiceURI: '',
  });
  assert.equal(femalePick.voice?.voiceURI, 'ja-f');
  assert.equal(femalePick.pitch, 1);

  const malePick = resolveJapaneseVoiceSelection(mixedVoices, {
    voiceStyle: 'male',
    voiceURI: '',
  });
  assert.equal(malePick.voice?.voiceURI, 'ja-m');
  assert.equal(malePick.pitch, 1);

  // Single neutral voice falls back with pitch calibration
  const singleVoice = [
    { voiceURI: 'ja-generic', name: 'Google 日本語', lang: 'ja-JP', localService: false },
  ];
  const maleFallback = resolveJapaneseVoiceSelection(singleVoice, {
    voiceStyle: 'male',
    voiceURI: '',
  });
  assert.equal(maleFallback.voice?.voiceURI, 'ja-generic');
  assert.equal(maleFallback.pitch, 0.84);

  const femaleFallback = resolveJapaneseVoiceSelection(singleVoice, {
    voiceStyle: 'female',
    voiceURI: '',
  });
  assert.equal(femaleFallback.voice?.voiceURI, 'ja-generic');
  assert.equal(femaleFallback.pitch, 1.12);
});

test('cleanJapaneseSpeechText strips parentheses and formatting markers', () => {
  assert.equal(
    cleanJapaneseSpeechText('食べる（たべる）〜/見る'),
    '食べる 見る',
  );
  assert.equal(formatSpeechRateLabel(1), '1.0x');
  assert.equal(formatSpeechRateLabel(0.75), '0.75x');
  assert.equal(formatSpeechStyleLabel('female'), 'Cewek');
  assert.equal(formatSpeechStyleLabel('male'), 'Cowok');
});
