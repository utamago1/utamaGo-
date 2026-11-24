import { useMemo, useState } from 'react';
import { Award, BarChart3, CheckCircle2 } from 'lucide-react';
import { vibrateTap } from '../utils/haptics';
import type {
  EquivalentJlptEstimate,
  TryOutPacketChartPoint,
} from '../utils/tryOutAnalytics';

type ChartMetric = 'overall' | 'moji-bunpou' | 'dokkai' | 'choukai';
type ChartScope = 'all' | 'attempted';
type ChartLevelFilter = 'ALL' | 'N3' | 'N2' | 'N1';

interface TryOutComparisonChartProps {
  series: TryOutPacketChartPoint[];
  equivalentEstimate: EquivalentJlptEstimate;
  activePacketId?: string;
  onSelectPacket?: (packetId: string) => void;
}

const METRIC_LABELS: Array<{ id: ChartMetric; label: string }> = [
  { id: 'overall', label: 'Rata-rata Total' },
  { id: 'moji-bunpou', label: 'Moji-Bunpou' },
  { id: 'dokkai', label: 'Dokkai' },
  { id: 'choukai', label: 'Choukai' },
];

function getMetricValue(
  point: TryOutPacketChartPoint,
  metric: ChartMetric,
): number | null {
  switch (metric) {
    case 'moji-bunpou':
      return point.mojiBunpouScore;
    case 'dokkai':
      return point.dokkaiScore;
    case 'choukai':
      return point.choukaiScore;
    default:
      return point.overallScore;
  }
}

export function TryOutComparisonChart({
  series,
  equivalentEstimate,
  activePacketId,
  onSelectPacket,
}: TryOutComparisonChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('overall');
  const [scope, setScope] = useState<ChartScope>('all');
  const [levelFilter, setLevelFilter] = useState<ChartLevelFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string>(() => {
    const firstAttempted = series.find((s) => s.hasAttempt);
    return activePacketId ?? firstAttempted?.packetId ?? series[0]?.packetId ?? 'n2-2';
  });

  const levelFilteredSeries = useMemo(() => {
    if (levelFilter === 'ALL') return series;
    return series.filter((point) => point.level === levelFilter);
  }, [levelFilter, series]);

  const n3Count = useMemo(
    () => series.filter((p) => p.level === 'N3').length,
    [series],
  );
  const n2Count = useMemo(
    () => series.filter((p) => p.level === 'N2').length,
    [series],
  );
  const n1Count = useMemo(
    () => series.filter((p) => p.level === 'N1').length,
    [series],
  );

  const attemptedPoints = useMemo(
    () => levelFilteredSeries.filter((point) => point.hasAttempt),
    [levelFilteredSeries],
  );

  const visiblePoints = useMemo(() => {
    if (scope === 'attempted' && attemptedPoints.length > 0) {
      return attemptedPoints;
    }
    return levelFilteredSeries;
  }, [attemptedPoints, levelFilteredSeries, scope]);

  const effectiveSelectedPoint = useMemo(() => {
    return (
      visiblePoints.find((p) => p.packetId === selectedId) ??
      visiblePoints[0] ??
      series[0]
    );
  }, [selectedId, series, visiblePoints]);

  const scoredValues = visiblePoints
    .map((p) => getMetricValue(p, metric))
    .filter((v): v is number => v !== null);
  const bestScore = scoredValues.length > 0 ? Math.max(...scoredValues) : null;
  const averageScore =
    scoredValues.length > 0
      ? Math.round(
          scoredValues.reduce((sum, val) => sum + val, 0) / scoredValues.length,
        )
      : null;

  const chartInnerMinWidth =
    visiblePoints.length > 6 ? `${Math.max(540, visiblePoints.length * 52)}px` : undefined;

  return (
    <section
      aria-label="Grafik Perbandingan Hasil Try Out JLPT"
      className="space-y-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5 sm:p-7"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-outline-variant pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Perbandingan Hasil Try Out ({series.length} Paket)</span>
          </p>
          <h3 className="mt-1 font-display text-lg font-extrabold text-on-surface sm:text-xl">
            Grafik Perkembangan Nilai Try Out JLPT
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
            Ketuk batang paket terverifikasi untuk melihat rincian Moji-Bunpou,
            Dokkai, dan Choukai.
          </p>
        </div>

        <div className="border-t border-outline-variant pt-3 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Award className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Estimasi Hasil Try Out</span>
          </div>
          <p className="mt-0.5 font-display text-base font-extrabold text-on-surface">
            {equivalentEstimate.level
              ? `Level kamu setara JLPT ${equivalentEstimate.level}`
              : 'Belum Diuji'}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {equivalentEstimate.summaryText}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Metrik grafik Try Out"
          className="no-scrollbar flex gap-1.5 overflow-x-auto"
        >
          {METRIC_LABELS.map((item) => {
            const active = metric === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  vibrateTap();
                  setMetric(item.id);
                }}
                className={`m3-tactile min-h-[44px] shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-bold ${
                  active
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(n3Count > 0 || n1Count > 0) && (
            <div className="inline-flex shrink-0 rounded-xl bg-surface-container p-1">
              {(
                [
                  { id: 'ALL', label: `Semua (${series.length})` },
                  ...(n3Count > 0 ? [{ id: 'N3' as const, label: `N3 (${n3Count})` }] : []),
                  ...(n2Count > 0 ? [{ id: 'N2' as const, label: `N2 (${n2Count})` }] : []),
                  ...(n1Count > 0 ? [{ id: 'N1' as const, label: `N1 (${n1Count})` }] : []),
                ] as ReadonlyArray<{ id: ChartLevelFilter; label: string }>
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setLevelFilter(lvl.id);
                  }}
                  className={`m3-tactile min-h-[40px] whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold ${
                    levelFilter === lvl.id
                      ? 'bg-surface-container-low text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          )}

          <div className="inline-flex shrink-0 rounded-xl bg-surface-container p-1">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setScope('all');
              }}
              className={`m3-tactile min-h-[40px] whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold ${
                scope === 'all'
                  ? 'bg-surface-container-low text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Semua ({levelFilteredSeries.length})
            </button>
            <button
              type="button"
              disabled={attemptedPoints.length === 0}
              onClick={() => {
                vibrateTap();
                setScope('attempted');
              }}
              className={`m3-tactile min-h-[40px] whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-45 ${
                scope === 'attempted' && attemptedPoints.length > 0
                  ? 'bg-surface-container-low text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Terisi ({attemptedPoints.length})
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
          <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
            <span>
              Rata-rata:{' '}
              <strong className="text-on-surface">
                {averageScore !== null ? `${averageScore}%` : '—'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Tertinggi:{' '}
              <strong className="text-success">
                {bestScore !== null ? `${bestScore}%` : '—'}
              </strong>
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold">
            Target lulus: 60% · Geser horizontal untuk melihat semua paket
          </span>
        </div>

        <div className="no-scrollbar overflow-x-auto pb-2">
          <div
            className={`relative flex h-48 items-end gap-2 px-1 pt-6 ${
              visiblePoints.length > 6 ? '' : 'w-full'
            }`}
            style={chartInnerMinWidth ? { minWidth: chartInnerMinWidth } : undefined}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-success/60"
              style={{ bottom: 'calc(60% * 0.72 + 24px)' }}
            >
              <span className="sticky right-1 float-right -mt-4 font-mono text-[10px] font-bold text-success">
                60%
              </span>
            </div>

            {visiblePoints.map((point) => {
              const score = getMetricValue(point, metric);
              const isSelected =
                effectiveSelectedPoint?.packetId === point.packetId;
              const isActivePacket = activePacketId === point.packetId;
              const barHeightPct =
                score !== null ? Math.max(8, Math.min(100, score)) : 6;

              const barTone =
                score === null
                  ? 'bg-surface-container-high'
                  : score >= 60
                    ? 'bg-success'
                    : score >= 45
                      ? 'bg-warning'
                      : 'bg-primary';

              return (
                <button
                  key={point.packetId}
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setSelectedId(point.packetId);
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${point.title}: ${
                    score !== null ? `${score}%` : 'belum dikerjakan'
                  }`}
                  className={`group flex h-full min-w-[44px] flex-1 flex-col items-center justify-end gap-1.5 rounded-xl px-0.5 py-1 transition-colors ${
                    isSelected
                      ? 'bg-surface-container ring-1 ring-primary/50'
                      : 'hover:bg-surface-container/60'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-bold tabular-nums ${
                      score !== null
                        ? score >= 60
                          ? 'text-success'
                          : 'text-on-surface'
                        : 'text-on-surface-variant/60'
                    }`}
                  >
                    {score !== null ? `${score}%` : '—'}
                  </span>

                  <div className="flex w-full flex-1 items-end justify-center px-1">
                    <div
                      className={`w-full max-w-[26px] rounded-t-md transition-all duration-300 ${barTone} ${
                        isSelected
                          ? 'opacity-100'
                          : 'opacity-85 group-hover:opacity-100'
                      }`}
                      style={{ height: `${barHeightPct}%` }}
                    />
                  </div>

                  <span
                    className={`whitespace-nowrap font-mono text-[11px] font-bold ${
                      isSelected || isActivePacket
                        ? 'text-primary'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {point.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {effectiveSelectedPoint && (
          <div className="flex flex-col justify-between gap-4 border-t border-outline-variant pt-5 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-bold text-primary">
                  Paket {effectiveSelectedPoint.order} ·{' '}
                  {effectiveSelectedPoint.examCode}
                </span>
                {effectiveSelectedPoint.submittedPartsCount >= 3 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Lengkap
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate font-display text-base font-bold text-on-surface">
                {effectiveSelectedPoint.title}
              </p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-on-surface-variant">
                {effectiveSelectedPoint.answeredChoices}/
                {effectiveSelectedPoint.totalChoices} terjawab ·{' '}
                {effectiveSelectedPoint.submittedPartsCount}/3 bagian
                dikumpulkan
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 font-mono text-xs tabular-nums">
              {effectiveSelectedPoint.level === 'N2' &&
                effectiveSelectedPoint.n2TotalScaled !== null && (
                  <div>
                    <p className="text-[11px] text-on-surface-variant">
                      Skor N2
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        effectiveSelectedPoint.n2PassStatus === 'passed'
                          ? 'text-success'
                          : 'text-primary'
                      }`}
                    >
                      {effectiveSelectedPoint.n2TotalScaled}/180
                    </p>
                  </div>
                )}
              <div>
                <p className="text-[11px] text-on-surface-variant">Akurasi</p>
                <p className="text-sm font-bold text-primary">
                  {effectiveSelectedPoint.overallScore !== null
                    ? `${effectiveSelectedPoint.overallScore}%`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-on-surface-variant">Moji/Bun</p>
                <p className="text-sm font-bold text-on-surface">
                  {effectiveSelectedPoint.level === 'N2' &&
                  effectiveSelectedPoint.n2MojiBunpouScaled !== null
                    ? `${effectiveSelectedPoint.n2MojiBunpouScaled}/60`
                    : effectiveSelectedPoint.mojiBunpouScore !== null
                      ? `${effectiveSelectedPoint.mojiBunpouScore}%`
                      : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-on-surface-variant">Dokkai</p>
                <p className="text-sm font-bold text-on-surface">
                  {effectiveSelectedPoint.level === 'N2' &&
                  effectiveSelectedPoint.n2DokkaiScaled !== null
                    ? `${effectiveSelectedPoint.n2DokkaiScaled}/60`
                    : effectiveSelectedPoint.dokkaiScore !== null
                      ? `${effectiveSelectedPoint.dokkaiScore}%`
                      : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-on-surface-variant">Choukai</p>
                <p className="text-sm font-bold text-on-surface">
                  {effectiveSelectedPoint.level === 'N2' &&
                  effectiveSelectedPoint.n2ChoukaiScaled !== null
                    ? `${effectiveSelectedPoint.n2ChoukaiScaled}/60`
                    : effectiveSelectedPoint.choukaiScore !== null
                      ? `${effectiveSelectedPoint.choukaiScore}%`
                      : '—'}
                </p>
              </div>

              {onSelectPacket && effectiveSelectedPoint.hasAttempt && (
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    onSelectPacket(effectiveSelectedPoint.packetId);
                  }}
                  className="m3-tactile min-h-[44px] shrink-0 whitespace-nowrap rounded-xl border border-outline px-3.5 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
                >
                  Buka Paket →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
