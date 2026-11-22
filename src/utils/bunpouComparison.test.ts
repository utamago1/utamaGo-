import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildBunpouComparisonGroups,
  buildCrossLevelBunpouComparisonGroups,
} from './bunpouComparison.ts';
import {
  parseBunpouN1Deck,
  parseBunpouN2Deck,
  parseBunpouN3Deck,
  parseBunpouN4Deck,
  parseBunpouN5Deck,
} from './bunpouN2Parser.ts';

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

test('buildCrossLevelBunpouComparisonGroups covers 100% of all 553 N5–N1 patterns with explicit cross-level pairing', () => {
  const { n5Items, n4Items, n3Items, n2Items, n1Items } = loadFullDecks();
  const crossGroups = buildCrossLevelBunpouComparisonGroups({
    n5Items,
    n4Items,
    n3Items,
    n2Items,
    n1Items,
  });

  assert.ok(crossGroups.length >= 15, 'Should have rich cross-level topics');

  const allEntryIds = new Set<string>();
  let multiLevelTopics = 0;
  let hasN3WithN1Topic = false;
  let hasN5WithN4Topic = false;

  for (const group of crossGroups) {
    assert.ok(group.entries.length >= 2);
    if (group.levels.length >= 2) multiLevelTopics += 1;
    if (group.levels.includes('N3') && group.levels.includes('N1')) {
      hasN3WithN1Topic = true;
    }
    if (group.levels.includes('N5') && group.levels.includes('N4')) {
      hasN5WithN4Topic = true;
    }
    for (const entry of group.entries) {
      allEntryIds.add(entry.id);
    }
  }

  assert.ok(multiLevelTopics >= 12, 'Most topics should span multiple JLPT levels');
  assert.ok(hasN3WithN1Topic, 'Should directly compare N3 and N1 patterns in shared topics');
  assert.ok(hasN5WithN4Topic, 'Should directly compare N5 and N4 patterns in shared topics');

  const expectedTotal =
    n5Items.length +
    n4Items.length +
    n3Items.length +
    n2Items.length +
    n1Items.length;
  assert.equal(expectedTotal, 553);

  assert.equal(
    allEntryIds.size,
    expectedTotal,
    'Every single Bunpou pattern from N5–N1 (553) must be included in cross-level comparison',
  );
});
