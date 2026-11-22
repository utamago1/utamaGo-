import { useState } from 'react';
import { BookOpen, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { vibrateTap } from '../utils/haptics';
import type { ChoukaiTranscriptSection } from '../utils/tryOutVerifiedParser';

interface ChoukaiTranscriptPanelProps {
  packetTitle: string;
  sections: ChoukaiTranscriptSection[];
  defaultOpen?: boolean;
}

function renderDialogueLine(line: string) {
  const speakerMatch = line.match(/^(男|女|質問[12]|[A-Z])([：:])(.*)$/);
  if (speakerMatch) {
    return (
      <>
        <span className="font-bold text-primary">
          {speakerMatch[1]}
          {speakerMatch[2]}
        </span>
        <span>{speakerMatch[3]}</span>
      </>
    );
  }
  return line;
}

export function ChoukaiTranscriptPanel({
  packetTitle,
  sections,
  defaultOpen = false,
}: ChoukaiTranscriptPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeMondai, setActiveMondai] = useState<number>(
    sections[0]?.mondaiNumber ?? 1,
  );
  const [showAllKeys, setShowAllKeys] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  if (sections.length === 0) return null;

  const activeSection =
    sections.find((s) => s.mondaiNumber === activeMondai) ?? sections[0];

  const toggleRevealOne = (id: string) => {
    vibrateTap();
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          vibrateTap();
          setIsOpen((prev) => !prev);
        }}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-container/60 sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-extrabold text-on-surface">
              Transkrip Choukai (聴力原文) · Mode Pembelajaran
            </p>
            <p className="truncate text-xs text-on-surface-variant">
              Baca naskah percakapan 問題1–5 {packetTitle} sambil memutar audio
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-on-surface-variant transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-outline-variant p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="Pilih Mondai Transkrip Choukai"
              className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto pb-0.5"
            >
              {sections.map((sec) => {
                const isActive = sec.mondaiNumber === activeSection.mondaiNumber;
                return (
                  <button
                    key={sec.mondaiNumber}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      vibrateTap();
                      setActiveMondai(sec.mondaiNumber);
                    }}
                    className={`m3-tactile min-h-[40px] shrink-0 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container text-on-surface hover:border-outline'
                    }`}
                  >
                    問題{sec.mondaiNumber} ({sec.entries.length})
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setShowAllKeys((prev) => !prev);
              }}
              className="m3-tactile inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container-high"
            >
              {showAllKeys ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sembunyikan Kunci</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tampilkan Kunci</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <p className="font-display text-xs font-extrabold uppercase tracking-wider text-primary">
              {activeSection.title}
            </p>

            {activeSection.entries.map((entry) => {
              const isRevealed = showAllKeys || Boolean(revealedIds[entry.id]);
              const lines = entry.body.split('\n').filter((l) => l.trim().length > 0);
              return (
                <article
                  key={entry.id}
                  className="rounded-xl border border-outline-variant bg-surface-container p-3.5 sm:p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex rounded-lg bg-primary-container px-2 py-0.5 font-mono text-xs font-extrabold text-on-primary-container">
                        {entry.itemNumberLabel}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-on-surface-variant">
                        Soal #{entry.questionNumbers.join(', #')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleRevealOne(entry.id)}
                      className={`m3-tactile inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition-colors ${
                        isRevealed
                          ? 'bg-success-container text-on-success-container'
                          : 'border border-outline bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {isRevealed ? (
                        <span>Kunci: {entry.correctAnswerLabel}</span>
                      ) : (
                        <span>Lihat Kunci</span>
                      )}
                    </button>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-on-surface">
                    {lines.map((line, idx) => (
                      <p key={idx}>{renderDialogueLine(line)}</p>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
