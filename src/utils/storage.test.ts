import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldFireReminderNow } from './notifications';
import {
  ANKI_STORAGE_KEY,
  APP_STATE_STORAGE_KEY,
  clearAllAppStorage,
  GAME_STORAGE_KEY,
  getPacketState,
  loadUnifiedAppState,
  migrateLegacyStorageToV2,
  saveUnifiedAppState,
  STORAGE_SCHEMA_VERSION,
  TRYOUT_PACKET_STORAGE_KEY,
} from './storage';
import { createBackupPayload, EMPTY_ACTIVITY_LOG, parseBackupPayload } from './studyAnalytics';

function installMockWindowStorage() {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
  (globalThis as unknown as { window: { localStorage: typeof mockLocalStorage } }).window = {
    localStorage: mockLocalStorage,
  };
  return store;
}

test('migrateLegacyStorageToV2 preserves existing Anki, Game XP, and Try Out answers', () => {
  const store = installMockWindowStorage();
  store.set(
    ANKI_STORAGE_KEY,
    JSON.stringify({ studiedIds: ['n5-1', 'n5-2'], againIds: ['n5-2'] }),
  );
  store.set(
    GAME_STORAGE_KEY,
    JSON.stringify({
      totalXp: 240,
      completedLevels: {
        'stage-1': { stars: 3, bestAccuracy: 100, xpEarned: 80 },
      },
    }),
  );
  store.set(
    TRYOUT_PACKET_STORAGE_KEY,
    JSON.stringify({
      completedIds: ['dokkai'],
      awardedIds: ['dokkai'],
      submittedIds: ['dokkai'],
      answersByPart: {
        'moji-bunpou': {},
        dokkai: { 'dk-q-1': '2' },
        choukai: {},
      },
    }),
  );

  const migrated = migrateLegacyStorageToV2();
  assert.equal(migrated.schemaVersion, STORAGE_SCHEMA_VERSION);
  assert.equal(migrated.onboarding.completed, true);
  assert.equal(migrated.gameProgress.totalXp, 240);
  assert.deepEqual(migrated.ankiProgress.studiedIds, ['n5-1', 'n5-2']);
  assert.equal(migrated.packetProgress.answersByPart.dokkai['dk-q-1'], '2');
  assert.equal(
    getPacketState(migrated, 'n2-1').packetProgress.answersByPart.dokkai[
      'dk-q-1'
    ],
    '2',
  );
  assert.equal(
    getPacketState(migrated, 'n2-2').packetProgress.completedIds.length,
    0,
  );
  assert.ok(migrated.ankiSrs['n5-2']);
  assert.equal(migrated.ankiSrs['n5-2']?.lapses, 1);

  const loaded = loadUnifiedAppState();
  assert.equal(loaded.gameProgress.totalXp, 240);
  assert.ok(store.has(APP_STATE_STORAGE_KEY));

  loaded.lastTab = 'anki';
  loaded.textScale = 'large';
  loaded.packetsProgress['n2-2'] = {
    packetProgress: {
      completedIds: ['moji-bunpou'],
      awardedIds: ['moji-bunpou'],
      submittedIds: ['moji-bunpou'],
      answersByPart: {
        'moji-bunpou': { 'mb-q-1': '3' },
        dokkai: {},
        choukai: {},
      },
    },
    tryoutTimers: { 'moji-bunpou': 120, dokkai: 0, choukai: 0 },
    tryoutFlaggedIds: { 'moji-bunpou': ['mb-q-2'], dokkai: [], choukai: [] },
    choukaiAudio: { currentTime: 45, playbackRate: 1.1 },
  };
  saveUnifiedAppState(loaded);
  const reloaded = loadUnifiedAppState();
  assert.equal(reloaded.lastTab, 'anki');
  assert.equal(reloaded.textScale, 'large');
  assert.equal(
    getPacketState(reloaded, 'n2-2').packetProgress.answersByPart[
      'moji-bunpou'
    ]['mb-q-1'],
    '3',
  );
  assert.equal(
    getPacketState(reloaded, 'n2-1').packetProgress.answersByPart.dokkai[
      'dk-q-1'
    ],
    '2',
  );

  clearAllAppStorage();
  assert.equal(store.has(APP_STATE_STORAGE_KEY), false);
});

test('backup payload v2 roundtrips full state including SM-2 and onboarding', () => {
  const payload = createBackupPayload({
    version: 2,
    ankiProgress: { studiedIds: ['n5-1'], againIds: [] },
    ankiSrs: {
      'n5-1': {
        repetitions: 2,
        intervalDays: 6,
        easeFactor: 2.5,
        dueDate: '2026-11-25',
        lastReviewedAt: '2026-11-19T10:00:00.000Z',
        lapses: 0,
      },
    },
    onboarding: { completed: true, targetLevel: 'N2', dailyMinutes: 30 },
    gameProgress: { totalXp: 300, completedLevels: {} },
    packetProgress: {
      completedIds: [],
      awardedIds: [],
      submittedIds: [],
      answersByPart: { 'moji-bunpou': {}, dokkai: {}, choukai: {} },
    },
    latestReport: null,
    activityLog: EMPTY_ACTIVITY_LOG,
    choukaiAudio: { currentTime: 124, playbackRate: 1.1 },
    packetsProgress: {
      'n2-3': {
        packetProgress: {
          completedIds: ['choukai'],
          awardedIds: ['choukai'],
          submittedIds: ['choukai'],
          answersByPart: {
            'moji-bunpou': {},
            dokkai: {},
            choukai: { 'ck-q-1': '4' },
          },
        },
        tryoutTimers: { 'moji-bunpou': 0, dokkai: 0, choukai: 300 },
        tryoutFlaggedIds: { 'moji-bunpou': [], dokkai: [], choukai: [] },
        choukaiAudio: { currentTime: 88, playbackRate: 1.25 },
      },
    },
    reminder: { enabled: true, hour: 19, minute: 30, lastNotifiedDate: null },
  });

  const parsed = parseBackupPayload(JSON.stringify(payload));
  assert.ok(parsed);
  assert.equal(parsed.version, 2);
  assert.equal(parsed.onboarding?.targetLevel, 'N2');
  assert.equal(parsed.choukaiAudio?.currentTime, 124);
  assert.equal(parsed.ankiSrs?.['n5-1']?.intervalDays, 6);
  assert.equal(
    parsed.packetsProgress?.['n2-3']?.packetProgress.answersByPart.choukai[
      'ck-q-1'
    ],
    '4',
  );
});

test('shouldFireReminderNow evaluates scheduled time and daily deduplication', () => {
  const config = {
    enabled: true,
    hour: 19,
    minute: 0,
    lastNotifiedDate: null as string | null,
  };

  assert.equal(
    shouldFireReminderNow(config, new Date(2026, 10, 19, 18, 59), '2026-11-19'),
    false,
  );
  assert.equal(
    shouldFireReminderNow(config, new Date(2026, 10, 19, 19, 5), '2026-11-19'),
    true,
  );
  assert.equal(
    shouldFireReminderNow(
      { ...config, lastNotifiedDate: '2026-11-19' },
      new Date(2026, 10, 19, 20, 0),
      '2026-11-19',
    ),
    false,
  );
});
