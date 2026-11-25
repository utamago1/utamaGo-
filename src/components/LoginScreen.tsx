import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LogIn,
  Mail,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BRAND_ASSETS } from '../data/utamagoContent';
import { useLanguage, type AppLanguage } from '../i18n/LanguageContext';
import {
  formatAccountAuthError,
  loginWithUsernameOrEmail,
  registerWithUsernameEmailPassword,
  requestPasswordResetByEmail,
  type AuthenticatedUserProfile,
} from '../services/accountAuth';
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
} from '../utils/accountValidation';
import { vibrateError, vibrateSuccess, vibrateTap } from '../utils/haptics';

type AuthMode = 'login' | 'register' | 'forgot';

interface LoginScreenProps {
  onLoginSuccess: (profile: AuthenticatedUserProfile) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { lang, setLang, t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('login');
  const [logoFailed, setLogoFailed] = useState(false);

  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    vibrateTap();
    setMode(nextMode);
    setErrorMessage(null);
    setResetSentEmail(null);
    setPasswordInput('');
    setShowPassword(false);
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    vibrateTap();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const profile = await loginWithUsernameOrEmail(
        usernameInput,
        passwordInput,
      );
      vibrateSuccess();
      onLoginSuccess(profile);
    } catch (err) {
      vibrateError();
      setErrorMessage(formatAccountAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    vibrateTap();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const profile = await registerWithUsernameEmailPassword({
        username: usernameInput,
        email: emailInput,
        password: passwordInput,
      });
      vibrateSuccess();
      onLoginSuccess(profile);
    } catch (err) {
      vibrateError();
      setErrorMessage(formatAccountAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    vibrateTap();
    setErrorMessage(null);
    setResetSentEmail(null);
    setSubmitting(true);

    try {
      const sentTo = await requestPasswordResetByEmail(emailInput);
      vibrateSuccess();
      setResetSentEmail(sentTo);
    } catch (err) {
      vibrateError();
      setErrorMessage(formatAccountAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const headingTitle =
    mode === 'register'
      ? t('Buat Akun UtamaGo!', 'Create UtamaGo! Account')
      : mode === 'forgot'
        ? t('Lupa Password', 'Reset Password')
        : t('Masuk ke UtamaGo!', 'Sign in to UtamaGo!');

  const headingSubtitle =
    mode === 'register'
      ? t(
          'Daftar gratis untuk belajar JLPT N5–N1: Anki Kosakata & Bunpou, Arena Tantangan 30 Stage, Studio Menulis, hingga 15 Paket Try Out.',
          'Sign up free for JLPT N5–N1 prep: Anki Vocab & Grammar, 30-Stage Challenge Arena, Writing Studio, and 15 Mock Exams.',
        )
      : mode === 'forgot'
        ? t(
            'Masukkan email yang kamu daftarkan. Kami akan mengirimkan tautan untuk membuat password baru.',
            'Enter your registered email and we will send a link to reset your password.',
          )
        : t(
            'Masuk menggunakan username dan password untuk melanjutkan belajar JLPT N5–N1.',
            'Sign in with your username and password to continue your JLPT N5–N1 study.',
          );

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-y-auto bg-surface px-5 py-8 text-on-surface pt-safe pb-safe pl-safe pr-safe">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary-container/30 to-transparent"
      />

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 flex w-full max-w-md flex-col items-center rounded-3xl border border-outline-variant bg-surface-container-low p-6 shadow-xl sm:p-8"
      >
        <div
          role="radiogroup"
          aria-label={t('Pilih bahasa aplikasi', 'Switch app language')}
          className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-xl border border-outline-variant bg-surface p-0.5"
        >
          <Globe className="ml-1.5 h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
          {(['id', 'en'] as readonly AppLanguage[]).map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={lang === code}
              onClick={() => {
                vibrateTap();
                setLang(code);
              }}
              className={`min-h-[30px] rounded-lg px-2 py-0.5 font-mono text-[11px] font-bold uppercase transition-colors ${
                lang === code
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-[#f6f5f0] p-2 shadow-xs dark:border-white/15 dark:bg-[#eae7df]">
          {!logoFailed ? (
            <img
              src={BRAND_ASSETS.logoPath}
              alt="Logo UtamaGo!"
              referrerPolicy="no-referrer"
              draggable={false}
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-contain mix-blend-multiply"
            />
          ) : (
            <span className="font-display text-lg font-extrabold text-zinc-900">
              Utama<span className="text-red-600">Go!</span>
            </span>
          )}
        </div>

        <span className="mt-4 rounded-md border border-primary/35 bg-primary-container/60 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase text-on-primary-container">
          {t('Versi Beta Tester', 'Beta Tester Build')}
        </span>
        <h1 className="mt-2.5 text-center font-display text-2xl font-extrabold tracking-tight text-on-surface">
          {headingTitle}
        </h1>
        <p className="mt-1.5 text-center text-xs leading-relaxed text-on-surface-variant sm:text-sm">
          {headingSubtitle}
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex w-full items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary-container/50 p-3.5 text-left text-xs leading-relaxed text-on-primary-container"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>{errorMessage}</span>
          </div>
        )}

        {resetSentEmail && (
          <div
            role="status"
            className="mt-4 flex w-full items-start gap-2.5 rounded-2xl border border-success/30 bg-success-container p-3.5 text-left text-xs leading-relaxed text-on-success-container"
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-success"
              aria-hidden="true"
            />
            <span>
              {t(
                'Tautan reset password telah dikirim ke ',
                'A password reset link has been sent to ',
              )}
              <strong>{resetSentEmail}</strong>
              {t(
                '. Cek kotak masuk atau folder Spam di emailmu, lalu klik tautan tersebut untuk mengatur password baru.',
                '. Check your inbox or Spam folder and click the link to set a new password.',
              )}
            </span>
          </div>
        )}

        {mode === 'login' && (
          <form
            onSubmit={(e) => void handleLoginSubmit(e)}
            className="mt-6 w-full space-y-4 text-left"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="login-username"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface"
              >
                <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>{t('Username', 'Username')}</span>
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                value={usernameInput}
                maxLength={EMAIL_MAX_LENGTH}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t(
                  'Masukkan username atau email',
                  'Enter username or email',
                )}
                className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="login-password"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface"
                >
                  <KeyRound
                    className="h-3.5 w-3.5 text-primary"
                    aria-hidden="true"
                  />
                  <span>{t('Password', 'Password')}</span>
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {t('Lupa password?', 'Forgot password?')}
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwordInput}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder={t('Masukkan password', 'Enter password')}
                  className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface py-2.5 pr-12 pl-4 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? t('Sembunyikan password', 'Hide password')
                      : t('Lihat password', 'Show password')
                  }
                  className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="m3-tactile inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-on-primary shadow-sm hover:bg-primary-hover disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>
                {submitting
                  ? t('Memproses...', 'Signing in...')
                  : t('Masuk', 'Sign In')}
              </span>
            </button>

            <div className="border-t border-outline-variant pt-4 text-center">
              <p className="text-xs text-on-surface-variant">
                {t('Belum punya akun?', "Don't have an account?")}
              </p>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="m3-tactile mt-2 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-surface px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container"
              >
                <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{t('Buat Akun Baru', 'Create New Account')}</span>
              </button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form
            onSubmit={(e) => void handleRegisterSubmit(e)}
            className="mt-6 w-full space-y-4 text-left"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="register-username"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface"
              >
                <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>{t('Username', 'Username')}</span>
              </label>
              <input
                id="register-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                value={usernameInput}
                maxLength={USERNAME_MAX_LENGTH}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t('contoh: budi_jlpt', 'e.g. budi_jlpt')}
                className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
              />
              <p className="text-[11px] text-on-surface-variant">
                {t(
                  '3–24 karakter: huruf kecil, angka, titik (.), atau garis bawah (_).',
                  '3–24 characters: lowercase letters, numbers, dot (.), or underscore (_).',
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-email"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface"
              >
                <Mail className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Email</span>
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                value={emailInput}
                maxLength={EMAIL_MAX_LENGTH}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t('nama@gmail.com', 'name@example.com')}
                className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
              />
              <p className="text-[11px] text-on-surface-variant">
                {t(
                  'Digunakan untuk mengirim link jika kamu lupa password.',
                  'Used to send a recovery link if you forget your password.',
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-password"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface"
              >
                <KeyRound
                  className="h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordInput}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder={t('Minimal 6 karakter', 'Minimum 6 characters')}
                  className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface py-2.5 pr-12 pl-4 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? t('Sembunyikan password', 'Hide password')
                      : t('Lihat password', 'Show password')
                  }
                  className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="m3-tactile inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-on-primary shadow-sm hover:bg-primary-hover disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>
                {submitting
                  ? t('Membuat Akun...', 'Creating Account...')
                  : t('Daftar & Masuk', 'Sign Up & Sign In')}
              </span>
            </button>

            <div className="border-t border-outline-variant pt-4 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-outline bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>
                  {t('Sudah Punya Akun? Masuk', 'Already Have an Account? Sign In')}
                </span>
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form
            onSubmit={(e) => void handleForgotSubmit(e)}
            className="mt-6 w-full space-y-4 text-left"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="forgot-email"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface"
              >
                <Mail className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>{t('Email Akun', 'Account Email')}</span>
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                value={emailInput}
                maxLength={EMAIL_MAX_LENGTH}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t('nama@gmail.com', 'name@example.com')}
                className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="m3-tactile inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-on-primary shadow-sm hover:bg-primary-hover disabled:opacity-60"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span>
                {submitting
                  ? t('Mengirim Email...', 'Sending Email...')
                  : t('Kirim Link Reset Password', 'Send Password Reset Link')}
              </span>
            </button>

            <div className="border-t border-outline-variant pt-4 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-outline bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>
                  {t('Kembali ke Halaman Masuk', 'Back to Sign In')}
                </span>
              </button>
            </div>
          </form>
        )}

        {mode !== 'forgot' && (
          <div className="mt-5 w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3.5 text-left">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {t('Materi & Fitur Tersedia', 'Included Study Features')}
              </span>
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-on-surface-variant">
              <li>
                ·{' '}
                <strong className="text-on-surface">
                  {t('Anki Kosakata JLPT N5–N1', 'JLPT N5–N1 Anki Vocabulary')}
                </strong>{' '}
                {t(
                  '(7.413 kartu berjadwal SRS, contoh kalimat & audio pelafalan)',
                  '(7,413 SRS flashcards with example sentences & pronunciation audio)',
                )}
              </li>
              <li>
                ·{' '}
                <strong className="text-on-surface">
                  {t(
                    'Materi & Anki Bunpou JLPT N5–N1',
                    'JLPT N5–N1 Grammar & Anki Bunpou',
                  )}
                </strong>{' '}
                {t(
                  '(553 pola lengkap rumus, nuansa, contoh kalimat & komparasi lintas level)',
                  '(553 patterns with formulas, nuances, examples & cross-level comparisons)',
                )}
              </li>
              <li>
                ·{' '}
                <strong className="text-on-surface">
                  {t(
                    'Arena Tantangan 30 Stage & Studio Menulis',
                    '30-Stage Challenge Arena & Writing Studio',
                  )}
                </strong>{' '}
                {t(
                  '(Mode Blitz, Survival, Susun Kalimat, Tebak Audio, Boss Stage N5–N1, serta latihan menulis Kana/Kanji & Kamus N5–N1)',
                  '(Blitz, Survival, Sentence Builder, Audio Quiz, Boss Stages N5–N1, plus Kana/Kanji Writing & N5–N1 Dictionary)',
                )}
              </li>
              <li>
                ·{' '}
                <strong className="text-on-surface">
                  {t(
                    'Try Out JLPT N3, N2 & N1 Terverifikasi (15 paket)',
                    'Verified JLPT N3, N2 & N1 Mock Exams (15 sets)',
                  )}
                </strong>{' '}
                {t(
                  'lengkap soal asli, kunci jawaban resmi, audio & transkrip Choukai (5 N3 · 6 N2 · 4 N1)',
                  'with real exam items, official answer keys, Choukai audio & transcripts (5 N3 · 6 N2 · 4 N1)',
                )}
              </li>
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  );
}
