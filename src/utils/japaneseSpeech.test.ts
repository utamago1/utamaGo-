import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTtsCacheKey,
  clampSpeechRate,
  cleanJapaneseSpeechText,
  DEFAULT_SPEECH_PREFERENCES,
  detectJapaneseVoiceGender,
  formatSpeechRateLabel,
  formatSpeechStyleLabel,
  resolveAnkiCardSpeechText,
  resolveBunpouSpeechText,
  resolveJapaneseVoiceSelection,
  resolveServerTtsVoice,
  resolveWritingItemSpeechText,
  romajiToHiragana,
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

test('resolveServerTtsVoice maps male to Charon and female/auto to Kore with distinct cache keys', () => {
  assert.deepEqual(resolveServerTtsVoice('male'), {
    voiceName: 'Charon',
    normalizedStyle: 'male',
  });
  assert.deepEqual(resolveServerTtsVoice('female'), {
    voiceName: 'Kore',
    normalizedStyle: 'female',
  });
  assert.deepEqual(resolveServerTtsVoice('auto'), {
    voiceName: 'Kore',
    normalizedStyle: 'female',
  });

  const maleKey = buildTtsCacheKey('こんにちは', 'male');
  const femaleKey = buildTtsCacheKey('こんにちは', 'female');
  assert.notEqual(maleKey, femaleKey);
  assert.ok(maleKey.includes('/male/'));
  assert.ok(femaleKey.includes('/female/'));
});

test('cleanJapaneseSpeechText strips dialogue speaker labels and bracketed notes', () => {
  assert.equal(
    cleanJapaneseSpeechText('A: 明日、会社へ行きますか。  B: はい、行きます。'),
    '明日、会社へ行きますか。 はい、行きます。',
  );
  assert.equal(
    cleanJapaneseSpeechText('若いうちに、いろいろな国を旅行しておきたい。 (makna A)'),
    '若いうちに、いろいろな国を旅行しておきたい。',
  );
  assert.equal(
    cleanJapaneseSpeechText('A案に対する反対意見を言う。'),
    'A案に対する反対意見を言う。',
  );
});

test('resolveAnkiCardSpeechText prefers pure kana furigana over bare kanji for vocab cards', () => {
  // Single kanji like 夢 must speak as ゆめ (never bare 夢 which device TTS misreads as む)
  assert.equal(
    resolveAnkiCardSpeechText({
      word: '夢',
      furigana: 'ゆめ',
      readingTerm: '夢(ゆめ)',
      cardKind: 'vocab',
    }),
    'ゆめ',
  );
  assert.equal(
    resolveAnkiCardSpeechText({
      word: '夢中',
      furigana: 'むちゅう',
      readingTerm: '夢中(むちゅう)',
      cardKind: 'vocab',
    }),
    'むちゅう',
  );
  // Numeric kana readings like １０ぷん are preserved
  assert.equal(
    resolveAnkiCardSpeechText({
      word: '１０分',
      furigana: '１０ぷん',
      readingTerm: '１０分(１０ぷん)',
      cardKind: 'vocab',
    }),
    '１０ぷん',
  );
  // Falls back to readingTerm parens if furigana is absent
  assert.equal(
    resolveAnkiCardSpeechText({
      word: '一日',
      furigana: null,
      readingTerm: '一日(ついたち)',
      cardKind: 'vocab',
    }),
    'ついたち',
  );
  // Pure katakana/hiragana word without furigana uses word directly
  assert.equal(
    resolveAnkiCardSpeechText({
      word: 'コーヒー',
      furigana: null,
      readingTerm: 'コーヒー',
      cardKind: 'vocab',
    }),
    'コーヒー',
  );
});

test('romajiToHiragana and resolveBunpouSpeechText convert Japanese romaji cleanly and reject Indonesian glosses', () => {
  assert.equal(romajiToHiragana('sai (ni)'), 'さいに');
  assert.equal(romajiToHiragana('ue (de)'), 'うえで');
  assert.equal(romajiToHiragana('saichuu da'), 'さいちゅうだ');
  assert.equal(romajiToHiragana('aida / aida ni'), 'あいだ');
  assert.equal(romajiToHiragana('ya / ya ina ya'), 'やいなや');
  assert.equal(romajiToHiragana('te kara to iu mono (wa)'), 'てからというものは');
  assert.equal(
    romajiToHiragana('o kawakiri ni (shite) / o kawakiri to shite'),
    'をかわきりにして',
  );

  // Must reject Indonesian grammar descriptions in N5 Bunpou
  assert.equal(romajiToHiragana('Ungkapan salam dasar'), null);
  assert.equal(romajiToHiragana('~no / pengganti kata benda'), null);
  assert.equal(romajiToHiragana('~desu / ~masu / negatif'), null);

  assert.equal(
    resolveAnkiCardSpeechText({
      word: '~際(に)',
      furigana: 'sai (ni)',
      romaji: 'sai (ni)',
      cardKind: 'bunpou',
    }),
    'さいに',
  );
  assert.equal(
    resolveBunpouSpeechText({
      pattern: '日本の です',
      romaji: '~no / pengganti kata benda',
    }),
    '日本の です',
  );
  assert.equal(
    resolveBunpouSpeechText({
      pattern: '~(ら)れます   ((ra)remasu) [bentuk potensial]',
      romaji: '',
    }),
    'られます',
  );
});

test('resolveWritingItemSpeechText prefers kana reading of example word', () => {
  assert.equal(
    resolveWritingItemSpeechText({
      character: '夢',
      reading: 'ゆめ・ム',
      exampleWord: '夢',
      exampleReading: 'ゆめ',
    }),
    'ゆめ',
  );
  assert.equal(
    resolveWritingItemSpeechText({
      character: 'あ',
      reading: 'あ',
      exampleWord: 'あめ',
      exampleReading: 'あめ',
    }),
    'あめ',
  );
});
