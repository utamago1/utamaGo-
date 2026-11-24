import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Target,
} from 'lucide-react';
import { vibrateTap } from '../utils/haptics';
import type {
  JlptWeaknessReport,
  WeaknessActionTarget,
  WeaknessSeverity,
} from '../utils/weaknessDetector';

interface WeaknessDetectorCardProps {
  report: JlptWeaknessReport;
  onExecuteAction: (action: WeaknessActionTarget) => void;
}

function getSeverityMeta(severity: WeaknessSeverity): {
  label: string;
  textClass: string;
} {
  if (severity === 'high') {
    return { label: 'Prioritas Tinggi', textClass: 'text-primary' };
  }
  if (severity === 'medium') {
    return { label: 'Perlu Penguatan', textClass: 'text-warning' };
  }
  return { label: 'Rekomendasi', textClass: 'text-success' };
}

export function WeaknessDetectorCard({
  report,
  onExecuteAction,
}: WeaknessDetectorCardProps) {
  if (report.insights.length === 0) return null;

  return (
    <section
      aria-label="Detektor Kelemahan JLPT dan Rekomendasi Latihan"
      className="w-full min-w-0 space-y-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
            <Target className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Detektor Kelemahan JLPT</span>
          </p>
          <h3 className="mt-0.5 font-display text-[15px] font-extrabold text-on-surface">
            {report.readinessLabel}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
            {report.readinessDetail}
          </p>
        </div>
      </div>

      <div className="divide-y divide-outline-variant border-t border-outline-variant">
        {report.insights.map((insight) => {
          const meta = getSeverityMeta(insight.severity);
          return (
            <div
              key={insight.id}
              className="space-y-2 py-3 first:pt-3 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-bold ${meta.textClass}`}
                >
                  {insight.severity === 'ready' ? (
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <AlertCircle
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span>{meta.label}</span>
                </span>
                <span className="font-mono font-semibold tabular-nums text-on-surface-variant">
                  {insight.metricLabel}
                </span>
              </div>

              <div>
                <p className="font-display text-sm font-bold text-on-surface">
                  {insight.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                  {insight.reason}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  onExecuteAction(insight.action);
                }}
                className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-outline-variant bg-surface px-3.5 py-2 text-xs font-bold text-on-surface transition-colors hover:border-primary/50 hover:text-primary"
              >
                <span>{insight.actionLabel}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
