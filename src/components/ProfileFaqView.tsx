import { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { FAQS } from '../data/utamagoContent';
import { vibrateTap } from '../utils/haptics';

interface ProfileFaqViewProps {
  onBack: () => void;
}

export function ProfileFaqView({ onBack }: ProfileFaqViewProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(
    FAQS[0]?.id ?? null,
  );

  return (
    <div className="space-y-6">
      {/* Sub-page navigation header */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            vibrateTap();
            onBack();
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Kembali ke Profil</span>
        </button>

        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
            FAQ &amp; Bantuan
          </h2>
          <p className="mt-1 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
            Jawaban atas pertanyaan umum seputar cara belajar di UtamaGo!.
          </p>
        </div>
      </div>

      {/* Full original FAQ accordion */}
      <section aria-label="Daftar Pertanyaan Umum">
        <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
          {FAQS.map((item) => {
            const isOpen = openFaqId === item.id;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    vibrateTap();
                    setOpenFaqId(isOpen ? null : item.id);
                  }}
                  className="flex min-h-[54px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface"
                >
                  <span className="font-display text-sm font-semibold leading-snug text-on-surface sm:text-[15px]">
                    {item.question}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-on-surface-variant transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-primary' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm leading-relaxed text-on-surface-variant">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-on-surface-variant">
        *UtamaGo! bukan penyelenggara resmi JLPT. © 2026 UtamaGo!
      </p>
    </div>
  );
}
