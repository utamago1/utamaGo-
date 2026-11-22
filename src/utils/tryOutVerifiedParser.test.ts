import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  getTryOutPacketChoukaiTranscript,
  getTryOutPacketForms,
} from '../data/tryOutN2AllPackets';
import { evaluatePartScore } from './tryOutPacket';
import { parseVerifiedTryOutDocument } from './tryOutVerifiedParser';

test('parseVerifiedTryOutDocument parses all 6 authentic JLPT N2 packets (2010.07-2012.12) with 639 questions, keys, and Choukai transcripts', () => {
  const sourcePath = path.resolve(
    process.cwd(),
    'public/assets/tryout/jlpt_n2_2010_2012_verified.txt',
  );
  const rawText = fs.readFileSync(sourcePath, 'utf8');
  const parsed = parseVerifiedTryOutDocument(rawText);

  assert.equal(parsed.length, 6);

  const expectedSummary = [
    { packetId: 'n2-2', examCode: '2010.07', mb: 54, dk: 21, ck: 32 },
    { packetId: 'n2-3', examCode: '2010.12', mb: 54, dk: 21, ck: 32 },
    { packetId: 'n2-4', examCode: '2011.07', mb: 54, dk: 21, ck: 31 },
    { packetId: 'n2-5', examCode: '2011.12', mb: 54, dk: 21, ck: 31 },
    { packetId: 'n2-6', examCode: '2012.07', mb: 54, dk: 21, ck: 31 },
    { packetId: 'n2-7', examCode: '2012.12', mb: 54, dk: 21, ck: 32 },
  ];

  let grandTotal = 0;

  for (let i = 0; i < expectedSummary.length; i += 1) {
    const exp = expectedSummary[i];
    const pkt = parsed[i];
    assert.equal(pkt.packetId, exp.packetId);
    assert.equal(pkt.examCode, exp.examCode);
    assert.equal(pkt.counts.mojiBunpou, exp.mb);
    assert.equal(pkt.counts.dokkai, exp.dk);
    assert.equal(pkt.counts.choukai, exp.ck);
    assert.equal(pkt.choukaiTranscript.length, 5);

    grandTotal += pkt.counts.total;

    // Verify bundled JSON matches parsed counts & transcript
    const bundledForms = getTryOutPacketForms(exp.packetId);
    const bundledTranscript = getTryOutPacketChoukaiTranscript(exp.packetId);
    assert.equal(bundledTranscript.length, 5);

    const choukaiChoices = bundledForms.choukai.flatMap((p) =>
      p.items.filter((it) => it.kind === 'choice'),
    );
    assert.equal(choukaiChoices.length, exp.ck);

    // Verify Moji-Goi target words are underlined and blank parentheses use (____)
    const emptyParenRe = /[（(][\s\u3000]*[）)]/;
    const mbChoices = bundledForms['moji-bunpou'].flatMap((p) =>
      p.items.filter((it) => it.kind === 'choice'),
    );
    for (const item of mbChoices) {
      assert.equal(
        emptyParenRe.test(item.prompt),
        false,
        `Found unformatted empty parentheses in ${exp.examCode} #${item.number}`,
      );
      if (
        (item.number >= 1 && item.number <= 10) ||
        (item.number >= 23 && item.number <= 27)
      ) {
        assert.match(
          item.prompt,
          /\[\[.+?\]\]/,
          `Expected underlined target kotoba in ${exp.examCode} #${item.number}`,
        );
      }
      if (item.number >= 28 && item.number <= 32) {
        assert.match(item.prompt, /^\[\[.+?\]\]$/);
        for (const opt of item.optionTexts ?? []) {
          assert.match(
            opt,
            /\[\[.+?\]\]/,
            `Expected underlined usage word in ${exp.examCode} #${item.number} option`,
          );
          assert.equal(/\s+文法$/.test(opt), false);
        }
      }
    }

    // Check wrong-answer evaluation carries Choukai transcript for learning
    const firstChoukai = choukaiChoices[0];
    assert.ok(firstChoukai.transcript && firstChoukai.transcript.length > 20);
    const wrongChoice = firstChoukai.options.find(
      (opt) => opt !== firstChoukai.correctAnswer,
    )!;
    const score = evaluatePartScore(bundledForms.choukai, {
      [firstChoukai.id]: wrongChoice,
    });
    const wrongEntry = score.wrongItems.find((w) => w.itemId === firstChoukai.id);
    assert.ok(wrongEntry);
    assert.equal(wrongEntry.transcript, firstChoukai.transcript);
  }

  assert.equal(grandTotal, 639);
});
