import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  ExternalLink,
  Globe,
  GraduationCap,
  Instagram,
  Loader2,
  LogOut,
  MessageSquarePlus,
  Monitor,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  Type,
  Volume2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { JlptLevel } from '../data/utamagoContent';
import type { ThemeMode } from '../hooks/useThemeMode';
import { useLanguage, type AppLanguage } from '../i18n/LanguageContext';
import {
  getHapticsEnabled,
  setHapticsEnabled,
  vibrateSuccess,
  vibrateTap,
} from '../utils/haptics';
import {
  formatSpeechRateLabel,
  isDeviceSpeechSynthesisSupported,
  isJapaneseSpeechSupported,
  listJapaneseVoices,
  loadSpeechPreferences,
  saveSpeechPreferences,
  speakJapanese,
  SPEECH_RATE_PRESETS,
  stopJapaneseSpeech,
  subscribeSpeechPreferences,
  type JapaneseVoiceOption,
  type SpeechPreferences,
} from '../utils/japaneseSpeech';
import {
  TEACHER_INSTAGRAM_HANDLE,
  TEACHER_INSTAGRAM_URL,
} from '../utils/jlptReport';
import {
  formatReminderTime,
  getNotificationAdapter,
  type DailyReminderConfig,
  type NotificationPermissionState,
} from '../utils/notifications';
import type { OnboardingSettings, TextScale } from '../utils/storage';
import { ConfirmDialog } from './ConfirmDialog';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  textScale: TextScale;
  onboarding: OnboardingSettings;
  reminder: DailyReminderConfig;
  onChangeThemeMode: (mode: ThemeMode) => void;
  onChangeTextScale: (scale: TextScale) => void;
  onUpdateOnboarding: (next: Partial<OnboardingSettings>) => void;
  onUpdateReminder: (next: DailyReminderConfig) => void;
  onResetAllProgress: () => void;
  accountUsername?: string;
  accountEmail?: string;
  onOpenFeedback?: () => void;
  onLogout?: () => void;
}

const THEME_MODE_OPTIONS: ReadonlyArray<{
  id: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { id: 'light', label: 'Terang', icon: Sun },
  { id: 'dark', label: 'Malam', icon: Moon },
  { id: 'system', label: 'Sistem', icon: Monitor },
];

const TEXT_SCALE_OPTIONS: Array<{ id: TextScale; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'large', label: 'Besar' },
  { id: 'xlarge', label: 'Ekstra' },
];

const TARGET_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const VOICE_TEST_SENTENCE = 'こんにちは。今日も一緒に日本語を勉強しましょう。';

export function SettingsModal({
  open,
  onClose,
  themeMode,
  textScale,
  onboarding,
  reminder,
  onChangeThemeMode,
  onChangeTextScale,
  onUpdateOnboarding,
  onUpdateReminder,
  onResetAllProgress,
  accountUsername,
  accountEmail,
  onOpenFeedback,
  onLogout,
}: SettingsModalProps) {
  const { lang, setLang, t } = useLanguage();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>('default');
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [hapticsOn, setHapticsOn] = useState<boolean>(() =>
    getHapticsEnabled(),
  );
  const [speechPrefs, setSpeechPrefs] = useState<SpeechPreferences>(() =>
    loadSpeechPreferences(),
  );
  const [japaneseVoices, setJapaneseVoices] = useState<JapaneseVoiceOption[]>(
    () => listJapaneseVoices(),
  );
  const [testingVoice, setTestingVoice] = useState(false);
  const [loadingVoiceTest, setLoadingVoiceTest] = useState(false);

  const speechSupported = isJapaneseSpeechSupported();
  const showDeviceVoiceDropdown = japaneseVoices.length > 1;
  const reminderBlockedOrUnsupported =
    permissionState === 'denied' || permissionState === 'unsupported';

  useEffect(() => {
    const unsub = subscribeSpeechPreferences(setSpeechPrefs);
    return unsub;
  }, []);

  useEffect(() => {
    if (!open) return;
    if (isDeviceSpeechSynthesisSupported()) {
      const syncVoices = () => setJapaneseVoices(listJapaneseVoices());
      syncVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', syncVoices);
      return () => {
        window.speechSynthesis.removeEventListener?.(
          'voiceschanged',
          syncVoices,
        );
        stopJapaneseSpeech();
        setTestingVoice(false);
        setLoadingVoiceTest(false);
      };
    }
    return () => {
      stopJapaneseSpeech();
      setTestingVoice(false);
      setLoadingVoiceTest(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void getNotificationAdapter()
      .getPermissionStatus()
      .then(setPermissionState);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmResetOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, confirmResetOpen]);

  if (!open) return null;

  const handleConfirmReset = () => {
    vibrateTap();
    onResetAllProgress();
    setConfirmResetOpen(false);
    setResetDone(true);
  };

  const handleToggleReminder = async () => {
    vibrateTap();
    setReminderNotice(null);
    const adapter = getNotificationAdapter();

    if (!reminder.enabled) {
      if (!adapter.isSupported()) {
        setPermissionState('unsupported');
        return;
      }

      const perm = await adapter.requestPermission();
      setPermissionState(perm);
      if (perm === 'granted') {
        const nextConfig = { ...reminder, enabled: true };
        onUpdateReminder(nextConfig);
        await adapter.scheduleDailyReminder(nextConfig);
        setReminderNotice(
          t(
            `Pengingat aktif setiap pukul ${formatReminderTime(reminder.hour, reminder.minute)}.`,
            `Reminder active daily at ${formatReminderTime(reminder.hour, reminder.minute)}.`,
          ),
        );
      } else {
        setReminderNotice(
          t(
            'Izin notifikasi belum diaktifkan di browser.',
            'Notification permission is not enabled in this browser.',
          ),
        );
      }
    } else {
      const nextConfig = { ...reminder, enabled: false };
      onUpdateReminder(nextConfig);
      await adapter.cancelDailyReminder();
      setReminderNotice(
        t('Pengingat harian dimatikan.', 'Daily reminder turned off.'),
      );
    }
  };

  const handleChangeReminderTime = async (timeValue: string) => {
    const [hStr, mStr] = timeValue.split(':');
    const hour = Math.max(0, Math.min(23, Number(hStr) || 0));
    const minute = Math.max(0, Math.min(59, Number(mStr) || 0));
    const nextConfig = { ...reminder, hour, minute };
    onUpdateReminder(nextConfig);
    if (nextConfig.enabled) {
      await getNotificationAdapter().scheduleDailyReminder(nextConfig);
    }
  };

  const handleTestNotification = async () => {
    vibrateTap();
    const adapter = getNotificationAdapter();
    if (!adapter.isSupported()) {
      setPermissionState('unsupported');
      return;
    }
    const perm =
      permissionState === 'granted'
        ? 'granted'
        : await adapter.requestPermission();
    setPermissionState(perm);
    if (perm !== 'granted') {
      setReminderNotice(
        t(
          'Izin notifikasi belum diberikan.',
          'Notification permission has not been granted.',
        ),
      );
      return;
    }
    const sent = await adapter.sendImmediateNotification(
      t('UtamaGo! — Pengingat Belajar JLPT', 'UtamaGo! — JLPT Study Reminder'),
      t(
        'Saatnya latihan kosakata Anki, Bunpou N5–N1, dan tantangan JLPT hari ini.',
        "Time for today's Anki vocabulary, N5–N1 grammar, and JLPT practice.",
      ),
    );
    setReminderNotice(
      sent
        ? t(
            'Notifikasi uji coba berhasil dikirim.',
            'Test notification sent successfully.',
          )
        : t(
            'Tidak dapat menampilkan notifikasi saat ini.',
            'Unable to display notification right now.',
          ),
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-outline-variant bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-primary">
              <span>UtamaGo!</span>
              <span className="rounded-md border border-primary/35 bg-primary-container/60 px-1.5 py-0.5 font-mono text-[9px] leading-none font-bold uppercase text-on-primary-container">
                Beta Tester
              </span>
            </p>
            <h2
              id="settings-modal-title"
              className="font-display text-lg font-extrabold text-on-surface"
            >
              {t('Pengaturan Aplikasi', 'App Settings')}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            aria-label={t('Tutup Pengaturan', 'Close Settings')}
            className="m3-tactile inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Tampilan & Target */}
            <section className="space-y-4 rounded-3xl border border-outline-variant bg-surface-container-low p-5 shadow-xs">
              <div>
                <h3 className="font-display text-base font-bold text-on-surface">
                  {t('Tampilan, Bahasa & Target', 'Display, Language & Goal')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  {t(
                    'Sesuaikan bahasa aplikasi, tema malam/terang, ukuran huruf, serta target level JLPT.',
                    'Customize app language, light/dark theme, text size, and your JLPT target level.',
                  )}
                </p>
              </div>

              {/* Bahasa Aplikasi (ID / EN) */}
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t('Bahasa Aplikasi', 'App Language')}</span>
                </p>
                <div
                  role="radiogroup"
                  aria-label={t('Pilih bahasa aplikasi', 'Select app language')}
                  className="grid grid-cols-2 gap-1.5 rounded-2xl bg-surface-container p-1"
                >
                  {(
                    [
                      { id: 'id', label: 'Indonesia (ID)' },
                      { id: 'en', label: 'English (EN)' },
                    ] as ReadonlyArray<{ id: AppLanguage; label: string }>
                  ).map((opt) => {
                    const active = lang === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          vibrateTap();
                          setLang(opt.id);
                        }}
                        className={`m3-tactile inline-flex min-h-[48px] items-center justify-center whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold ${
                          active
                            ? 'bg-surface-container-low text-on-surface shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-outline-variant pt-4">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t('Tema Tampilan', 'Appearance Theme')}</span>
                </p>
                <div
                  role="radiogroup"
                  aria-label={t('Pilih tema tampilan', 'Choose appearance theme')}
                  className="grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-container p-1"
                >
                  {THEME_MODE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = themeMode === opt.id;
                    const label =
                      opt.id === 'light'
                        ? t('Terang', 'Light')
                        : opt.id === 'dark'
                          ? t('Malam', 'Dark')
                          : t('Sistem', 'System');
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          vibrateTap();
                          onChangeThemeMode(opt.id);
                        }}
                        className={`m3-tactile inline-flex min-h-[48px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold ${
                          active
                            ? 'bg-surface-container-low text-on-surface shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-outline-variant pt-4">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                  <Type className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t('Ukuran Huruf Aplikasi', 'App Text Size')}</span>
                </p>
                <div
                  role="radiogroup"
                  aria-label={t('Pilih ukuran huruf', 'Choose text size')}
                  className="grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-container p-1"
                >
                  {TEXT_SCALE_OPTIONS.map((opt) => {
                    const active = textScale === opt.id;
                    const label =
                      opt.id === 'normal'
                        ? t('Normal', 'Normal')
                        : opt.id === 'large'
                          ? t('Besar', 'Large')
                          : t('Ekstra', 'Extra');
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          vibrateTap();
                          onChangeTextScale(opt.id);
                        }}
                        className={`m3-tactile inline-flex min-h-[48px] items-center justify-center whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold ${
                          active
                            ? 'bg-surface-container-low text-on-surface shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-outline-variant pt-4">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {t('Target Level JLPT', 'JLPT Target Level')} (
                    {onboarding.targetLevel})
                  </span>
                </p>
                <div
                  role="radiogroup"
                  aria-label={t('Target level JLPT', 'JLPT target level')}
                  className="grid grid-cols-5 gap-1.5 rounded-2xl bg-surface-container p-1"
                >
                  {TARGET_LEVELS.map((lvl) => {
                    const active = onboarding.targetLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          vibrateTap();
                          onUpdateOnboarding({ targetLevel: lvl });
                        }}
                        className={`m3-tactile min-h-[48px] rounded-xl font-mono text-xs font-bold ${
                          active
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-outline-variant pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Smartphone
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-bold text-on-surface">
                        {t('Getar Haptic (Tactile)', 'Haptic Feedback')}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {t(
                          'Getaran halus saat menekan tombol & kartu',
                          'Subtle vibration when tapping buttons & cards',
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!hapticsOn) {
                          setHapticsEnabled(true);
                          setHapticsOn(true);
                        }
                        vibrateSuccess();
                      }}
                      className="m3-tactile min-h-[38px] rounded-xl border border-outline bg-surface-container px-2.5 py-1 text-[11px] font-bold text-on-surface hover:bg-surface-container-high"
                    >
                      {t('Tes', 'Test')}
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hapticsOn}
                      aria-label={t(
                        'Aktifkan getar haptic saat menekan tombol',
                        'Enable haptic vibration on tap',
                      )}
                      onClick={() => {
                        const next = !hapticsOn;
                        setHapticsEnabled(next);
                        setHapticsOn(next);
                        if (next) {
                          vibrateSuccess();
                        }
                      }}
                      className="m3-tactile inline-flex min-h-[44px] items-center rounded-xl px-1"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                          hapticsOn ? 'bg-primary' : 'bg-surface-container-high'
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                            hapticsOn ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Pengingat Belajar & Bantuan */}
            <section className="space-y-4 rounded-3xl border border-outline-variant bg-surface-container-low p-5 shadow-xs">
              <div>
                <h3 className="font-display text-base font-bold text-on-surface">
                  {t('Pengingat Belajar & Bantuan', 'Study Reminders & Help')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  {t(
                    'Atur pengingat latihan harian, hubungi pengajar, atau kelola progres belajarmu.',
                    'Set daily study reminders, contact the teacher, or manage your learning progress.',
                  )}
                </p>
              </div>

              {reminderBlockedOrUnsupported ? (
                <div className="flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface-container p-3.5">
                  <BellOff
                    className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant"
                    aria-hidden="true"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-on-surface">
                      {permissionState === 'denied'
                        ? t(
                            'Pengingat Harian Diblokir Browser',
                            'Daily Reminder Blocked by Browser',
                          )
                        : t(
                            'Pengingat Harian Tidak Tersedia',
                            'Daily Reminder Unavailable',
                          )}
                    </p>
                    <p className="text-[11px] leading-relaxed text-on-surface-variant">
                      {permissionState === 'denied'
                        ? t(
                            'Izin notifikasi sedang ditolak. Aktifkan izin notifikasi untuk situs ini di setelan browser agar pengingat harian bisa menyala.',
                            'Notification permission is denied. Enable notifications for this site in your browser settings to turn on daily reminders.',
                          )
                        : t(
                            'Browser perangkat ini belum mendukung notifikasi pengingat harian.',
                            'This device browser does not support daily reminder notifications yet.',
                          )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl bg-surface-container p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Bell
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-bold text-on-surface">
                          {t('Pengingat Harian', 'Daily Reminder')}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {permissionState === 'granted'
                            ? t('Notifikasi diizinkan', 'Notifications allowed')
                            : t(
                                'Ketuk tombol untuk mengaktifkan pengingat',
                                'Tap switch to enable reminders',
                              )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={reminder.enabled}
                      aria-label={t(
                        'Aktifkan pengingat belajar harian',
                        'Enable daily study reminder',
                      )}
                      onClick={() => void handleToggleReminder()}
                      className="m3-tactile inline-flex min-h-[48px] items-center rounded-xl px-1"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                          reminder.enabled
                            ? 'bg-primary'
                            : 'bg-surface-container-high'
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                            reminder.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="settings-reminder-time-input"
                      className="sr-only"
                    >
                      {t('Jam pengingat belajar harian', 'Daily reminder time')}
                    </label>
                    <input
                      id="settings-reminder-time-input"
                      type="time"
                      value={formatReminderTime(reminder.hour, reminder.minute)}
                      onChange={(e) =>
                        void handleChangeReminderTime(e.target.value)
                      }
                      className="min-h-[48px] rounded-xl border border-outline bg-surface px-3 py-2 font-mono text-xs font-bold text-on-surface focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleTestNotification()}
                      className="m3-tactile inline-flex min-h-[48px] flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-outline bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                    >
                      {t('Uji Notifikasi', 'Test Notification')}
                    </button>
                  </div>

                  {reminderNotice && (
                    <p
                      role="status"
                      className="text-[11px] font-medium text-on-surface-variant"
                    >
                      {reminderNotice}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2.5">
                {onOpenFeedback && (
                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      onClose();
                      onOpenFeedback();
                    }}
                    className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary-container/40 px-4 py-2 text-xs font-bold text-on-surface hover:bg-primary-container/65"
                  >
                    <MessageSquarePlus
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    <span>{t('Lapor Bug & Saran', 'Report Bug & Feedback')}</span>
                  </button>
                )}

                <a
                  href={TEACHER_INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                >
                  <Instagram
                    className="h-4 w-4 text-primary"
                    aria-hidden="true"
                  />
                  <span>
                    {t(
                      `Tanya Pengajar via Instagram (${TEACHER_INSTAGRAM_HANDLE})`,
                      `Ask Teacher on Instagram (${TEACHER_INSTAGRAM_HANDLE})`,
                    )}
                  </span>
                  <ExternalLink
                    className="h-3.5 w-3.5 text-on-surface-variant"
                    aria-hidden="true"
                  />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setConfirmResetOpen(true);
                    setResetDone(false);
                  }}
                  className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {t('Reset Semua Progres Belajar', 'Reset All Study Progress')}
                  </span>
                </button>

                {resetDone && (
                  <p className="text-xs font-medium text-success">
                    {t(
                      'Semua progres belajar berhasil direset ke Level 1.',
                      'All study progress has been reset to Level 1.',
                    )}
                  </p>
                )}

                {(accountUsername || accountEmail || onLogout) && (
                  <div className="space-y-2 border-t border-outline-variant pt-3">
                    {(accountUsername || accountEmail) && (
                      <p className="font-mono text-[11px] text-on-surface-variant">
                        {t('Akun:', 'Account:')}{' '}
                        <strong className="text-on-surface">
                          {accountUsername ? `@${accountUsername}` : ''}
                          {accountUsername && accountEmail ? ' · ' : ''}
                          {accountEmail ?? ''}
                        </strong>
                      </p>
                    )}
                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          onClose();
                          onLogout();
                        }}
                        className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-surface-container px-3.5 py-2 text-xs font-semibold text-primary hover:bg-surface-container-high"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        <span>{t('Keluar Akun', 'Sign Out')}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Suara & Pelafalan Jepang */}
            <section className="space-y-4 rounded-3xl border border-outline-variant bg-surface-container-low p-5 shadow-xs md:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="inline-flex items-center gap-2 font-display text-base font-bold text-on-surface">
                    <Volume2
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      {t('Suara & Pelafalan Jepang', 'Japanese Voice & Audio')}
                    </span>
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                    {t(
                      'Menggunakan suara bawaan perangkat (instan & bisa diputar offline). Berlaku di Anki, Kamus, dan Bunpou.',
                      'Uses your native device voice (instant & works offline). Applies to Anki, Dictionary, and Grammar.',
                    )}
                  </p>
                </div>

                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      if (testingVoice || loadingVoiceTest) {
                        stopJapaneseSpeech();
                        setTestingVoice(false);
                        setLoadingVoiceTest(false);
                        return;
                      }
                      setTestingVoice(true);
                      const ok = speakJapanese(VOICE_TEST_SENTENCE, {
                        onLoadingChange: (loading) =>
                          setLoadingVoiceTest(loading),
                        onEnd: () => {
                          setTestingVoice(false);
                          setLoadingVoiceTest(false);
                        },
                      });
                      if (!ok) {
                        setTestingVoice(false);
                        setLoadingVoiceTest(false);
                      }
                    }}
                    className={`m3-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                      testingVoice
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline bg-surface text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {loadingVoiceTest ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {loadingVoiceTest
                        ? t('Memuat Suara...', 'Loading Voice...')
                        : testingVoice
                          ? t('Hentikan Uji', 'Stop Test')
                          : t('Uji Suara', 'Test Voice')}
                    </span>
                  </button>
                )}
              </div>

              {!speechSupported ? (
                <p className="rounded-2xl bg-surface-container p-3.5 text-xs text-on-surface-variant">
                  {t(
                    'Browser perangkat ini belum mendukung pemutaran audio pelafalan Jepang.',
                    'This browser does not support Japanese speech playback yet.',
                  )}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div
                    className={`space-y-2 ${
                      showDeviceVoiceDropdown ? '' : 'md:col-span-2'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-on-surface-variant">
                        {t('Kecepatan Bicara', 'Speech Speed')}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-primary">
                        {formatSpeechRateLabel(speechPrefs.rate)}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {SPEECH_RATE_PRESETS.map((rateOpt) => {
                        const active =
                          Math.abs(speechPrefs.rate - rateOpt) < 0.03;
                        return (
                          <button
                            key={rateOpt}
                            type="button"
                            onClick={() => {
                              vibrateTap();
                              saveSpeechPreferences({ rate: rateOpt });
                            }}
                            className={`m3-tactile min-h-[44px] rounded-xl border font-mono text-xs font-bold tabular-nums transition-colors ${
                              active
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface'
                            }`}
                          >
                            {formatSpeechRateLabel(rateOpt)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {showDeviceVoiceDropdown && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="settings-jp-voice-select"
                        className="block text-xs font-semibold text-on-surface-variant"
                      >
                        {t(
                          `Pilihan Suara Perangkat (${japaneseVoices.length} suara tersedia)`,
                          `Device Voice (${japaneseVoices.length} available)`,
                        )}
                      </label>
                      <select
                        id="settings-jp-voice-select"
                        value={speechPrefs.voiceURI}
                        onChange={(e) => {
                          saveSpeechPreferences({ voiceURI: e.target.value });
                        }}
                        className="min-h-[44px] w-full rounded-xl border border-outline-variant bg-surface px-3 text-xs font-medium text-on-surface focus:border-primary focus:outline-none"
                      >
                        <option value="">
                          {t('Otomatis Perangkat', 'Device Default')}
                        </option>
                        {japaneseVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container px-4 py-3 md:col-span-2">
                    <div>
                      <p className="text-xs font-bold text-on-surface">
                        {t('Auto-play Audio di Anki', 'Auto-play Audio in Anki')}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {t(
                          'Otomatis membacakan kata Jepang saat kartu baru muncul',
                          'Automatically speaks Japanese words when a new card appears',
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={speechPrefs.autoPlayAnki}
                      aria-label={t(
                        'Aktifkan auto-play audio pada kartu Anki',
                        'Enable auto-play audio on Anki cards',
                      )}
                      onClick={() => {
                        vibrateTap();
                        saveSpeechPreferences({
                          autoPlayAnki: !speechPrefs.autoPlayAnki,
                        });
                      }}
                      className="m3-tactile inline-flex min-h-[44px] shrink-0 items-center rounded-xl px-1"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                          speechPrefs.autoPlayAnki
                            ? 'bg-primary'
                            : 'bg-surface-container-high'
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                            speechPrefs.autoPlayAnki
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmResetOpen}
        title={t('Reset Semua Progres?', 'Reset All Progress?')}
        description={t(
          'Semua XP, level terbuka, jadwal ulang kartu Anki, serta jawaban Try Out di perangkat ini akan dihapus dan kembali ke Level 1.',
          'All XP, unlocked levels, Anki review schedules, and Try Out answers on this device will be cleared and reset to Level 1.',
        )}
        confirmLabel={t('Ya, Reset', 'Yes, Reset')}
        cancelLabel={t('Batal', 'Cancel')}
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}
