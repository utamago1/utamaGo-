import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { JlptLevel } from '../data/utamagoContent';
import {
  buildCrossLevelBunpouComparisonGroups,
  type BunpouComparisonEntry,
} from '../utils/bunpouComparison';
import {
  filterBunpouN2Items,
  getBunpouGroupsForLevel,
  type BunpouN2GroupFilter,
  type BunpouN2Item,
} from '../utils/bunpouN2Parser';
import { vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  isJlptLevelUnlocked,
  JLPT_LEVELS_ASC,
} from '../utils/levelProgression';
import { HighlightedJapaneseText } from './HighlightedJapaneseText';

interface BunpouSectionProps {
  unlockedLevel: JlptLevel;
  bunpouN5Items: BunpouN2Item[];
  bunpouN4Items: BunpouN2Item[];
  bunpouN3Items: BunpouN2Item[];
  bunpouN2Items: BunpouN2Item[];
  bunpouN1Items: BunpouN2Item[];
  reviewedLessonIds: string[];
  onMarkLessonReviewed?: (lessonId: string) => void;
  onNavigateProfile: () => void;
  mobileDetailOpen: boolean;
  onMobileDetailOpenChange: (open: boolean) => void;
}

type ComparisonLevelFilter = 'ALL' | JlptLevel;

interface BunpouChapterSummary {
  lessonNumber: number;
  title: string;
  shortLabel: string;
  groupId: string;
  items: BunpouN2Item[];
  reviewedCount: number;
  previewPatterns: string[];
}

function formatBunpouLessonLabel(item: BunpouN2Item): string {
  if (item.lessonFullTitle.startsWith('Ringkasan ')) {
    return item.lessonFullTitle.split('·')[0].trim();
  }
  if (item.lessonFullTitle.startsWith('Bab ')) {
    return item.lessonFullTitle.split('·')[0].trim();
  }
  if (item.lessonFullTitle.startsWith('Bag.')) {
    const match = item.lessonFullTitle.match(/^(Bag\.\d+\s*·\s*\d+課)/);
    if (match) return match[1];
  }
  return `${item.lessonNumber}課`;
}

function getLevelTagClasses(level: JlptLevel): string {
  switch (level) {
    case 'N5':
      return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'N4':
      return 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30';
    case 'N3':
      return 'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30';
    case 'N2':
      return 'bg-orange-500/12 text-orange-800 dark:text-orange-300 border-orange-500/30';
    case 'N1':
      return 'bg-primary-container text-on-primary-container border-primary/30';
  }
}

export function BunpouSection({
  unlockedLevel,
  bunpouN5Items,
  bunpouN4Items,
  bunpouN3Items,
  bunpouN2Items,
  bunpouN1Items,
  reviewedLessonIds,
  onMarkLessonReviewed,
  onNavigateProfile,
  mobileDetailOpen,
  onMobileDetailOpenChange,
}: BunpouSectionProps) {
  const detailTopRef = useRef<HTMLDivElement | null>(null);
  const chapterTopRef = useRef<HTMLDivElement | null>(null);

  const [bunpouLevel, setBunpouLevel] = useState<JlptLevel>(unlockedLevel);
  const [groupFilter, setGroupFilter] = useState<BunpouN2GroupFilter>('Semua');
  const [openedLessonNumber, setOpenedLessonNumber] = useState<number | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');

  // Cross-level comparison state
  const [compareLevelFilter, setCompareLevelFilter] =
    useState<ComparisonLevelFilter>('ALL');
  const [compareGroupIndex, setCompareGroupIndex] = useState(0);
  const [compareLeftIndex, setCompareLeftIndex] = useState(0);
  const [compareRightIndex, setCompareRightIndex] = useState(1);

  useEffect(() => {
    if (!filterSheetOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFilterSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filterSheetOpen]);

  const handleSelectLevel = (lvl: JlptLevel) => {
    setBunpouLevel(lvl);
    setQuery('');
    setGroupFilter('Semua');
    setOpenedLessonNumber(null);
    setSelectedId('');
    setFilterSheetOpen(false);
    onMobileDetailOpenChange(false);
  };

  const isReviewed = (id: string) => reviewedLessonIds.includes(id);

  const activeBunpouItems = useMemo(() => {
    if (bunpouLevel === 'N5') return bunpouN5Items;
    if (bunpouLevel === 'N4') return bunpouN4Items;
    if (bunpouLevel === 'N3') return bunpouN3Items;
    if (bunpouLevel === 'N2') return bunpouN2Items;
    return bunpouN1Items;
  }, [
    bunpouLevel,
    bunpouN5Items,
    bunpouN4Items,
    bunpouN3Items,
    bunpouN2Items,
    bunpouN1Items,
  ]);

  const activeBunpouGroups = useMemo(
    () => getBunpouGroupsForLevel(bunpouLevel, activeBunpouItems.length),
    [bunpouLevel, activeBunpouItems.length],
  );

  // Build chapter list for N3, N2, N1 (filtered by groupFilter)
  const chapters = useMemo<BunpouChapterSummary[]>(() => {
    const map = new Map<number, BunpouN2Item[]>();
    for (const item of activeBunpouItems) {
      if (groupFilter !== 'Semua' && item.groupId !== groupFilter) continue;
      const list = map.get(item.lessonNumber);
      if (list) list.push(item);
      else map.set(item.lessonNumber, [item]);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([lessonNumber, items]) => {
        const first = items[0];
        const reviewedCount = items.filter((it) =>
          reviewedLessonIds.includes(it.id),
        ).length;
        return {
          lessonNumber,
          title: first.lessonFullTitle,
          shortLabel: formatBunpouLessonLabel(first),
          groupId: first.groupId,
          items,
          reviewedCount,
          previewPatterns: items.slice(0, 3).map((it) => it.pattern),
        };
      });
  }, [activeBunpouItems, groupFilter, reviewedLessonIds]);

  const activeChapter = useMemo(
    () => chapters.find((ch) => ch.lessonNumber === openedLessonNumber) ?? null,
    [chapters, openedLessonNumber],
  );

  const activeChapterIdx = activeChapter
    ? chapters.findIndex((ch) => ch.lessonNumber === activeChapter.lessonNumber)
    : -1;

  const isSearching = query.trim().length > 0;

  // Items displayed either inside the opened chapter OR across the level when searching
  const displayedItems = useMemo(() => {
    if (isSearching) {
      return filterBunpouN2Items(activeBunpouItems, query, groupFilter, 'all');
    }
    if (activeChapter) {
      return activeChapter.items;
    }
    return [];
  }, [isSearching, activeBunpouItems, query, groupFilter, activeChapter]);

  const activeItem = useMemo(
    () =>
      displayedItems.find((item) => item.id === selectedId) ??
      displayedItems[0] ??
      null,
    [displayedItems, selectedId],
  );

  const activePos = activeItem
    ? displayedItems.findIndex((item) => item.id === activeItem.id)
    : -1;

  const activeGroupLabel = useMemo(
    () => activeBunpouGroups.find((g) => g.id === groupFilter)?.shortLabel ?? '',
    [activeBunpouGroups, groupFilter],
  );

  // Unified cross-level comparison groups across ALL levels (N5–N1)
  const allCrossLevelGroups = useMemo(
    () =>
      buildCrossLevelBunpouComparisonGroups({
        n5Items: bunpouN5Items,
        n4Items: bunpouN4Items,
        n3Items: bunpouN3Items,
        n2Items: bunpouN2Items,
        n1Items: bunpouN1Items,
      }),
    [bunpouN5Items, bunpouN4Items, bunpouN3Items, bunpouN2Items, bunpouN1Items],
  );

  const filteredComparisonGroups = useMemo(() => {
    if (compareLevelFilter === 'ALL') return allCrossLevelGroups;
    return allCrossLevelGroups
      .map((group) => {
        const matchingEntries = group.entries.filter(
          (entry) => entry.level === compareLevelFilter,
        );
        if (matchingEntries.length < 2) return null;
        return {
          ...group,
          levels: [compareLevelFilter] as JlptLevel[],
          entries: matchingEntries,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [allCrossLevelGroups, compareLevelFilter]);

  const safeCompareGroupIdx =
    filteredComparisonGroups.length > 0
      ? Math.min(compareGroupIndex, filteredComparisonGroups.length - 1)
      : 0;
  const activeComparisonGroup =
    filteredComparisonGroups[safeCompareGroupIdx] ?? null;

  const comparisonEntries = activeComparisonGroup?.entries ?? [];
  const safeLeftIdx =
    comparisonEntries.length > 0
      ? Math.min(compareLeftIndex, comparisonEntries.length - 1)
      : 0;
  const safeRightIdx =
    comparisonEntries.length > 1
      ? Math.min(
          compareRightIndex === safeLeftIdx
            ? (safeLeftIdx + 1) % comparisonEntries.length
            : compareRightIndex,
          comparisonEntries.length - 1,
        )
      : 0;

  const leftComparisonEntry: BunpouComparisonEntry | null =
    comparisonEntries[safeLeftIdx] ?? null;
  const rightComparisonEntry: BunpouComparisonEntry | null =
    comparisonEntries[safeRightIdx] ?? null;

  // Pick a cross-level default pair whenever topic changes in ALL mode
  const pickDefaultComparisonPair = (entries: BunpouComparisonEntry[]) => {
    if (entries.length < 2) return [0, 0] as const;
    const firstLevel = entries[0].level;
    const diffLevelIdx = entries.findIndex((e) => e.level !== firstLevel);
    if (diffLevelIdx > 0) {
      return [0, diffLevelIdx] as const;
    }
    return [0, 1] as const;
  };

  // Initialize cross-level pair when groups load or filter changes
  useEffect(() => {
    if (!activeComparisonGroup) return;
    const [l, r] = pickDefaultComparisonPair(activeComparisonGroup.entries);
    setCompareLeftIndex(l);
    setCompareRightIndex(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeComparisonGroup?.id, compareLevelFilter]);

  const selectComparisonGroup = (nextIndex: number) => {
    if (filteredComparisonGroups.length === 0) return;
    vibrateTap();
    const wrapped =
      (nextIndex + filteredComparisonGroups.length) %
      filteredComparisonGroups.length;
    setCompareGroupIndex(wrapped);
    const nextGroup = filteredComparisonGroups[wrapped];
    if (nextGroup) {
      const [l, r] = pickDefaultComparisonPair(nextGroup.entries);
      setCompareLeftIndex(l);
      setCompareRightIndex(r);
    }
  };

  const handleChangeCompareLeft = (nextIdx: number) => {
    vibrateTap();
    if (nextIdx === safeRightIdx) {
      setCompareRightIndex(safeLeftIdx);
    }
    setCompareLeftIndex(nextIdx);
  };

  const handleChangeCompareRight = (nextIdx: number) => {
    vibrateTap();
    if (nextIdx === safeLeftIdx) {
      setCompareLeftIndex(safeRightIdx);
    }
    setCompareRightIndex(nextIdx);
  };

  const openChapter = (lessonNumber: number) => {
    vibrateTap();
    setOpenedLessonNumber(lessonNumber);
    setSelectedId('');
    onMobileDetailOpenChange(false);
    window.requestAnimationFrame(() => {
      chapterTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const closeChapter = () => {
    vibrateTap();
    setOpenedLessonNumber(null);
    setSelectedId('');
    onMobileDetailOpenChange(false);
  };

  const stepChapter = (delta: -1 | 1) => {
    if (chapters.length === 0 || activeChapterIdx < 0) return;
    const nextIdx = activeChapterIdx + delta;
    if (nextIdx < 0 || nextIdx >= chapters.length) return;
    openChapter(chapters[nextIdx].lessonNumber);
  };

  const openItem = (id: string) => {
    vibrateTap();
    setSelectedId(id);
    onMobileDetailOpenChange(true);
    window.requestAnimationFrame(() => {
      detailTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const stepActiveItem = (delta: -1 | 1) => {
    if (displayedItems.length === 0) return;
    vibrateTap();
    const baseIdx = activePos >= 0 ? activePos : 0;
    const nextIdx =
      (baseIdx + delta + displayedItems.length) % displayedItems.length;
    setSelectedId(displayedItems[nextIdx].id);
    window.requestAnimationFrame(() => {
      detailTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const resetSearchAndFilters = () => {
    vibrateTap();
    setQuery('');
    setGroupFilter('Semua');
    setOpenedLessonNumber(null);
    setSelectedId('');
    onMobileDetailOpenChange(false);
  };

  const renderDetailPanel = () => {
    if (!activeItem) return null;
    const reviewed = isReviewed(activeItem.id);

    return (
      <article
        ref={detailTopRef}
        aria-label={`Detail pola ${activeItem.pattern}`}
        className="w-full min-w-0 scroll-mt-20 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant pb-4">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onMobileDetailOpenChange(false);
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm font-medium text-[#4b4b53] transition-colors hover:text-on-surface dark:text-[#b4b4c0] lg:hidden"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Kembali</span>
          </button>

          <div className="min-w-0 text-xs text-on-surface-variant tabular-nums">
            <span className="font-mono font-semibold text-primary">
              No. {activeItem.code}
            </span>
            <span aria-hidden="true" className="mx-1.5 opacity-60">
              ·
            </span>
            <span className="hidden sm:inline">
              {activeItem.lessonFullTitle}
            </span>
            <span className="sm:hidden">
              {formatBunpouLessonLabel(activeItem)}
            </span>
          </div>

          <span className="shrink-0 font-mono text-xs tabular-nums text-on-surface-variant">
            {activePos + 1} / {displayedItems.length}
          </span>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-display text-2xl font-bold leading-snug text-on-surface sm:text-[28px]">
              {activeItem.pattern}
            </h3>
            {(activeItem.romaji || activeItem.register) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-on-surface-variant">
                {activeItem.romaji && <span>{activeItem.romaji}</span>}
                {activeItem.romaji && activeItem.register && (
                  <span aria-hidden="true" className="opacity-50">
                    ·
                  </span>
                )}
                {activeItem.register && (
                  <span className="text-xs font-medium text-warning">
                    {activeItem.register}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-on-surface-variant">Arti</p>
            <p className="text-base font-semibold leading-relaxed text-on-surface sm:text-lg">
              {activeItem.meaning}
            </p>
          </div>

          {activeItem.formula && (
            <div className="space-y-1.5 border-t border-outline-variant pt-5">
              <p className="text-xs font-medium text-on-surface-variant">
                Cara Menyambung
              </p>
              <p className="rounded-xl border border-outline-variant bg-surface px-4 py-3 font-mono text-sm leading-relaxed text-on-surface">
                {activeItem.formula}
              </p>
            </div>
          )}

          {activeItem.note && (
            <div className="space-y-1.5 border-t border-outline-variant pt-5">
              <p className="text-xs font-medium text-on-surface-variant">
                Penjelasan &amp; Nuansa
              </p>
              <p className="text-sm leading-relaxed text-on-surface-variant sm:text-[15px]">
                {activeItem.note}
              </p>
            </div>
          )}

          {activeItem.examples.length > 0 && (
            <div className="space-y-3 border-t border-outline-variant pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-on-surface-variant">
                  Contoh Kalimat
                </p>
                <span className="text-xs text-on-surface-variant/80">
                  Sorotan merah menandai pola
                </span>
              </div>
              <ol className="divide-y divide-outline-variant">
                {activeItem.examples.map((ex, idx) => (
                  <li
                    key={idx}
                    className="space-y-1.5 py-3.5 first:pt-1 last:pb-0"
                  >
                    <HighlightedJapaneseText
                      sentence={ex.jp}
                      target={activeItem.pattern}
                      kind="bunpou"
                      prefix={`${idx + 1}.`}
                      showSpeakButton
                      className="w-full text-[15px] font-medium leading-relaxed text-on-surface"
                    />
                    <p className="pl-5 text-sm leading-relaxed text-on-surface-variant">
                      {ex.id}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="mt-7 space-y-3 border-t border-outline-variant pt-5">
          {onMarkLessonReviewed && (
            <button
              type="button"
              onClick={() => {
                vibrateSuccess();
                onMarkLessonReviewed(activeItem.id);
              }}
              disabled={reviewed}
              className={`inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                reviewed
                  ? 'bg-success-container text-on-success-container'
                  : 'bg-primary text-on-primary hover:bg-primary-hover'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {reviewed ? 'Sudah Dipelajari' : 'Tandai Paham (+5 XP)'}
              </span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => stepActiveItem(-1)}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              onClick={() => stepActiveItem(1)}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface"
            >
              <span>Berikutnya</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderComparisonSection = () => {
    if (!activeComparisonGroup) return null;

    const isCrossLevelPair =
      leftComparisonEntry &&
      rightComparisonEntry &&
      leftComparisonEntry.level !== rightComparisonEntry.level;

    return (
      <section
        aria-label="Komparasi Pola Mirip Semua Level"
        className="w-full min-w-0 border-t border-outline-variant pt-6"
      >
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-on-surface sm:text-lg">
                Komparasi Pola Mirip · Lintas Level (N5–N1)
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
                Bandingkan pola bunpou yang mirip dari semua level (misalnya N3
                dengan N1) lengkap dengan tanda levelnya.
              </p>
            </div>
            <span className="font-mono text-xs tabular-nums text-[#4b4b53] dark:text-[#b4b4c0]">
              Topik {safeCompareGroupIdx + 1} / {filteredComparisonGroups.length}
            </span>
          </div>

          {/* Interactive level filter for comparison */}
          <div
            role="group"
            aria-label="Filter level komparasi"
            className="flex flex-wrap items-center gap-1.5"
          >
            {(['ALL', ...JLPT_LEVELS_ASC] as const).map((lvl) => {
              const active = compareLevelFilter === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    vibrateTap();
                    setCompareLevelFilter(lvl);
                    setCompareGroupIndex(0);
                  }}
                  className={`inline-flex min-h-[36px] items-center justify-center rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                    active
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant bg-surface-container-low text-[#4b4b53] hover:border-outline hover:text-on-surface dark:text-[#b4b4c0]'
                  }`}
                >
                  {lvl === 'ALL' ? 'Semua Level' : lvl}
                </button>
              );
            })}
          </div>

          {/* Topic selector + prev/next buttons */}
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor="bunpou-compare-topic" className="sr-only">
              Pilih topik perbandingan pola mirip
            </label>
            <select
              id="bunpou-compare-topic"
              value={safeCompareGroupIdx}
              onChange={(e) => selectComparisonGroup(Number(e.target.value))}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
            >
              {filteredComparisonGroups.map((group, idx) => (
                <option key={group.id} value={idx}>
                  {group.label} ({group.levels.join('·')} ·{' '}
                  {group.entries.length} pola)
                </option>
              ))}
            </select>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => selectComparisonGroup(safeCompareGroupIdx - 1)}
                aria-label="Topik perbandingan sebelumnya"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low text-on-surface transition-colors hover:border-outline hover:bg-surface"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => selectComparisonGroup(safeCompareGroupIdx + 1)}
                aria-label="Topik perbandingan berikutnya"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low text-on-surface transition-colors hover:border-outline hover:bg-surface"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Clear cross-level indicator when comparing two different JLPT levels */}
          {isCrossLevelPair && leftComparisonEntry && rightComparisonEntry && (
            <p className="text-xs font-medium text-[#4b4b53] dark:text-[#b4b4c0]">
              Perbandingan lintas level:{' '}
              <span className="font-mono font-bold text-on-surface">
                Bunpou {leftComparisonEntry.level}
              </span>{' '}
              vs{' '}
              <span className="font-mono font-bold text-on-surface">
                Bunpou {rightComparisonEntry.level}
              </span>
            </p>
          )}

          {/* Side-by-side comparison container */}
          <div className="grid w-full grid-cols-1 divide-y divide-outline-variant rounded-2xl border border-outline-variant bg-surface-container-low md:grid-cols-[repeat(2,minmax(0,1fr))] md:divide-x md:divide-y-0">
            {(
              [
                {
                  slot: 'Pola A',
                  selectId: 'bunpou-compare-left',
                  selectedIndex: safeLeftIdx,
                  entry: leftComparisonEntry,
                  onChange: handleChangeCompareLeft,
                },
                {
                  slot: 'Pola B',
                  selectId: 'bunpou-compare-right',
                  selectedIndex: safeRightIdx,
                  entry: rightComparisonEntry,
                  onChange: handleChangeCompareRight,
                },
              ] as const
            ).map(({ slot, selectId, selectedIndex, entry, onChange }) => {
              if (!entry) return null;
              return (
                <div key={slot} className="min-w-0 space-y-4 p-4 sm:p-6">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={selectId}
                        className="text-[13px] font-medium text-[#4b4b53] dark:text-[#b4b4c0]"
                      >
                        {slot}
                      </label>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${getLevelTagClasses(entry.level)}`}
                      >
                        Bunpou {entry.level}
                        {entry.lessonLabel ? ` · ${entry.lessonLabel}` : ''}
                      </span>
                    </div>
                    <select
                      id={selectId}
                      value={selectedIndex}
                      onChange={(e) => onChange(Number(e.target.value))}
                      className="min-h-[44px] w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 font-display text-sm font-bold text-on-surface focus:border-primary focus:outline-none"
                    >
                      {comparisonEntries.map((opt, idx) => (
                        <option key={opt.id} value={idx}>
                          [{opt.level}] {opt.pattern}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <h4 className="font-display text-lg font-bold leading-snug text-primary sm:text-xl">
                      {entry.pattern}
                    </h4>
                    {(entry.romaji || entry.register) && (
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {entry.romaji}
                        {entry.romaji && entry.register ? ' · ' : ''}
                        {entry.register && (
                          <span className="font-medium text-warning">
                            {entry.register}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-on-surface-variant">
                      Arti
                    </p>
                    <p className="text-sm font-semibold leading-relaxed text-on-surface">
                      {entry.meaning}
                    </p>
                  </div>

                  {entry.nuance && entry.nuance !== entry.meaning && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-on-surface-variant">
                        Perbedaan Nuansa
                      </p>
                      <p className="text-sm leading-relaxed text-on-surface-variant">
                        {entry.nuance}
                      </p>
                    </div>
                  )}

                  {entry.formula && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-on-surface-variant">
                        Cara Menyambung
                      </p>
                      <p className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-on-surface">
                        {entry.formula}
                      </p>
                    </div>
                  )}

                  {entry.exampleJp && (
                    <div className="space-y-1.5 border-t border-outline-variant pt-3.5">
                      <p className="text-xs font-medium text-on-surface-variant">
                        Contoh Kalimat
                      </p>
                      <HighlightedJapaneseText
                        sentence={entry.exampleJp}
                        target={entry.pattern}
                        kind="bunpou"
                        showSpeakButton
                        className="w-full text-sm font-medium leading-relaxed text-on-surface sm:text-[15px]"
                      />
                      {entry.exampleId && (
                        <p className="text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                          {entry.exampleId}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  return (
    <section aria-label="Materi Bunpou" className="w-full min-w-0 space-y-6">
      {/* Pemilihan level JLPT — Simple Segmented Control */}
      <div
        role="tablist"
        aria-label="Pilih Level JLPT"
        className="grid w-full grid-cols-[repeat(5,minmax(0,1fr))] gap-2 rounded-2xl border border-outline-variant bg-surface-container-low p-1.5"
      >
        {JLPT_LEVELS_ASC.map((lvl) => {
          const selected = bunpouLevel === lvl;
          const unlocked = isJlptLevelUnlocked(lvl, unlockedLevel);
          return (
            <button
              key={lvl}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                vibrateTap();
                handleSelectLevel(lvl);
              }}
              className={`inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 py-2 font-mono text-sm font-semibold transition-colors ${
                selected
                  ? 'bg-primary text-on-primary'
                  : unlocked
                    ? 'text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
                    : 'text-[#4b4b53]/70 hover:text-[#4b4b53] dark:text-[#b4b4c0]/70'
              }`}
            >
              {!unlocked && (
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{lvl}</span>
            </button>
          );
        })}
      </div>

      {/* Content area for selected level */}
      {!isJlptLevelUnlocked(bunpouLevel, unlockedLevel) ? (
        <div className="flex w-full min-w-0 flex-col items-start justify-between gap-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center sm:p-6">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-on-surface">
                Materi Bunpou {bunpouLevel} belum terbuka
              </h3>
            </div>
            <p className="text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
              Level belajar kamu saat ini adalah{' '}
              <strong className="font-semibold text-on-surface">
                JLPT {unlockedLevel}
              </strong>
              . Ubah target level ke{' '}
              <strong className="font-semibold text-on-surface">
                {bunpouLevel}
              </strong>{' '}
              di halaman Profil untuk membuka materi ini.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onNavigateProfile();
            }}
            className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover sm:w-auto"
          >
            Ubah Level di Profil
          </button>
        </div>
      ) : (
        <div ref={chapterTopRef} className="w-full min-w-0 scroll-mt-20 space-y-5">
          {/* Search & Kelompok filter in one clean row */}
          <div
            className={
              mobileDetailOpen
                ? 'hidden min-w-0 space-y-2.5 lg:block'
                : 'min-w-0 space-y-2.5'
            }
          >
            <div className="flex w-full min-w-0 items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <label htmlFor="bunpou-search-input" className="sr-only">
                  Cari pola atau arti tata bahasa
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#4b4b53] dark:text-[#b4b4c0]"
                  aria-hidden="true"
                />
                <input
                  id="bunpou-search-input"
                  type="text"
                  inputMode="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedId('');
                  }}
                  placeholder={`Cari pola Bunpou ${bunpouLevel}...`}
                  className="min-h-[44px] w-full min-w-0 rounded-xl border border-outline-variant bg-surface-container-low py-2.5 pr-9 pl-10 text-sm text-on-surface placeholder:text-[#4b4b53]/80 transition-colors focus:border-primary focus:outline-none dark:placeholder:text-[#b4b4c0]/80"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      setQuery('');
                      setSelectedId('');
                    }}
                    aria-label="Hapus pencarian"
                    className="absolute top-1/2 right-1 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={filterSheetOpen}
                onClick={() => {
                  vibrateTap();
                  setFilterSheetOpen(true);
                }}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                  groupFilter !== 'Semua'
                    ? 'border-primary bg-surface-container-low text-primary'
                    : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-outline'
                }`}
              >
                <SlidersHorizontal
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Bagian{groupFilter !== 'Semua' ? ' (1)' : ''}
                </span>
              </button>
            </div>

            {(groupFilter !== 'Semua' || isSearching) && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                <p className="min-w-0 truncate">
                  {isSearching ? (
                    <>
                      <span className="font-mono font-semibold tabular-nums">
                        {displayedItems.length}
                      </span>{' '}
                      pola ditemukan
                    </>
                  ) : (
                    <>
                      <span className="font-mono font-semibold tabular-nums">
                        {chapters.length}
                      </span>{' '}
                      bab · {activeGroupLabel}
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={resetSearchAndFilters}
                  className="shrink-0 font-semibold text-primary hover:underline"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Primary content: Chapter List first -> Tap Bab -> Bunpou inside Bab */}
          {activeBunpouItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[13px] text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
                Memuat daftar bab Bunpou {bunpouLevel}...
              </p>
            </div>
          ) : !isSearching && !activeChapter ? (
            /* STEP 1: DAFTAR BAB */
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                  Pilih bab untuk membuka pola Bunpou {bunpouLevel} (
                  <span className="font-mono font-semibold tabular-nums">
                    {chapters.length}
                  </span>{' '}
                  bab)
                </p>
              </div>

              <ul
                aria-label={`Daftar Bab Bunpou ${bunpouLevel}`}
                className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low"
              >
                {chapters.map((chapter, idx) => {
                  const allDone =
                    chapter.items.length > 0 &&
                    chapter.reviewedCount === chapter.items.length;
                  return (
                    <li key={chapter.lessonNumber} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openChapter(chapter.lessonNumber)}
                        className="group flex min-h-[76px] w-full min-w-0 items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-surface"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#4b4b53] dark:text-[#b4b4c0]">
                            <span className="font-mono font-semibold text-primary tabular-nums">
                              Bab {idx + 1}
                            </span>
                            <span aria-hidden="true" className="opacity-50">
                              ·
                            </span>
                            <span className="font-mono tabular-nums">
                              {chapter.items.length} pola
                            </span>
                            {chapter.reviewedCount > 0 && (
                              <>
                                <span aria-hidden="true" className="opacity-50">
                                  ·
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 font-medium tabular-nums ${
                                    allDone ? 'text-success' : 'text-on-surface-variant'
                                  }`}
                                >
                                  {allDone && (
                                    <Check
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span>
                                    {allDone
                                      ? 'Selesai'
                                      : `${chapter.reviewedCount}/${chapter.items.length} paham`}
                                  </span>
                                </span>
                              </>
                            )}
                          </div>

                          <p className="font-display text-[15px] font-bold leading-snug text-on-surface sm:text-base">
                            {chapter.title}
                          </p>

                          <p className="truncate text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                            {chapter.previewPatterns.join(' · ')}
                            {chapter.items.length > 3 ? ' …' : ''}
                          </p>
                        </div>

                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-[#4b4b53] transition-transform duration-150 group-hover:translate-x-0.5 dark:text-[#b4b4c0]"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center">
              <p className="text-base font-semibold text-on-surface">
                Pola yang dicari belum ditemukan
              </p>
              <p className="mt-1 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
                Coba kata kunci lain atau kembali ke daftar bab Bunpou{' '}
                {bunpouLevel}.
              </p>
              <button
                type="button"
                onClick={resetSearchAndFilters}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:border-outline"
              >
                Kembali ke Daftar Bab
              </button>
            </div>
          ) : (
            /* STEP 2: BUNPOU DALAM BAB (atau hasil pencarian) */
            <div className="space-y-4">
              {!isSearching && activeChapter && !mobileDetailOpen && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={closeChapter}
                      className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-outline"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Daftar Bab</span>
                    </button>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-on-surface sm:text-base">
                        {activeChapter.title}
                      </p>
                      <p className="text-xs text-[#4b4b53] tabular-nums dark:text-[#b4b4c0]">
                        {activeChapter.items.length} pola ·{' '}
                        {activeChapter.reviewedCount}/{activeChapter.items.length}{' '}
                        paham
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                {/* Grammar list column */}
                <div
                  className={`min-w-0 space-y-3 lg:col-span-5 ${
                    mobileDetailOpen ? 'hidden lg:block' : 'block'
                  }`}
                >
                  <ul
                    aria-label={
                      activeChapter
                        ? `Daftar pola ${activeChapter.title}`
                        : `Hasil pencarian Bunpou ${bunpouLevel}`
                    }
                    className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low lg:max-h-[680px] lg:overflow-y-auto"
                  >
                    {displayedItems.map((item) => {
                      const selected = activeItem?.id === item.id;
                      const reviewed = isReviewed(item.id);
                      return (
                        <li key={item.id} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openItem(item.id)}
                            aria-current={selected ? 'true' : undefined}
                            className={`group flex min-h-[76px] w-full min-w-0 items-center justify-between gap-3 px-4 py-4 text-left transition-colors ${
                              selected
                                ? 'lg:bg-primary-container/25'
                                : 'hover:bg-surface'
                            }`}
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                                <span className="font-mono font-semibold tabular-nums">
                                  {item.code}
                                </span>
                                <span aria-hidden="true" className="opacity-50">
                                  ·
                                </span>
                                <span className="truncate">
                                  {formatBunpouLessonLabel(item)}
                                </span>
                                {reviewed && (
                                  <>
                                    <span
                                      aria-hidden="true"
                                      className="opacity-50"
                                    >
                                      ·
                                    </span>
                                    <span className="inline-flex shrink-0 items-center gap-1 font-medium text-success">
                                      <Check
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                      />
                                      <span>Paham</span>
                                    </span>
                                  </>
                                )}
                              </div>

                              <p
                                className={`truncate font-display text-base font-bold leading-snug sm:text-[17px] ${
                                  selected
                                    ? 'text-on-surface lg:text-primary'
                                    : 'text-on-surface'
                                }`}
                              >
                                {item.pattern}
                              </p>

                              <p className="line-clamp-2 text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
                                {item.meaning}
                              </p>
                            </div>

                            <ChevronRight
                              className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
                                selected
                                  ? 'text-[#4b4b53] dark:text-[#b4b4c0] lg:text-primary'
                                  : 'text-[#4b4b53] dark:text-[#b4b4c0]'
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Prev / Next Bab quick navigation */}
                  {!isSearching && activeChapter && chapters.length > 1 && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={activeChapterIdx <= 0}
                        onClick={() => stepChapter(-1)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:border-outline disabled:opacity-45"
                      >
                        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Bab Sebelumnya</span>
                      </button>
                      <button
                        type="button"
                        disabled={activeChapterIdx >= chapters.length - 1}
                        onClick={() => stepChapter(1)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:border-outline disabled:opacity-45"
                      >
                        <span>Bab Berikutnya</span>
                        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Detail reading column */}
                <div
                  className={`min-w-0 lg:col-span-7 lg:sticky lg:top-6 ${
                    mobileDetailOpen ? 'block' : 'hidden lg:block'
                  }`}
                >
                  {renderDetailPanel()}
                </div>
              </div>
            </div>
          )}

          {/* Komparasi Pola Mirip Lintas Level */}
          {!mobileDetailOpen && renderComparisonSection()}
        </div>
      )}

      {/* Filter Bottom Sheet (Bagian / Kelompok) */}
      {filterSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bunpou-filter-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setFilterSheetOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl border border-outline-variant bg-surface-container-low p-5 pb-safe shadow-xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline sm:hidden"
            />

            <div className="flex items-center justify-between gap-3 border-b border-outline-variant pb-3.5">
              <div>
                <h3
                  id="bunpou-filter-title"
                  className="font-display text-base font-bold text-on-surface"
                >
                  Filter Bagian Bunpou {bunpouLevel}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Pilih kelompok nuansa untuk menyaring daftar bab.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setFilterSheetOpen(false);
                }}
                aria-label="Tutup panel filter"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 max-h-[60vh] space-y-2.5 overflow-y-auto pr-0.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activeBunpouGroups.map((group) => {
                  const active = groupFilter === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        vibrateTap();
                        setGroupFilter(group.id);
                        setOpenedLessonNumber(null);
                        setSelectedId('');
                      }}
                      className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                        active
                          ? 'border-primary bg-primary font-semibold text-on-primary'
                          : 'border-outline-variant bg-surface text-on-surface hover:border-outline'
                      }`}
                    >
                      <span className="truncate">{group.shortLabel}</span>
                      {active && (
                        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2.5 border-t border-outline-variant pt-4">
              {groupFilter !== 'Semua' && (
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setGroupFilter('Semua');
                    setOpenedLessonNumber(null);
                    setSelectedId('');
                  }}
                  className="inline-flex min-h-[46px] items-center justify-center whitespace-nowrap rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:border-outline"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setFilterSheetOpen(false);
                }}
                className="inline-flex min-h-[46px] flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
              >
                Tampilkan {chapters.length} Bab
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
