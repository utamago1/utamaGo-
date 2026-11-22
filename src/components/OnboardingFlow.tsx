import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, GraduationCap, User } from 'lucide-react';
import { motion } from 'motion/react';
import { BRAND_ASSETS, type JlptLevel } from '../data/utamagoContent';
import { vibrateError, vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  getRankIllustrationPath,
  getStageIdForJlptLevel,
  type LearnerGender,
} from '../utils/levelProgression';

interface OnboardingFlowProps {
  initialName: string;
  initialGender: LearnerGender;
  initialTargetLevel: JlptLevel;
  initialSelfAssessedLevel: JlptLevel;
  initialDailyMinutes: number;
  onComplete: (settings: {
    name: string;
    gender: LearnerGender;
    targetLevel: JlptLevel;
    selfAssessedLevel: JlptLevel;
    dailyMinutes: number;
    enableReminder: boolean;
  }) => void;
}

const LEVEL_OPTIONS: Array<{
  level: JlptLevel;
  label: string;
  desc: string;
}> = [
  { level: 'N5', label: 'N5', desc: 'Dasar' },
  { level: 'N4', label: 'N4', desc: 'Dasar Lanjut' },
  { level: 'N3', label: 'N3', desc: 'Menengah' },
  { level: 'N2', label: 'N2', desc: 'Menengah Atas' },
  { level: 'N1', label: 'N1', desc: 'Mahir' },
];

const GENDER_OPTIONS: Array<{
  id: LearnerGender;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'cowok',
    label: 'Cowok',
    subtitle: 'Maskot ayam ikat kepala',
  },
  {
    id: 'cewek',
    label: 'Cewek',
    subtitle: 'Maskot ayam pita sakura',
  },
];

export function OnboardingFlow({
  initialName,
  initialGender,
  initialSelfAssessedLevel,
  initialDailyMinutes,
  onComplete,
}: OnboardingFlowProps) {
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<LearnerGender>(initialGender);
  const [jlptLevel, setJlptLevel] = useState<JlptLevel>(
    initialSelfAssessedLevel,
  );
  const [nameError, setNameError] = useState<string | null>(null);

  const previewStage = getStageIdForJlptLevel(jlptLevel);
  const mainMascotSrc = getRankIllustrationPath(previewStage, gender);
  const chickMascotSrc = getRankIllustrationPath('CHICK', gender);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanedName = name.trim();
    if (!cleanedName) {
      vibrateError();
      setNameError('Silakan masukkan nama kamu terlebih dahulu.');
      return;
    }

    setNameError(null);
    vibrateSuccess();
    onComplete({
      name: cleanedName,
      gender,
      targetLevel: jlptLevel,
      selfAssessedLevel: jlptLevel,
      dailyMinutes: initialDailyMinutes || 20,
      enableReminder: false,
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-on-surface pt-safe pb-safe pl-safe pr-safe">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pt-5 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-white p-0.5">
            <img
              src={BRAND_ASSETS.logoPath}
              alt="Logo UtamaGo!"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-display text-base font-extrabold tracking-tight text-on-surface">
            Utama<span className="text-primary">Go!</span>
          </span>
        </div>
        <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-bold text-on-surface-variant">
          Data Diri
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-4">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="space-y-6 rounded-3xl border border-outline-variant bg-surface-container-low p-5 shadow-lg sm:p-7"
        >
          <div className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface p-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-white p-1.5 shadow-xs">
              <img
                key={`${previewStage}-${gender}`}
                src={mainMascotSrc}
                alt={`Maskot ayam ${gender} level ${jlptLevel}`}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Lengkapi Data Diri
              </p>
              <h1 className="mt-0.5 font-display text-lg font-extrabold text-on-surface sm:text-xl">
                {name.trim() ? `Halo, ${name.trim()}!` : 'Kenalan Dulu Yuk'}
              </h1>
              <p className="mt-1 text-xs text-on-surface-variant">
                Maskot ayam kamu:{' '}
                <strong className="text-on-surface">
                  {gender === 'cewek' ? 'Cewek' : 'Cowok'} · JLPT {jlptLevel}
                </strong>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="profile-setup-name"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface"
            >
              <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Nama</span>
            </label>
            <input
              id="profile-setup-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="Masukkan nama panggilan atau lengkap"
              maxLength={60}
              className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
            />
            {nameError && (
              <p className="text-xs font-semibold text-primary">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-on-surface">Jenis Kelamin</p>
            <div
              role="radiogroup"
              aria-label="Pilih jenis kelamin"
              className="grid grid-cols-2 gap-3"
            >
              {GENDER_OPTIONS.map((opt) => {
                const selected = gender === opt.id;
                const thumbSrc = getRankIllustrationPath('CHICK', opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      vibrateTap();
                      setGender(opt.id);
                    }}
                    className={`m3-tactile flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-center transition-colors ${
                      selected
                        ? 'border-primary bg-primary-container/40 text-on-surface'
                        : 'border-outline-variant bg-surface text-on-surface hover:border-outline'
                    }`}
                  >
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-white p-1">
                      <img
                        src={thumbSrc}
                        alt={`Gambar ayam ${opt.label}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-display text-sm font-extrabold">
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {opt.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface">
              <GraduationCap
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              <span>Level JLPT</span>
            </p>
            <div
              role="radiogroup"
              aria-label="Pilih level JLPT"
              className="grid grid-cols-5 gap-1.5 rounded-2xl bg-surface-container p-1.5"
            >
              {LEVEL_OPTIONS.map((opt) => {
                const selected = jlptLevel === opt.level;
                return (
                  <button
                    key={opt.level}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      vibrateTap();
                      setJlptLevel(opt.level);
                    }}
                    className={`m3-tactile flex min-h-[54px] flex-col items-center justify-center rounded-xl px-1 py-1.5 transition-colors ${
                      selected
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <span className="font-mono text-xs font-extrabold">
                      {opt.label}
                    </span>
                    <span className="text-[9px] font-medium opacity-85">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="flex items-center gap-2 text-[11px] text-on-surface-variant">
              <img
                src={chickMascotSrc}
                alt="Ikon ayam"
                className="h-5 w-5 rounded bg-white object-contain p-0.5"
              />
              <span>
                Materi &amp; tantangan JLPT {jlptLevel} dan di bawahnya akan
                langsung terbuka.
              </span>
            </p>
          </div>

          <button
            type="submit"
            className="m3-tactile inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-extrabold text-on-primary shadow-sm hover:bg-primary-hover"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>Simpan &amp; Mulai Belajar</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.form>
      </main>
    </div>
  );
}
