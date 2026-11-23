import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildBunpouComparisonGroups,
  buildCrossLevelBunpouComparisonGroups,
  getEntriesForFilterLevel,
  getTopicLevelAvailability,
  resolvePartnerIdOnLeftChange,
  selectDefaultComparisonPair,
  sortComparisonOptionsForPartner,
} from './bunpouComparison.ts';
import { formatBunpouExplanation } from './bunpouExplanationFormatter.ts';
import {
  parseBunpouN1Deck,
  parseBunpouN2Deck,
  parseBunpouN3Deck,
  parseBunpouN4Deck,
  parseBunpouN5Deck,
} from './bunpouN2Parser.ts';
import { auditBunpouTaxonomy } from './bunpouTaxonomy.ts';

function loadFullDecks() {
  const n5Items = parseBunpouN5Deck(
    fs.readFileSync(
      'public/assets/aistudio/Bunpou_N5_Try_0fefe20b.txt',
      'utf8',
    ),
  );
  const n4Items = parseBunpouN4Deck(
    fs.readFileSync(
      'public/assets/aistudio/Bunpou_N4_Shinkanzenmaster_a448db92.txt',
      'utf8',
    ),
  );
  const n3Items = parseBunpouN3Deck(
    fs.readFileSync(
      'public/assets/aistudio/Bunpou_N3_ShinKanzenMaster_c3c47d26.txt',
      'utf8',
    ),
  );
  const n2Items = parseBunpouN2Deck(
    fs.readFileSync(
      'public/assets/aistudio/JLPT_N2_Bunpou_Indonesia.txt',
      'utf8',
    ),
  );
  const n1Items = parseBunpouN1Deck(
    fs.readFileSync(
      'public/assets/aistudio/Bunpou_N1_pelajaran1-20_c990e95d.txt',
      'utf8',
    ),
  );
  return { n5Items, n4Items, n3Items, n2Items, n1Items };
}

test('buildBunpouComparisonGroups builds real multi-topic comparison groups for all 5 JLPT levels', () => {
  const { n5Items, n4Items, n3Items, n2Items, n1Items } = loadFullDecks();
  const n5Groups = buildBunpouComparisonGroups('N5', n5Items);
  const n4Groups = buildBunpouComparisonGroups('N4', n4Items);
  const n3Groups = buildBunpouComparisonGroups('N3', n3Items);
  const n2Groups = buildBunpouComparisonGroups('N2', n2Items);
  const n1Groups = buildBunpouComparisonGroups('N1', n1Items);

  assert.equal(n5Groups.length, 11);
  assert.ok(n4Groups.length >= 30, 'N4 should have rich lesson comparison groups');
  assert.equal(n3Groups.length, 28);
  assert.equal(n2Groups.length, 26);
  assert.equal(n1Groups.length, 20);

  for (const group of [
    ...n5Groups,
    ...n4Groups,
    ...n3Groups,
    ...n2Groups,
    ...n1Groups,
  ]) {
    assert.ok(
      group.entries.length >= 2,
      `Group ${group.id} should have >= 2 patterns`,
    );
    for (const entry of group.entries) {
      assert.ok(entry.pattern.length > 0, `Missing pattern in ${group.id}`);
      assert.ok(entry.meaning.length > 0, `Missing meaning in ${group.id}`);
      assert.ok(entry.nuance.length > 0, `Missing nuance in ${group.id}`);
      assert.ok(
        ['N5', 'N4', 'N3', 'N2', 'N1'].includes(entry.level),
        `Entry ${entry.id} missing valid JLPT level`,
      );
    }
  }
});

test('Taxonomy audit passes with ZERO errors across all 553 N5–N1 patterns and isolates structural base patterns', () => {
  const { n5Items, n4Items, n3Items, n2Items, n1Items } = loadFullDecks();
  const allItems = [
    ...n5Items,
    ...n4Items,
    ...n3Items,
    ...n2Items,
    ...n1Items,
  ];
  assert.equal(allItems.length, 553);

  const crossGroups = buildCrossLevelBunpouComparisonGroups({
    n5Items,
    n4Items,
    n3Items,
    n2Items,
    n1Items,
  });

  const audit = auditBunpouTaxonomy(crossGroups, allItems);
  assert.equal(audit.totalPatterns, 553);
  assert.equal(audit.errorCount, 0, JSON.stringify(audit.issues));
  assert.equal(audit.warningCount, 0, JSON.stringify(audit.issues));
  assert.equal(audit.semanticPatterns + audit.structuralBasePatterns, 553);

  // Explicitly verify N5 Futsuukei (n5-bunpou-40, n5-bunpou-41) is NEVER in Pertentangan
  const pertentangan = crossGroups.find((g) => g.id === 'pertentangan');
  assert.ok(pertentangan, 'Pertentangan topic must exist');
  assert.equal(
    pertentangan.entries.some((e) => e.id === 'n5-bunpou-40' || e.id === 'n5-bunpou-41'),
    false,
    'N5 Bentuk Biasa (Futsuukei) must NEVER enter Pertentangan',
  );

  // Verify N5 Bentuk Biasa lives in isolated structural base category
  const structuralGroup = crossGroups.find(
    (g) => g.id === 'bentuk-dasar-konjugasi',
  );
  assert.ok(structuralGroup);
  assert.equal(structuralGroup.categoryType, 'structural_base');
  assert.ok(structuralGroup.entries.some((e) => e.id === 'n5-bunpou-40'));
  assert.ok(structuralGroup.entries.some((e) => e.id === 'n5-bunpou-41'));
});

test('Dynamic level filtering hides 0-count levels and never forces empty levels into topics', () => {
  const { n5Items, n4Items, n3Items, n2Items, n1Items } = loadFullDecks();
  const crossGroups = buildCrossLevelBunpouComparisonGroups({
    n5Items,
    n4Items,
    n3Items,
    n2Items,
    n1Items,
  });

  const penyesalan = crossGroups.find(
    (g) => g.id === 'penyesalan-emosi' || g.levelCounts.N5 === 0,
  );
  assert.ok(penyesalan, 'Expected at least one semantic topic with 0 N5 patterns');

  const availability = getTopicLevelAvailability(penyesalan);
  const n5Avail = availability.find((a) => a.level === 'N5');
  assert.ok(n5Avail);
  assert.equal(n5Avail.count, 0);
  assert.equal(n5Avail.isAvailable, false);
  assert.equal(n5Avail.canFilterStandalone, false);
  assert.equal(penyesalan.levels.includes('N5'), false);
});

test('Default pairing and Dropdown B relevance sorting enforce anti-duplicate, cross-level ALL mode, and sub-cluster cohesion', () => {
  const { n5Items, n4Items, n3Items, n2Items, n1Items } = loadFullDecks();
  const crossGroups = buildCrossLevelBunpouComparisonGroups({
    n5Items,
    n4Items,
    n3Items,
    n2Items,
    n1Items,
  });

  const pertentangan = crossGroups.find((g) => g.id === 'pertentangan');
  assert.ok(pertentangan);

  // Mode ALL: picks two DIFFERENT levels within same sub-cluster or direct similar
  const allPair = selectDefaultComparisonPair(pertentangan.entries, 'ALL');
  assert.ok(allPair);
  assert.notEqual(allPair[0].id, allPair[1].id);
  assert.notEqual(allPair[0].level, allPair[1].level);
  assert.ok(
    allPair[0].subClusterId === allPair[1].subClusterId ||
      allPair[0].similarPatterns.includes(allPair[1].id),
    'Default ALL pair should be apples-to-apples (same sub-cluster or confusable)',
  );

  // Mode N2: picks two DISTINCT N2 patterns in same sub-cluster
  const n2Entries = getEntriesForFilterLevel(pertentangan, 'N2');
  assert.ok(n2Entries.length >= 2);
  const n2Pair = selectDefaultComparisonPair(n2Entries, 'N2');
  assert.ok(n2Pair);
  assert.equal(n2Pair[0].level, 'N2');
  assert.equal(n2Pair[1].level, 'N2');
  assert.notEqual(n2Pair[0].id, n2Pair[1].id);
  assert.equal(n2Pair[0].subClusterId, n2Pair[1].subClusterId);

  // Dropdown B sorter strictly excludes Pola A and ranks direct_similar / same_sub_cluster first
  const rankedB = sortComparisonOptionsForPartner(
    pertentangan.entries,
    allPair[0],
    'ALL',
  );
  assert.equal(
    rankedB.some((opt) => opt.entry.id === allPair[0].id),
    false,
    'Dropdown B must NEVER contain Pola A',
  );
  assert.ok(
    rankedB[0].tier === 'direct_similar' ||
      rankedB[0].tier === 'same_sub_cluster',
    'Top option in Dropdown B must be direct_similar or same_sub_cluster',
  );

  // Changing Pola A to current Pola B never causes duplicate IDs
  const nextRightId = resolvePartnerIdOnLeftChange(
    pertentangan.entries,
    allPair[1],
    allPair[1].id,
    'ALL',
  );
  assert.ok(nextRightId);
  assert.notEqual(nextRightId, allPair[1].id);
});

test('formatBunpouExplanation converts wall-of-text notes into scannable 3-layer micro-typography', () => {
  const sampleN5 =
    'Dipakai dalam kehidupan sehari-hari sesuai situasi: - Perkenalan: はじめまして。どうぞよろしくおねがいします。 - Terima kasih: ありがとうございます。 - Bacaan khusus: 4円 -> よえん';
  const formatted = formatBunpouExplanation(sampleN5);
  const lines = formatted.split('\n');

  assert.ok(lines.length >= 4, 'Should split intro and 3 bullet items onto separate lines');
  assert.ok(!lines[0].startsWith('- '), 'First line should be concise intro');
  assert.ok(lines[1].startsWith('- **Perkenalan:** '), `Got: ${lines[1]}`);
  assert.ok(lines[1].includes('「はじめまして。どうぞよろしくおねがいします。」'));
  assert.ok(lines[2].startsWith('- **Terima kasih:** '), `Got: ${lines[2]}`);
  assert.ok(lines[3].includes(' → '), 'Arrows must be normalized to spaced →');
  assert.ok(lines[3].includes('「4円」') && lines[3].includes('「よえん」'));
});
