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

test('all 4 authentic JLPT N2 illustrations exist on disk, attach to the exact questions, and leak no caption lines', () => {
  const expectedChoiceImages = [
    {
      packetId: 'n2-5',
      itemId: 'n2-5-ch-m1-2',
      src: '/assets/tryout/n2-2011-12-choukai-m1-q2.png',
      optionTexts: ['ア', 'イ', 'ウ', 'エ'],
    },
    {
      packetId: 'n2-6',
      itemId: 'n2-6-ch-m1-3',
      src: '/assets/tryout/n2-2012-07-choukai-m1-q3.png',
      optionTexts: ['1', '2', '3', '4'],
    },
    {
      packetId: 'n2-7',
      itemId: 'n2-7-ch-m1-4',
      src: '/assets/tryout/n2-2012-12-choukai-m1-q4.png',
      optionTexts: ['一', '二', '三', '四'],
    },
  ];

  for (const exp of expectedChoiceImages) {
    const filePath = path.resolve(process.cwd(), 'public', exp.src.slice(1));
    assert.equal(fs.existsSync(filePath), true, `Missing asset ${exp.src}`);

    const forms = getTryOutPacketForms(exp.packetId);
    const allChoukaiItems = forms.choukai.flatMap((p) => p.items);
    const target = allChoukaiItems.find(
      (it) => it.kind === 'choice' && it.id === exp.itemId,
    );
    assert.ok(target && target.kind === 'choice', `Missing ${exp.itemId}`);
    assert.equal(target.image?.src, exp.src);
    assert.deepEqual(target.optionTexts, exp.optionTexts);
  }

  // Paket 3 (n2-4, 2011.07) Dokkai Mondai 14 flowchart
  const dokkaiDiagramSrc = '/assets/tryout/n2-2011-07-dokkai-diagram.png';
  assert.equal(
    fs.existsSync(
      path.resolve(process.cwd(), 'public', dokkaiDiagramSrc.slice(1)),
    ),
    true,
  );
  const n24Dokkai = getTryOutPacketForms('n2-4').dokkai;
  const page14 = n24Dokkai.find((p) => p.id === 'n2-4-dk-page-14');
  assert.ok(page14, 'Expected n2-4-dk-page-14');
  const diagramItem = page14.items.find(
    (it) => it.kind === 'image' && it.id === 'n2-4-dk-m14-diagram',
  );
  assert.ok(diagramItem && diagramItem.kind === 'image');
  assert.equal(diagramItem.image.src, dokkaiDiagramSrc);

  // Zero leaked caption strings across all 6 packets
  for (const packetId of ['n2-2', 'n2-3', 'n2-4', 'n2-5', 'n2-6', 'n2-7']) {
    const forms = getTryOutPacketForms(packetId);
    for (const pages of Object.values(forms)) {
      for (const page of pages) {
        for (const item of page.items) {
          const serialized = JSON.stringify({ ...item, image: undefined });
          assert.equal(
            /Ilustrasi Soal|Diagram Alur/i.test(serialized),
            false,
            `Leaked illustration caption in ${packetId}/${item.id}`,
          );
        }
      }
    }
  }
});

