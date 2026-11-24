import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTryOutPacketChoukaiTranscript,
  getTryOutPacketForms,
} from '../data/tryOutN2AllPackets';
import { TRYOUT_N2_1_FORMS } from '../data/tryOutN2Data';
import {
  ALL_TRYOUT_PACKETS,
  CATBOX_ALL_CHOUKAI_URLS,
  CHOUKAI_N2_AUDIO_URL,
  evaluatePartFormProgress,
  evaluatePartScore,
  formatAnswerSheetText,
  formatAudioTime,
  getFirstIncompletePageIndex,
  getTryOutPacketParts,
  isFirstN2PacketCompleted,
  isTryOutPacketUnlocked,
  isVerifiedTryOutPacket,
  toggleTryOutPartCompletion,
  TRYOUT_N1_PACKETS,
  TRYOUT_N2_1_PARTS,
  TRYOUT_N2_PACKETS,
  TRYOUT_N3_PACKETS,
  VERIFIED_TRYOUT_PACKET_IDS,
} from './tryOutPacket';

test('TRYOUT_N2_1_PARTS and TRYOUT_N2_1_FORMS are 100% text-based with valid answer keys and audio config', () => {
  assert.equal(TRYOUT_N2_1_PARTS.length, 3);
  assert.equal(CHOUKAI_N2_AUDIO_URL, 'https://files.catbox.moe/rkpxrk.mp3');
  assert.equal(TRYOUT_N2_1_PARTS[2].audioSrc, CHOUKAI_N2_AUDIO_URL);

  const expectedCounts = {
    'moji-bunpou': 54,
    dokkai: 21,
    choukai: 32,
  } as const;

  for (const part of TRYOUT_N2_1_PARTS) {
    const pages = TRYOUT_N2_1_FORMS[part.id];
    assert.equal(pages.length, part.pageCount);
    const choices = pages.flatMap((p) =>
      p.items.filter((i) => i.kind === 'choice'),
    );
    assert.equal(choices.length, expectedCounts[part.id]);
    assert.equal(part.questionCount, expectedCounts[part.id]);

    for (const page of pages) {
      for (const item of page.items) {
        assert.notEqual(
          item.kind,
          'image',
          `Unexpected image item ${item.id} in text-only Try Out`,
        );

        if (
          item.kind === 'choice' ||
          item.kind === 'text' ||
          item.kind === 'date'
        ) {
          assert.equal(
            item.required,
            true,
            `Expected ${item.id} to be required`,
          );
        }

        if (item.kind === 'choice') {
          assert.equal(
            item.image,
            null,
            `Expected ${item.id} image to be null in text mode`,
          );
          assert.ok(
            item.prompt.trim().length > 0,
            `Expected ${item.id} prompt to be non-empty`,
          );
          assert.ok(
            item.options.includes(item.correctAnswer),
            `Expected valid correctAnswer for ${item.id}, got ${item.correctAnswer}`,
          );
          if (item.optionTexts) {
            assert.equal(
              item.optionTexts.length,
              item.options.length,
              `Expected matching optionTexts length for ${item.id}`,
            );
          }
        }
      }
    }
  }
});

test('evaluatePartFormProgress and getFirstIncompletePageIndex block advancing with empty fields', () => {
  const mojiPages = TRYOUT_N2_1_FORMS['moji-bunpou'];
  // Page 0 contains Tata Tertib notice only; first required item is on Page 1
  assert.equal(getFirstIncompletePageIndex(mojiPages, {}), 1);

  assert.equal(
    TRYOUT_N2_1_PARTS.find((p) => p.id === 'moji-bunpou')?.recommendedMinutes,
    45,
  );
  assert.equal(
    TRYOUT_N2_1_PARTS.find((p) => p.id === 'dokkai')?.recommendedMinutes,
    60,
  );

  const dokkaiPages = TRYOUT_N2_1_FORMS.dokkai;
  const emptySummary = evaluatePartFormProgress(dokkaiPages, {});
  assert.equal(emptySummary.totalChoices, 21);
  assert.equal(emptySummary.totalRequired, 21);
  assert.equal(emptySummary.answeredChoices, 0);
  assert.equal(emptySummary.isReadyToSubmit, false);
  assert.equal(emptySummary.missingRequired.length, 21);
  assert.equal(emptySummary.missingRequired[0].pageIndex, 0);

  const allValues: Record<string, string> = {};
  for (const page of dokkaiPages) {
    for (const item of page.items) {
      if (item.kind === 'choice') {
        allValues[item.id] = item.options[0];
      }
    }
  }
  const doneSummary = evaluatePartFormProgress(dokkaiPages, allValues);
  assert.equal(doneSummary.answeredChoices, 21);
  assert.equal(doneSummary.isReadyToSubmit, true);
  assert.equal(doneSummary.missingRequired.length, 0);
  assert.equal(
    getFirstIncompletePageIndex(dokkaiPages, allValues),
    dokkaiPages.length,
  );
});

test('evaluatePartScore grades all questions and builds detailed wrong-answer review items', () => {
  const dokkaiPages = TRYOUT_N2_1_FORMS.dokkai;
  const perfectValues: Record<string, string> = {};
  for (const page of dokkaiPages) {
    for (const item of page.items) {
      if (item.kind === 'choice') {
        perfectValues[item.id] = item.correctAnswer;
      }
    }
  }

  const perfect = evaluatePartScore(dokkaiPages, perfectValues);
  assert.equal(perfect.correctCount, 21);
  assert.equal(perfect.totalGradable, 21);
  assert.equal(perfect.accuracyPercent, 100);
  assert.equal(perfect.wrongItems.length, 0);

  const partialValues = {
    ...perfectValues,
    'dk-q-1': '1', // correctAnswer is '2'
  };
  const partial = evaluatePartScore(dokkaiPages, partialValues);
  assert.equal(partial.correctCount, 20);
  assert.equal(partial.totalGradable, 21);
  assert.equal(partial.wrongItems.length, 1);
  assert.equal(partial.wrongItems[0].itemId, 'dk-q-1');
  assert.equal(partial.wrongItems[0].chosen, '1');
  assert.equal(partial.wrongItems[0].correct, '2');
  assert.ok((partial.wrongItems[0].chosenText ?? '').length > 0);
  assert.ok((partial.wrongItems[0].correctText ?? '').length > 0);
});

test('formatAnswerSheetText formats answer key status cleanly', () => {
  const mojiPages = TRYOUT_N2_1_FORMS['moji-bunpou'];
  const summaryText = formatAnswerSheetText('Moji-Goi & Bunpou', mojiPages, {
    'mb-q-1': '2',
    'mb-q-2': '1',
  });
  assert.ok(summaryText.includes('Moji-Goi & Bunpou'));
  assert.ok(summaryText.includes('Soal 1: 2 (Benar)'));
  assert.ok(summaryText.includes('Soal 2: 1 (Kunci: 4)'));
});

test('formatAudioTime formats seconds to MM:SS cleanly', () => {
  assert.equal(formatAudioTime(0), '00:00');
  assert.equal(formatAudioTime(65), '01:05');
  assert.equal(formatAudioTime(3156), '52:36');
  assert.equal(formatAudioTime(Number.NaN), '00:00');
});

test('toggleTryOutPartCompletion awards XP on first completion only', () => {
  const first = toggleTryOutPartCompletion([], 'moji-bunpou', 50);
  assert.deepEqual(first.nextCompletedIds, ['moji-bunpou']);
  assert.equal(first.xpDelta, 50);

  const second = toggleTryOutPartCompletion(
    first.nextCompletedIds,
    'moji-bunpou',
    50,
  );
  assert.deepEqual(second.nextCompletedIds, []);
  assert.equal(second.xpDelta, 0);
});

test('ALL_TRYOUT_PACKETS includes JLPT N3 (15 packets), N2 (18 packets), and N1 (18 packets) ordered oldest-first with Catbox audio', () => {
  assert.equal(TRYOUT_N3_PACKETS.length, 15);
  assert.equal(TRYOUT_N2_PACKETS.length, 18);
  assert.equal(TRYOUT_N1_PACKETS.length, 18);
  assert.equal(ALL_TRYOUT_PACKETS.length, 51);
  assert.equal(CATBOX_ALL_CHOUKAI_URLS.length, 51);

  assert.equal(TRYOUT_N3_PACKETS[0].id, 'n3-1');
  assert.equal(TRYOUT_N3_PACKETS[0].examCode, '2010.07');
  assert.equal(TRYOUT_N3_PACKETS[14].id, 'n3-15');
  assert.equal(TRYOUT_N3_PACKETS[14].examCode, '2018.07');

  assert.equal(TRYOUT_N2_PACKETS[0].id, 'n2-2');
  assert.equal(TRYOUT_N2_PACKETS[0].examCode, '2010.07');
  assert.equal(TRYOUT_N2_PACKETS[0].order, '01');
  assert.equal(TRYOUT_N2_PACKETS[13].id, 'n2-1');
  assert.equal(TRYOUT_N2_PACKETS[13].examCode, '2016.12');
  assert.equal(TRYOUT_N2_PACKETS[13].order, '14');
  assert.equal(TRYOUT_N2_PACKETS[16].id, 'n2-17');
  assert.equal(TRYOUT_N2_PACKETS[16].examCode, '2018.07');
  assert.equal(TRYOUT_N2_PACKETS[16].order, '17');
  assert.equal(TRYOUT_N2_PACKETS[17].id, 'n2-18');
  assert.equal(TRYOUT_N2_PACKETS[17].examCode, '2018.12');
  assert.equal(TRYOUT_N2_PACKETS[17].order, '18');
  assert.equal(TRYOUT_N1_PACKETS[0].id, 'n1-1');
  assert.equal(TRYOUT_N1_PACKETS[0].examCode, '2010.07');
  assert.equal(TRYOUT_N1_PACKETS[17].id, 'n1-18');
  assert.equal(TRYOUT_N1_PACKETS[17].examCode, '2018.12');

  for (let i = 1; i < TRYOUT_N3_PACKETS.length; i += 1) {
    assert.ok(
      TRYOUT_N3_PACKETS[i - 1].examCode < TRYOUT_N3_PACKETS[i].examCode,
      `Expected N3 oldest-first order at index ${i}`,
    );
  }
  for (let i = 1; i < TRYOUT_N2_PACKETS.length; i += 1) {
    assert.ok(
      TRYOUT_N2_PACKETS[i - 1].examCode < TRYOUT_N2_PACKETS[i].examCode,
      `Expected N2 oldest-first order at index ${i}`,
    );
  }
  for (let i = 1; i < TRYOUT_N1_PACKETS.length; i += 1) {
    assert.ok(
      TRYOUT_N1_PACKETS[i - 1].examCode < TRYOUT_N1_PACKETS[i].examCode,
      `Expected N1 oldest-first order at index ${i}`,
    );
  }

  assert.equal(
    new Set(TRYOUT_N3_PACKETS.map((p) => p.audioSrc)).size,
    TRYOUT_N3_PACKETS.length,
  );
  assert.equal(
    new Set(TRYOUT_N2_PACKETS.map((p) => p.audioSrc)).size,
    TRYOUT_N2_PACKETS.length,
  );
  assert.equal(
    new Set(TRYOUT_N1_PACKETS.map((p) => p.audioSrc)).size,
    TRYOUT_N1_PACKETS.length,
  );

  assert.equal(isFirstN2PacketCompleted([]), false);
  assert.equal(isFirstN2PacketCompleted(['moji-bunpou', 'dokkai']), false);
  assert.equal(
    isFirstN2PacketCompleted(['moji-bunpou', 'dokkai', 'choukai']),
    true,
  );

  const unlockedPackets = ALL_TRYOUT_PACKETS.filter((p) =>
    isTryOutPacketUnlocked(p.id, []),
  );
  const lockedPackets = ALL_TRYOUT_PACKETS.filter(
    (p) => !isTryOutPacketUnlocked(p.id, []),
  );
  assert.equal(unlockedPackets.length, 15);
  assert.equal(lockedPackets.length, 36);
  assert.deepEqual(
    unlockedPackets.map((p) => p.id),
    [...VERIFIED_TRYOUT_PACKET_IDS],
  );

  for (const packet of ALL_TRYOUT_PACKETS) {
    const isVerified = isVerifiedTryOutPacket(packet.id);
    assert.equal(packet.hasQuestions, isVerified);
    assert.equal(packet.isFullText, isVerified);
    assert.equal(isTryOutPacketUnlocked(packet.id, []), isVerified);
    assert.equal(
      isTryOutPacketUnlocked(packet.id, ['moji-bunpou', 'dokkai', 'choukai']),
      isVerified,
    );
    assert.ok(packet.yearLabel.length > 0, `Missing yearLabel for ${packet.id}`);
    if (packet.level === 'N3' || packet.level === 'N2') {
      assert.ok(
        packet.audioSrc.startsWith('https://files.catbox.moe/') &&
          packet.audioSrc.endsWith('.mp3'),
        `Expected Catbox direct MP3 URL for ${packet.id}, got ${packet.audioSrc}`,
      );
    } else {
      assert.ok(
        packet.audioSrc.startsWith('https://files.catbox.moe/') &&
          packet.audioSrc.endsWith('.m4a'),
        `Expected Catbox direct M4A URL for ${packet.id}, got ${packet.audioSrc}`,
      );
    }

    const parts = getTryOutPacketParts(packet.id);
    const forms = getTryOutPacketForms(packet.id);
    assert.equal(parts.length, 3);

    if (!isVerified) {
      assert.equal(forms['moji-bunpou'].length, 0);
      assert.equal(forms.dokkai.length, 0);
      assert.equal(forms.choukai.length, 0);
      assert.equal(getTryOutPacketChoukaiTranscript(packet.id).length, 0);
      continue;
    }

    const transcript = getTryOutPacketChoukaiTranscript(packet.id);
    assert.equal(
      transcript.length,
      5,
      `Expected 5 Choukai transcript sections (Mondai 1-5) for ${packet.id}`,
    );

    let totalChoices = 0;
    for (const part of parts) {
      const pages = forms[part.id];
      assert.ok(
        pages.length > 0,
        `Expected non-empty pages for verified packet ${packet.id}/${part.id}`,
      );
      const choices = pages.flatMap((p) =>
        p.items.filter((i) => i.kind === 'choice'),
      );
      assert.equal(
        choices.length,
        part.questionCount,
        `Question count mismatch for ${packet.id}/${part.id}`,
      );
      totalChoices += choices.length;

      for (const page of pages) {
        for (const item of page.items) {
          if (item.kind === 'image') {
            assert.ok(
              item.image.src.startsWith('/assets/tryout/'),
              `Unexpected non-verified image item ${item.id} in packet ${packet.id}`,
            );
          }
          if (item.kind === 'choice') {
            if (item.image !== null) {
              assert.ok(
                item.image.src.startsWith('/assets/tryout/'),
                `Unexpected non-verified choice image for ${packet.id}/${item.id}`,
              );
            }
            assert.ok(
              item.prompt.trim().length > 0,
              `Empty prompt for ${packet.id}/${item.id}`,
            );
            assert.ok(
              item.options.includes(item.correctAnswer),
              `Invalid correctAnswer "${item.correctAnswer}" for ${packet.id}/${part.id}/${item.id}`,
            );
            if (item.optionTexts) {
              assert.equal(
                item.optionTexts.length,
                item.options.length,
                `Option text count mismatch for ${packet.id}/${item.id}`,
              );
            }
            if (
              part.id === 'choukai' &&
              (item.label.includes('問題4') ||
                (packet.level === 'N3' && item.label.includes('問題5')))
            ) {
              assert.deepEqual(
                item.options,
                ['1', '2', '3'],
                `Expected 3 choices for Choukai ${item.label} in ${packet.id}/${item.id}`,
              );
            }
          }
        }
      }
    }
    assert.equal(totalChoices, packet.questionCount);
  }
});

