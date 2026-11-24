import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countSavedStudyItems,
  extractNotesMapById,
  extractSavedItemIdSet,
  filterSavedItemsById,
  getStudyNoteEntry,
  getStudyNoteScopeForCardKind,
  isStudyItemSaved,
  makeStudyNoteKey,
  normalizeStudyNoteText,
  resetStudyNotesMemoryCache,
  sanitizeStudyNotesStore,
  STUDY_NOTE_MAX_LENGTH,
} from './studyNotes';

test('makeStudyNoteKey namespaces bunpou and vocab scopes cleanly', () => {
  assert.equal(makeStudyNoteKey('bunpou', ' n2-14 '), 'bunpou:n2-14');
  assert.equal(makeStudyNoteKey('vocab', 'n5-001'), 'vocab:n5-001');
});

test('normalizeStudyNoteText trims whitespace and enforces max length', () => {
  assert.equal(normalizeStudyNoteText('  Beda dengan ～わけだ  '), 'Beda dengan ～わけだ');
  const oversized = 'あ'.repeat(STUDY_NOTE_MAX_LENGTH + 40);
  assert.equal(normalizeStudyNoteText(oversized).length, STUDY_NOTE_MAX_LENGTH);
});

test('sanitizeStudyNotesStore keeps valid entries and drops invalid or empty ones', () => {
  const sanitized = sanitizeStudyNotesStore({
    'bunpou:n2-1': { bookmarked: true, note: '  formal  ', updatedAt: 1000 },
    'vocab:v-9': { bookmarked: false, note: 'sering muncul di N3', updatedAt: 2000 },
    'bunpou:empty': { bookmarked: false, note: '   ', updatedAt: 3000 },
    'invalid:key': { bookmarked: true, note: 'ignored', updatedAt: 4000 },
  });

  assert.equal(Object.keys(sanitized).length, 2);
  assert.deepEqual(sanitized['bunpou:n2-1'], {
    bookmarked: true,
    note: 'formal',
    updatedAt: 1000,
  });
  assert.equal(sanitized['bunpou:empty'], undefined);
  assert.equal(sanitized['invalid:key'], undefined);
});

test('saved queries, counts, and notes extraction work per scope', () => {
  resetStudyNotesMemoryCache();
  const store = sanitizeStudyNotesStore({
    'bunpou:n5-1': { bookmarked: true, note: '', updatedAt: 10 },
    'bunpou:n5-2': { bookmarked: false, note: 'untuk kalimat negatif', updatedAt: 20 },
    'vocab:v-1': { bookmarked: true, note: 'inget kanji air', updatedAt: 30 },
  });

  assert.equal(isStudyItemSaved(store, 'bunpou', 'n5-1'), true);
  assert.equal(isStudyItemSaved(store, 'bunpou', 'n5-2'), true);
  assert.equal(isStudyItemSaved(store, 'bunpou', 'n5-99'), false);
  assert.equal(countSavedStudyItems(store, 'bunpou'), 2);
  assert.equal(countSavedStudyItems(store, 'bunpou', ['n5-1', 'n5-99']), 1);
  assert.equal(countSavedStudyItems(store, 'vocab'), 1);

  const savedVocab = extractSavedItemIdSet(store, 'vocab');
  assert.equal(savedVocab.has('v-1'), true);
  assert.equal(savedVocab.has('n5-1'), false);

  const vocabNotes = extractNotesMapById(store, 'vocab');
  assert.equal(vocabNotes['v-1'], 'inget kanji air');
  assert.equal(getStudyNoteEntry(store, 'vocab', 'missing').note, '');
});

test('getStudyNoteScopeForCardKind and filterSavedItemsById unify Anki and Materi favorites', () => {
  assert.equal(getStudyNoteScopeForCardKind('bunpou'), 'bunpou');
  assert.equal(getStudyNoteScopeForCardKind('vocab'), 'vocab');
  assert.equal(getStudyNoteScopeForCardKind(undefined), 'vocab');

  const store = sanitizeStudyNotesStore({
    'bunpou:n2-bunpou-1-1': { bookmarked: true, note: '', updatedAt: 10 },
    'vocab:n5-word-2': { bookmarked: true, note: 'penting', updatedAt: 20 },
  });

  const bunpouCards = [
    { id: 'n2-bunpou-1-1', word: '～わけではない' },
    { id: 'n2-bunpou-1-2', word: '～とは限らない' },
  ];
  const vocabCards = [
    { id: 'n5-word-1', word: '水' },
    { id: 'n5-word-2', word: '火' },
  ];

  assert.deepEqual(
    filterSavedItemsById(bunpouCards, store, 'bunpou').map((c) => c.id),
    ['n2-bunpou-1-1'],
  );
  assert.deepEqual(
    filterSavedItemsById(vocabCards, store, 'vocab').map((c) => c.id),
    ['n5-word-2'],
  );
});
