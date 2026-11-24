import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import type { JlptLevel } from '../data/utamagoContent';
import { vibrateTap } from '../utils/haptics';
import {
  resolveNextJlptExam,
  type JlptExamSessionPreference,
} from '../utils/jlptCountdown';

interface JlptCountdownCardProps {
  targetLevel: JlptLevel;
  dailyMinutes: number;
  sessionPreference: JlptExamSessionPreference;
  onChangeSessionPreference: (next: JlptExamSessionPreference) => void;
}

const SESSION_OPTIONS: ReadonlyArray<{
  id: JlptExamSessionPreference;
  label: string;
}> = [
  { id: 'auto', label: 'Terdekat' },
  { id: 'july', label: 'Juli' },
  { id: 'december', label: 'Desember' },
];

export function JlptCountdownCard({
  targetLevel,
  dailyMinutes,
  sessionPreference,
  onChangeSessionPreference,
}: JlptCountdownCardProps) {
  const countdown = useMemo(
    () => resolveNextJlptExam(sessionPreference, dailyMinutes),
    [sessionPreference, dailyMinutes],
  );

  return (
    <section
      aria-label="Hitung Mundur Ujian JLPT"
      className="w-full min-w-0 space-y-3.5 rounded-2xl border border-outline-variant bg-surface-container-low p-4"
    >
      {/* Row 1: Single-line title & target level */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-bold text-on-surface">
          <CalendarDays
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="truncate">Hitung mundur JLPT</span>
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-xs font-bold text-primary">
          Target {targetLevel}
        </span>
      </div>

      {/* Row 2: Balanced metric + exam date & study estimate */}
      <div className="flex items-center gap-3.5">
        <div className="shrink-0">
          <p className="font-mono text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-on-surface sm:text-3xl">
            {countdown.isExamDay ? 'Hari H' : `H-${countdown.daysRemaining}`}
          </p>
          <p className="mt-1 text-xs font-medium text-[#4b4b53] dark:text-[#b4b4c0]">
            {countdown.isExamDay
              ? 'Hari ujian'
              : countdown.weeksRemaining >= 2
                ? `${countdown.weeksRemaining} minggu lagi`
                : `${countdown.daysRemaining} hari lagi`}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="h-10 w-px shrink-0 bg-outline-variant"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-bold leading-snug text-on-surface">
            {countdown.formattedDateId}
          </p>
          <p className="text-xs leading-snug text-[#4b4b53] dark:text-[#b4b4c0]">
            {countdown.isExamDay ? (
              'Semoga lancar mengerjakan ujian hari ini!'
            ) : countdown.estimatedTotalHours > 0 ? (
              <>
                Est.{' '}
                <span className="font-mono font-semibold tabular-nums text-on-surface">
                  ~{countdown.estimatedTotalHours} jam
                </span>{' '}
                latihan ({dailyMinutes} mnt/hari)
              </>
            ) : (
              <>Target rutin {dailyMinutes} menit/hari</>
            )}
          </p>
        </div>
      </div>

      {/* Row 3: Full-width segmented session selector */}
      <div
        role="radiogroup"
        aria-label="Pilih periode ujian JLPT"
        className="grid w-full grid-cols-3 gap-1 rounded-xl bg-surface-container p-1"
      >
        {SESSION_OPTIONS.map((opt) => {
          const active = sessionPreference === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                vibrateTap();
                onChangeSessionPreference(opt.id);
              }}
              className={`m3-tactile min-h-[38px] whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? 'bg-surface-container-low text-on-surface shadow-xs'
                  : 'text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
