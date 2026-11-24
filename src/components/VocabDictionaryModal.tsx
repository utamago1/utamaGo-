import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  PenTool,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import type { AnkiCard } from '../utils/ankiParser';
import type { AnkiSrsMap } from '../utils/ankiSrs';
import { vibrateTap } from '../utils/haptics';
import {
  isJapaneseSpeechSupported,
  speakJapanese,
} from '../utils/japaneseSpeech';
import {
  searchDictionaryCards,
  type DictionaryCardStatus,
  type DictionaryLevelFilter,
  type DictionaryStatusFilter,
} from '../utils/practiceGenerators';
import {
  extractNotesMapById,
  extractSavedItemIdSet,
  getStudyNoteEntry,
  loadStudyNotes,
  saveStudyNoteText,
  subscribeStudyNotes,
  toggleStudyBookmark,
  type StudyNotesStore,
} from '../utils/studyNotes';
import { extractKanjiCharacters } from '../utils/writingPractice';
import { HighlightedJapaneseText } from './HighlightedJapaneseText';
import { SpeechControlBar } from './SpeechControlBar';
import { StudyNotePanel } from './StudyNotePanel';

interface VocabDictionaryModalProps {
  open: boolean;
  cards: readonly AnkiCard[];
  ankiSrs: AnkiSrsMap;
  againIds: readonly string[];
  onToggleDifficultCard: (cardId: string) => void;
  onOpenWritingForWord?: (word: string) => void;
  onClose: () => void;
}

const LEVEL_FILTERS: ReadonlyArray<{ id: DictionaryLevelFilter; label: string }> = [
  { id: 'ALL', label: 'Semua' },
  { id: 'N5', label: 'N5' },
  { id: 'N4', label: 'N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
  { id: 'N1', label: 'N1' },
];

const STATUS_FILTERS: ReadonlyArray<{
  id: DictionaryStatusFilter;
  label: string;
}> = [
  { id: 'ALL', label: 'Semua Status' },
  { id: 'SAVED', label: 'Favorit' },
  { id: 'DIFFICULT', label: 'Kata Sulit' },
  { id: 'LEARNED', label: 'Sudah Dipelajari' },
];

const PAGE_SIZE = 30;

function formatStatusLabel(status: DictionaryCardStatus): {
  text: string;
  toneClass: string;
} {
  switch (status) {
    case 'difficult':
      return { text: 'Kata Sulit', toneClass: 'text-primary font-semibold' };
    case 'mastered':
      return { text: 'Hafal', toneClass: 'text-success font-semibold' };
    case 'learning':
      return { text: 'Dipelajari', toneClass: 'text-on-surface font-medium' };
    case 'new':
    default:
      return { text: 'Belum dipelajari', toneClass: 'text-on-surface-variant' };
  }
}

export function VocabDictionaryModal({
  open,
  cards,
  ankiSrs,
  againIds,
  onToggleDifficultCard,
  onOpenWritingForWord,
  onClose,
}: VocabDictionaryModalProps) {
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<DictionaryLevelFilter>('ALL');
  const [statusFilter, setStatusFilter] =
    useState<DictionaryStatusFilter>('ALL');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studyNotes, setStudyNotes] = useState<StudyNotesStore>(() =>
    loadStudyNotes(),
  );

  useEffect(() => {
    return subscribeStudyNotes(setStudyNotes);
  }, []);

  const speechSupported = useMemo(() => isJapaneseSpeechSupported(), []);

  const savedVocabIds = useMemo(
    () => extractSavedItemIdSet(studyNotes, 'vocab'),
    [studyNotes],
  );
  const vocabNotesById = useMemo(
    () => extractNotesMapById(studyNotes, 'vocab'),
    [studyNotes],
  );

  const results = useMemo(
    () =>
      searchDictionaryCards({
        cards,
        query,
        level: levelFilter,
        status: statusFilter,
        ankiSrs,
        againIds,
        savedIds: savedVocabIds,
        notesById: vocabNotesById,
      }),
    [
      cards,
      query,
      levelFilter,
      statusFilter,
      ankiSrs,
      againIds,
      savedVocabIds,
      vocabNotesById,
    ],
  );

  if (!open) return null;

  const displayedResults = results.slice(0, visibleCount);
  const remainingCount = Math.max(0, results.length - displayedResults.length);

  const handleResetFilters = () => {
    vibrateTap();
    setQuery('');
    setLevelFilter('ALL');
    setStatusFilter('ALL');
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kamus Kosakata JLPT N5 sampai N1"
      className="fixed inset-0 z-50 flex flex-col bg-surface text-on-surface"
    >
      {/* Sticky top search & filter header */}
      <header className="shrink-0 border-b border-outline-variant bg-surface-container-low pt-safe pl-safe pr-safe">
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  onClose();
                }}
                aria-label="Tutup kamus kosakata"
                className="m3-tactile inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface text-on-surface hover:bg-surface-container"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-extrabold tracking-tight text-on-surface">
                  Kamus Kosakata N5–N1
                </h2>
                <p className="text-xs text-on-surface-variant">
                  <span className="font-mono font-semibold tabular-nums text-on-surface">
                    {results.length.toLocaleString('id-ID')}
                  </span>{' '}
                  dari{' '}
                  <span className="font-mono tabular-nums">
                    {cards.length.toLocaleString('id-ID')}
                  </span>{' '}
                  kosakata
                </p>
              </div>
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Cari Kanji, Hiragana, Romaji, atau arti..."
              aria-label="Cari kosakata"
              className="min-h-[44px] w-full rounded-xl border border-outline-variant bg-surface py-2 pr-10 pl-10 text-sm text-on-surface placeholder:text-on-surface-variant/75 focus:border-primary focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-label="Hapus kata pencarian"
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Compact Level + Status filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Filter level JLPT"
              className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
            >
              {LEVEL_FILTERS.map((lv) => {
                const active = levelFilter === lv.id;
                return (
                  <button
                    key={lv.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      vibrateTap();
                      setLevelFilter(lv.id);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className={`min-h-[36px] shrink-0 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface'
                    }`}
                  >
                    {lv.label}
                  </button>
                );
              })}
            </div>

            <div
              role="group"
              aria-label="Filter status belajar"
              className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
            >
              {STATUS_FILTERS.map((st) => {
                const active = statusFilter === st.id;
                const savedSuffix =
                  st.id === 'SAVED' && savedVocabIds.size > 0
                    ? ` (${savedVocabIds.size})`
                    : '';
                return (
                  <button
                    key={st.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      vibrateTap();
                      setStatusFilter(st.id);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className={`min-h-[36px] shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface'
                    }`}
                  >
                    {st.label}
                    {savedSuffix}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable Results List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center">
              <p className="font-display text-base font-bold text-on-surface">
                Kosakata tidak ditemukan
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Coba kata kunci lain atau ubah filter level/status.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="m3-tactile mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-outline bg-surface px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
                {displayedResults.map((item) => {
                  const { card, level, status, isDifficult } = item;
                  const isExpanded = expandedId === card.id;
                  const statusMeta = formatStatusLabel(status);
                  const noteEntry = getStudyNoteEntry(
                    studyNotes,
                    'vocab',
                    card.id,
                  );

                  return (
                    <li key={card.id} className="min-w-0">
                      <div className="flex items-start justify-between gap-2 px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            vibrateTap();
                            setExpandedId(isExpanded ? null : card.id);
                          }}
                          aria-expanded={isExpanded}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-display text-base font-bold text-on-surface break-words">
                              {card.word}
                            </span>
                            {card.furigana && card.furigana !== card.word && (
                              <span className="text-[13px] text-on-surface-variant">
                                {card.furigana}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm leading-snug text-on-surface-variant break-words">
                            {card.meaning}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            <span className="font-mono font-semibold text-primary">
                              {level}
                            </span>
                            {card.partOfSpeech ? ` · ${card.partOfSpeech}` : ''}
                            {' · '}
                            <span className={statusMeta.toneClass}>
                              {statusMeta.text}
                            </span>
                          </p>
                          {!isExpanded && noteEntry.note.length > 0 && (
                            <p className="mt-1.5 truncate border-l-2 border-amber-500 pl-2 text-xs text-amber-900/90">
                              {noteEntry.note}
                            </p>
                          )}
                        </button>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              vibrateTap();
                              toggleStudyBookmark('vocab', card.id);
                            }}
                            aria-pressed={noteEntry.bookmarked}
                            aria-label={
                              noteEntry.bookmarked
                                ? `Hapus bookmark ${card.word}`
                                : `Simpan bookmark ${card.word}`
                            }
                            className={`m3-tactile inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                              noteEntry.bookmarked
                                ? 'bg-amber-50 text-amber-600'
                                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                            }`}
                          >
                            <Bookmark
                              className={`h-4 w-4 ${
                                noteEntry.bookmarked ? 'fill-amber-500' : ''
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                          {speechSupported && (
                            <button
                              type="button"
                              onClick={() => {
                                vibrateTap();
                                speakJapanese(card.word || card.furigana || '');
                              }}
                              aria-label={`Dengarkan pelafalan ${card.word}`}
                              className="m3-tactile inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-primary hover:opacity-90"
                            >
                              <Volume2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              vibrateTap();
                              setExpandedId(isExpanded ? null : card.id);
                            }}
                            aria-label={
                              isExpanded
                                ? `Tutup detail ${card.word}`
                                : `Buka detail ${card.word}`
                            }
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ChevronDown
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-3 border-t border-outline-variant/70 bg-surface px-4 py-3.5">
                          {card.romaji && (
                            <p className="text-xs text-on-surface-variant">
                              Romaji:{' '}
                              <span className="font-mono font-medium text-on-surface">
                                {card.romaji}
                              </span>
                            </p>
                          )}

                          {card.examples.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-on-surface-variant">
                                Contoh Kalimat
                              </p>
                              {card.examples.slice(0, 2).map((ex, idx) => (
                                <div
                                  key={`${card.id}-ex-${idx}`}
                                  className="rounded-xl border border-outline-variant bg-surface-container-low p-3"
                                >
                                  <div className="text-sm leading-relaxed text-on-surface">
                                    <HighlightedJapaneseText
                                      sentence={ex.jp}
                                      target={card.word}
                                      readingTerm={card.readingTerm}
                                      kind="vocab"
                                      showSpeakButton
                                    />
                                  </div>
                                  {ex.id && (
                                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                                      {ex.id}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <SpeechControlBar
                            text={card.word || card.furigana || ''}
                            compact
                            showQuickSettings
                          />

                          <StudyNotePanel
                            itemId={card.id}
                            entry={noteEntry}
                            compact
                            onToggleBookmark={() =>
                              toggleStudyBookmark('vocab', card.id)
                            }
                            onSaveNote={(noteText) =>
                              saveStudyNoteText('vocab', card.id, noteText)
                            }
                            placeholder="Tulis catatan arti, pasangan kata, atau cara mengingat kanji ini..."
                          />

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                vibrateTap();
                                onToggleDifficultCard(card.id);
                              }}
                              className={`m3-tactile inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-colors sm:flex-none ${
                                isDifficult
                                  ? 'border-primary/40 bg-primary-container text-on-primary-container hover:opacity-90'
                                  : 'border-outline bg-surface-container-low text-on-surface hover:bg-surface-container'
                              }`}
                            >
                              {isDifficult ? (
                                <>
                                  <BookmarkCheck
                                    className="h-4 w-4 text-primary"
                                    aria-hidden="true"
                                  />
                                  <span>Hapus dari Kata Sulit</span>
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus
                                    className="h-4 w-4 text-primary"
                                    aria-hidden="true"
                                  />
                                  <span>Tandai ke Kata Sulit</span>
                                </>
                              )}
                            </button>

                            {onOpenWritingForWord &&
                              extractKanjiCharacters(card.word).length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    vibrateTap();
                                    onOpenWritingForWord(card.word);
                                  }}
                                  className="m3-tactile inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-outline bg-surface-container-low px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container sm:flex-none"
                                >
                                  <PenTool
                                    className="h-4 w-4 text-primary"
                                    aria-hidden="true"
                                  />
                                  <span>Latih Tulis Kanji</span>
                                </button>
                              )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {remainingCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setVisibleCount((prev) => prev + PAGE_SIZE);
                  }}
                  className="m3-tactile flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-outline bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-container"
                >
                  Muat {Math.min(PAGE_SIZE, remainingCount)} Berikutnya (
                  {remainingCount.toLocaleString('id-ID')} tersisa)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
