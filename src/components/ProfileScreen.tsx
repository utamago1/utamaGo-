import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Globe,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  MessageSquarePlus,
  Star,
  Zap,
} from 'lucide-react';
import { CHALLENGE_STAGES } from '../data/challengeLevels';
import { FAQS } from '../data/utamagoContent';
import { useLanguage, type AppLanguage } from '../i18n/LanguageContext';
import { vibrateTap } from '../utils/haptics';
import {
  getRankIllustrationPath,
  isJlptLevelUnlocked,
  JLPT_LEVELS_ASC,
  type LearnerGender,
  type LevelProgressInfo,
} from '../utils/levelProgression';
import type { MascotExpression } from '../utils/mascotAssets';
import type { OnboardingSettings } from '../utils/storage';
import {
  getDailyStreak,
  type StudyActivityLog,
} from '../utils/studyAnalytics';
import type { EquivalentJlptEstimate } from '../utils/tryOutAnalytics';
import { MascotAvatar } from './MascotAvatar';
import { ProfileAboutView } from './ProfileAboutView';
import { ProfileFaqView } from './ProfileFaqView';

type ProfileSubView = 'overview' | 'about' | 'faq';

interface ProfileScreenProps {
  levelProgress: LevelProgressInfo;
  totalStars: number;
  completedStagesCount: number;
  studiedAnkiCount: number;
  dueAnkiCount: number;
  totalAnkiDeckCount: number;
  activityLog: StudyActivityLog;
  equivalentEstimate: EquivalentJlptEstimate;
  onboarding: OnboardingSettings;
  account?: {
    username: string;
    email: string;
  } | null;
  onUpdateOnboarding: (next: Partial<OnboardingSettings>) => void;
  onNavigateTryOut: () => void;
  onOpenSettings: () => void;
  onOpenFeedback?: () => void;
  onLogout?: () => void;
}

export function ProfileScreen({
  levelProgress,
  totalStars,
  completedStagesCount,
  studiedAnkiCount,
  dueAnkiCount,
  totalAnkiDeckCount,
  activityLog,
  equivalentEstimate,
  onboarding,
  account,
  onUpdateOnboarding,
  onNavigateTryOut,
  onOpenFeedback,
  onLogout,
}: ProfileScreenProps) {
  const { lang, setLang, t } = useLanguage();
  const [subView, setSubView] = useState<ProfileSubView>('overview');
  const [mascotExpression, setMascotExpression] =
    useState<MascotExpression>('idle');
  const reactionTimerRef = useRef<number | null>(null);
  const tapToggleRef = useRef(false);

  const triggerMascotReaction = useCallback(
    (expr: 'tap_kaget' | 'happy', durationMs = 1800) => {
      if (reactionTimerRef.current !== null) {
        window.clearTimeout(reactionTimerRef.current);
      }
      setMascotExpression(expr);
      reactionTimerRef.current = window.setTimeout(() => {
        setMascotExpression('idle');
        reactionTimerRef.current = null;
      }, durationMs);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (reactionTimerRef.current !== null) {
        window.clearTimeout(reactionTimerRef.current);
      }
    };
  }, []);

  const handleProfileMascotTap = useCallback(() => {
    vibrateTap();
    tapToggleRef.current = !tapToggleRef.current;
    triggerMascotReaction(tapToggleRef.current ? 'tap_kaget' : 'happy', 1800);
  }, [triggerMascotReaction]);

  const openSubView = (view: ProfileSubView) => {
    setSubView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (subView === 'about') {
    return <ProfileAboutView onBack={() => openSubView('overview')} />;
  }

  if (subView === 'faq') {
    return <ProfileFaqView onBack={() => openSubView('overview')} />;
  }

  const maxStars = CHALLENGE_STAGES.length * 3;
  const streakDays = getDailyStreak(activityLog);
  const displayName =
    onboarding.name || account?.username || 'Pelajar UtamaGo!';

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* 1. Kartu Profil — Identitas pelajar + maskot animasi GIF interaktif */}
      <section
        aria-label="Kartu Profil"
        className="w-full min-w-0 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6"
      >
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <MascotAvatar
              stage={levelProgress.rank.stage}
              gender={onboarding.gender}
              expression={mascotExpression}
              size={112}
              sizeClassName="h-[100px] w-[100px] sm:h-[116px] sm:w-[116px]"
              fallbackSrc={levelProgress.rank.illustrationPath}
              fallbackLabel={levelProgress.rank.stage}
              ariaLabel={`Maskot ${levelProgress.rank.title}, ketuk untuk berinteraksi`}
              onTap={handleProfileMascotTap}
              dataMood={mascotExpression}
            />

            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="truncate font-display text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
                {displayName}
              </h2>

              <p className="text-sm font-semibold text-primary break-words">
                Level{' '}
                <span className="font-mono tabular-nums">
                  {levelProgress.level}
                </span>{' '}
                · {levelProgress.rank.title}
              </p>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-on-surface-variant">
                <span className="inline-flex items-center gap-1 font-medium text-on-surface">
                  <Zap
                    className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
                    aria-hidden="true"
                  />
                  <span className="font-mono tabular-nums">
                    {levelProgress.totalXp}
                  </span>{' '}
                  XP
                </span>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <span>
                  JLPT{' '}
                  <span className="font-mono">
                    {onboarding.selfAssessedLevel}
                  </span>
                </span>
                {account?.username && (
                  <>
                    <span aria-hidden="true" className="opacity-50">
                      ·
                    </span>
                    <span className="max-w-full truncate font-mono text-xs">
                      @{account.username}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onLogout();
              }}
              className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-outline hover:text-primary sm:w-auto"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t('Keluar', 'Sign Out')}</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Statistik Belajar — Ringkas, angka utama menonjol, pemisah tipis */}
      <section aria-label={t('Statistik Belajar', 'Study Statistics')} className="w-full min-w-0 space-y-3">
        <h3 className="font-display text-base font-bold text-on-surface">
          {t('Statistik Belajar', 'Study Statistics')}
        </h3>

        <div className="grid w-full grid-cols-[repeat(2,minmax(0,1fr))] overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low sm:grid-cols-[repeat(4,minmax(0,1fr))]">
          <div className="min-w-0 border-r border-b border-outline-variant p-4 sm:border-b-0">
            <p className="text-[13px] font-medium text-on-surface-variant">
              {t('Streak Harian', 'Daily Streak')}
            </p>
            <p className="mt-2 font-display text-2xl font-bold leading-none text-on-surface">
              <span className="font-mono tabular-nums">{streakDays}</span>{' '}
              <span className="text-sm font-medium text-on-surface-variant">
                {t('Hari', 'Days')}
              </span>
            </p>
            <p className="mt-2 text-[13px] text-on-surface-variant">
              Target{' '}
              <span className="font-mono tabular-nums">
                {onboarding.dailyMinutes}
              </span>{' '}
              mnt/hari
            </p>
          </div>

          <div className="min-w-0 border-b border-outline-variant p-4 sm:border-r sm:border-b-0">
            <p className="text-[13px] font-medium text-on-surface-variant">
              Kartu Anki
            </p>
            <p className="mt-2 font-mono text-2xl font-bold leading-none tabular-nums text-on-surface">
              {studiedAnkiCount}
            </p>
            <p className="mt-2 text-[13px] text-on-surface-variant break-words">
              <span className="font-mono tabular-nums">{dueAnkiCount}</span>{' '}
              tempo ·{' '}
              <span className="font-mono tabular-nums">
                {totalAnkiDeckCount}
              </span>{' '}
              total
            </p>
          </div>

          <div className="min-w-0 border-r border-outline-variant p-4">
            <p className="text-[13px] font-medium text-on-surface-variant">
              Tantangan
            </p>
            <p className="mt-2 font-mono text-2xl font-bold leading-none tabular-nums text-on-surface">
              {completedStagesCount}
              <span className="text-sm font-medium text-on-surface-variant">
                /{CHALLENGE_STAGES.length}
              </span>
            </p>
            <p className="mt-2 inline-flex flex-wrap items-center gap-1 text-[13px] text-on-surface-variant">
              <Star
                className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
                aria-hidden="true"
              />
              <span>
                <span className="font-mono tabular-nums">
                  {totalStars}/{maxStars}
                </span>{' '}
                bintang
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onNavigateTryOut();
            }}
            className="group flex min-h-[44px] min-w-0 flex-col justify-between p-4 text-left transition-colors hover:bg-surface"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-on-surface-variant">
                Estimasi Try Out
              </p>
              <p className="mt-2 font-display text-xl font-bold leading-tight text-primary sm:text-2xl sm:leading-none">
                {equivalentEstimate.level
                  ? `JLPT ${equivalentEstimate.level}`
                  : 'Belum Diuji'}
              </p>
            </div>
            <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
              <span>Buka Try Out</span>
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </section>

      {/* 3. Data Diri & Level Belajar */}
      <section
        aria-label={t('Data Diri dan Level Belajar', 'Profile and Study Level')}
        className="w-full min-w-0 space-y-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-on-surface">
              {t('Data Diri & Level Belajar', 'Profile & Study Level')}
            </h3>
            <p className="mt-1 text-[13px] leading-snug text-on-surface-variant">
              {t(
                'Atur nama tampilan, maskot, bahasa aplikasi, dan batas level JLPT.',
                'Customize your display name, mascot, app language, and JLPT level access.',
              )}
            </p>
          </div>

          {/* Quick Language Toggle (ID | EN) */}
          <div
            role="radiogroup"
            aria-label={t('Pilih bahasa aplikasi', 'Switch app language')}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-outline-variant bg-surface p-1"
          >
            <Globe
              className="ml-1.5 h-3.5 w-3.5 text-on-surface-variant"
              aria-hidden="true"
            />
            {(['id', 'en'] as readonly AppLanguage[]).map((code) => {
              const active = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    vibrateTap();
                    setLang(code);
                  }}
                  className={`min-h-[34px] rounded-lg px-2.5 py-1 font-mono text-xs font-bold uppercase transition-colors ${
                    active
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
          <div className="min-w-0 space-y-1.5">
            <label
              htmlFor="profile-name-input"
              className="block text-[13px] font-semibold text-on-surface-variant"
            >
              Nama
            </label>
            <input
              id="profile-name-input"
              type="text"
              value={onboarding.name}
              maxLength={60}
              onChange={(e) => onUpdateOnboarding({ name: e.target.value })}
              placeholder="Nama kamu"
              className="min-h-[44px] w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-2 text-sm font-medium text-on-surface transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          <div className="min-w-0 space-y-1.5">
            <span className="block text-[13px] font-semibold text-on-surface-variant">
              Jenis Kelamin Maskot
            </span>
            <div
              role="radiogroup"
              aria-label="Pilih jenis kelamin maskot"
              className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2"
            >
              {(['cowok', 'cewek'] as LearnerGender[]).map((g) => {
                const active = onboarding.gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      vibrateTap();
                      onUpdateOnboarding({ gender: g });
                      triggerMascotReaction('happy', 1500);
                    }}
                    className={`flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? 'border-primary bg-primary-container/35 font-semibold text-on-surface'
                        : 'border-outline-variant bg-surface font-medium text-on-surface-variant hover:border-outline hover:text-on-surface'
                    }`}
                  >
                    <MascotAvatar
                      stage={levelProgress.rank.stage}
                      gender={g}
                      expression="idle"
                      size={32}
                      fallbackSrc={getRankIllustrationPath(
                        levelProgress.rank.stage,
                        g,
                      )}
                      ariaLabel={g === 'cewek' ? 'Maskot Cewek' : 'Maskot Cowok'}
                      className="rounded-lg border-outline-variant/50 shadow-none"
                    />
                    <span className="truncate">
                      {g === 'cewek' ? 'Cewek' : 'Cowok'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pilihan Akses Level N5–N1 — Jelas membedakan level terbuka vs terkunci */}
        <div className="space-y-3 border-t border-outline-variant pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-on-surface-variant">
              Akses Level Belajar
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-primary">
              Hingga JLPT{' '}
              <span className="font-mono">{onboarding.selfAssessedLevel}</span>
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Level JLPT yang terbuka"
            className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-2"
          >
            {JLPT_LEVELS_ASC.map((lvl) => {
              const active = onboarding.selfAssessedLevel === lvl;
              const unlocked = isJlptLevelUnlocked(
                lvl,
                onboarding.selfAssessedLevel,
              );
              return (
                <button
                  key={lvl}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${lvl} (${unlocked ? 'terbuka' : 'terkunci'})`}
                  onClick={() => {
                    vibrateTap();
                    onUpdateOnboarding({ selfAssessedLevel: lvl });
                  }}
                  className={`flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-xs transition-colors ${
                    active
                      ? 'border-primary bg-primary font-bold text-on-primary'
                      : unlocked
                        ? 'border-outline-variant bg-surface font-semibold text-on-surface hover:border-outline'
                        : 'border-dashed border-outline-variant/80 bg-transparent font-medium text-on-surface-variant/65 hover:border-outline hover:text-on-surface-variant'
                  }`}
                >
                  <span className="font-mono leading-none">{lvl}</span>
                  {unlocked ? (
                    <Check
                      className={`h-3 w-3 ${
                        active ? 'text-on-primary' : 'text-success'
                      }`}
                      aria-hidden="true"
                    />
                  ) : (
                    <Lock className="h-3 w-3" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[13px] leading-snug text-on-surface-variant">
            {onboarding.selfAssessedLevel === 'N1'
              ? 'Seluruh materi dan tantangan JLPT N5 hingga N1 terbuka.'
              : `Level N5 hingga ${onboarding.selfAssessedLevel} terbuka. Ketuk level lebih tinggi untuk membukanya.`}
          </p>
        </div>
      </section>

      {/* 4 & 5. Menu Ringkas: Tentang UtamaGo! + FAQ & Bantuan */}
      <section aria-label={t('Informasi dan Bantuan', 'Information & Help')} className="w-full min-w-0 space-y-3">
        <h3 className="font-display text-base font-bold text-on-surface">
          {t('Informasi & Bantuan', 'Information & Help')}
        </h3>

        <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              openSubView('about');
            }}
            className="group flex min-h-[64px] w-full min-w-0 items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-surface"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Info
                className="h-5 w-5 shrink-0 text-on-surface-variant"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  {t('Tentang UtamaGo!', 'About UtamaGo!')}
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant break-words">
                  {t(
                    'Profil aplikasi, misi belajar, dan pendiri',
                    'App overview, study mission, and founder',
                  )}
                </p>
              </div>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              openSubView('faq');
            }}
            className="group flex min-h-[64px] w-full min-w-0 items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-surface"
          >
            <div className="flex min-w-0 items-center gap-3">
              <HelpCircle
                className="h-5 w-5 shrink-0 text-on-surface-variant"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  {t('FAQ & Bantuan', 'FAQ & Help')}
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant break-words">
                  {t('Pertanyaan umum seputar UtamaGo!', 'Common questions about UtamaGo!')} (
                  <span className="font-mono tabular-nums">{FAQS.length}</span>{' '}
                  {t('topik', 'topics')})
                </p>
              </div>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>

          {onOpenFeedback && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onOpenFeedback();
              }}
              className="group flex min-h-[64px] w-full min-w-0 items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-surface"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MessageSquarePlus
                  className="h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface">
                    {t('Laporkan Bug & Saran', 'Report Bug & Feedback')}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant break-words">
                    {t(
                      'Laporkan error, typo materi, atau kirim saran langsung via email',
                      'Report bugs, content typos, or send feature suggestions directly via email',
                    )}
                  </p>
                </div>
              </div>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        <p className="pt-3 text-xs leading-relaxed text-on-surface-variant">
          *UtamaGo! bukan penyelenggara resmi JLPT. © 2026 UtamaGo!
        </p>
      </section>
    </div>
  );
}

