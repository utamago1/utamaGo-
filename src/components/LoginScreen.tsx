import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BRAND_ASSETS } from '../data/utamagoContent';
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
      ? 'Buat Akun UtamaGo!'
      : mode === 'forgot'
        ? 'Lupa Password'
        : 'Masuk ke UtamaGo!';

  const headingSubtitle =
    mode === 'register'
      ? 'Daftar gratis untuk belajar JLPT N5–N1, flashcard Anki, Bunpou N5–N1, dan 15 paket Try Out JLPT N3, N2 & N1 terverifikasi.'
      : mode === 'forgot'
        ? 'Masukkan email yang kamu daftarkan. Kami akan mengirimkan tautan untuk membuat password baru.'
        : 'Masuk menggunakan username dan password untuk melanjutkan belajar JLPT N5–N1.';

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

        <span className="mt-4 rounded-md border border-primary/35 bg-primary-container/60 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase text-primary">
          Versi Beta Tester
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
              Tautan reset password telah dikirim ke{' '}
              <strong>{resetSentEmail}</strong>. Cek kotak masuk atau folder
              Spam di emailmu, lalu klik tautan tersebut untuk mengatur password
              baru.
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
                <span>Username</span>
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
                placeholder="Masukkan username atau email"
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
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Lupa password?
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
                  placeholder="Masukkan password"
                  className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface py-2.5 pr-12 pl-4 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? 'Sembunyikan password' : 'Lihat password'
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
              <span>{submitting ? 'Memproses...' : 'Masuk'}</span>
            </button>

            <div className="border-t border-outline-variant pt-4 text-center">
              <p className="text-xs text-on-surface-variant">
                Belum punya akun?
              </p>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="m3-tactile mt-2 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-surface px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container"
              >
                <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Buat Akun Baru</span>
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
                <span>Username</span>
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
                placeholder="contoh: budi_jlpt"
                className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
              />
              <p className="text-[11px] text-on-surface-variant">
                3–24 karakter: huruf kecil, angka, titik (.), atau garis bawah
                (_).
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
                placeholder="nama@gmail.com"
                className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
              />
              <p className="text-[11px] text-on-surface-variant">
                Digunakan untuk mengirim link jika kamu lupa password.
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
                  placeholder="Minimal 6 karakter"
                  className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface py-2.5 pr-12 pl-4 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? 'Sembunyikan password' : 'Lihat password'
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
              <span>{submitting ? 'Membuat Akun...' : 'Daftar & Masuk'}</span>
            </button>

            <div className="border-t border-outline-variant pt-4 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-outline bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Sudah Punya Akun? Masuk</span>
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
                <span>Email Akun</span>
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
                placeholder="nama@gmail.com"
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
                {submitting ? 'Mengirim Email...' : 'Kirim Link Reset Password'}
              </span>
            </button>

            <div className="border-t border-outline-variant pt-4 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-outline bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Kembali ke Halaman Masuk</span>
              </button>
            </div>
          </form>
        )}

        {mode !== 'forgot' && (
          <div className="mt-5 w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3.5 text-left">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Materi &amp; Fitur Tersedia</span>
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-on-surface-variant">
              <li>
                · <strong className="text-on-surface">Anki Kosakata JLPT N5–N1</strong>{' '}
                (7.413 kartu, 2 contoh kalimat &amp; geser kiri/kanan)
              </li>
              <li>
                · <strong className="text-on-surface">Materi &amp; Anki Bunpou JLPT N5–N1</strong>{' '}
                (553 pola: N5 72, N4 99, N3 144, N2 141, N1 97 lengkap rumus, contoh kalimat &amp; komparasi lintas level)
              </li>
              <li>
                · <strong className="text-on-surface">Try Out JLPT N3, N2 &amp; N1 Terverifikasi (15 paket)</strong>{' '}
                lengkap soal asli, kunci jawaban resmi, audio &amp; transkrip Choukai (5 N3 · 6 N2 · 4 N1)
              </li>
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  );
}
