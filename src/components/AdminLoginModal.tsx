import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  getFirebaseAdminAuthState,
  reloadFirebaseAdminAuthState,
  sendAdminVerificationEmail,
  type FirebaseAdminAuthState,
} from '../services/betaFeedback';
import {
  FeedbackInboxApiError,
  fetchAdminInboxStatus,
  FIREBASE_ADMIN_TOKEN,
  loginAdminInbox,
  setupAdminInboxPassword,
  type AdminInboxStatus,
} from '../services/feedbackInboxApi';
import { vibrateError, vibrateSuccess, vibrateTap } from '../utils/haptics';

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (token: string) => void;
}

export function AdminLoginModal({
  open,
  onClose,
  onAuthenticated,
}: AdminLoginModalProps) {
  const { t } = useLanguage();
  const [statusLoading, setStatusLoading] = useState(false);
  const [inboxStatus, setInboxStatus] = useState<AdminInboxStatus | null>(null);
  const [firebaseAdmin, setFirebaseAdmin] =
    useState<FirebaseAdminAuthState | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const [checkingVerify, setCheckingVerify] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setErrorMessage(null);
    setVerifySent(false);
    setStatusLoading(true);

    void Promise.all([fetchAdminInboxStatus(), getFirebaseAdminAuthState()])
      .then(([status, fbState]) => {
        if (!cancelled) {
          setInboxStatus(status);
          setFirebaseAdmin(fbState);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : t(
                  'Gagal memeriksa status akses admin.',
                  'Failed to check admin access status.',
                ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStatusLoading(false);
          window.setTimeout(() => {
            inputRef.current?.focus();
          }, 60);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, t]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const serverAvailable = inboxStatus?.serverAvailable ?? false;
  const isFirstRunSetup = serverAvailable && inboxStatus?.mode === 'unclaimed';
  const canUnlockViaFirebase = Boolean(firebaseAdmin?.isAdmin);
  const needsEmailVerification = Boolean(
    firebaseAdmin?.signedIn &&
      firebaseAdmin.isBootstrapEmail &&
      !firebaseAdmin.emailVerified &&
      !firebaseAdmin.isAdmin,
  );

  const handleUnlockFirebaseAdmin = () => {
    vibrateSuccess();
    onAuthenticated(FIREBASE_ADMIN_TOKEN);
  };

  const handleSendVerification = async () => {
    vibrateTap();
    setSendingVerify(true);
    setErrorMessage(null);
    try {
      await sendAdminVerificationEmail();
      vibrateSuccess();
      setVerifySent(true);
    } catch (err) {
      vibrateError();
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t(
              'Gagal mengirim email verifikasi. Coba beberapa saat lagi.',
              'Failed to send verification email. Please try again later.',
            ),
      );
    } finally {
      setSendingVerify(false);
    }
  };

  const handleRecheckVerification = async () => {
    vibrateTap();
    setCheckingVerify(true);
    setErrorMessage(null);
    try {
      const next = await reloadFirebaseAdminAuthState();
      setFirebaseAdmin(next);
      if (next.isAdmin) {
        vibrateSuccess();
        onAuthenticated(FIREBASE_ADMIN_TOKEN);
      } else {
        setErrorMessage(
          t(
            'Email belum terverifikasi. Klik tautan verifikasi di inbox Gmail Anda terlebih dahulu, lalu tekan Cek Ulang.',
            'Email is not verified yet. Click the verification link in your Gmail inbox first, then tap Re-check.',
          ),
        );
      }
    } catch {
      vibrateError();
      setErrorMessage(
        t(
          'Gagal memeriksa ulang status verifikasi.',
          'Failed to re-check verification status.',
        ),
      );
    } finally {
      setCheckingVerify(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    vibrateTap();
    setErrorMessage(null);

    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMessage(
        t(
          'Masukkan password admin terlebih dahulu.',
          'Please enter the admin password.',
        ),
      );
      return;
    }

    if (isFirstRunSetup) {
      if (trimmed.length < 4) {
        setErrorMessage(
          t(
            'Password admin minimal 4 karakter.',
            'Admin password must be at least 4 characters.',
          ),
        );
        return;
      }
      if (trimmed !== confirmPassword.trim()) {
        setErrorMessage(
          t(
            'Konfirmasi password tidak cocok.',
            'Password confirmation does not match.',
          ),
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = isFirstRunSetup
        ? await setupAdminInboxPassword(trimmed, confirmPassword.trim())
        : await loginAdminInbox(trimmed);

      vibrateSuccess();
      setPassword('');
      setConfirmPassword('');
      onAuthenticated(result.token);
    } catch (err) {
      vibrateError();
      if (err instanceof FeedbackInboxApiError && err.needsSetup) {
        setInboxStatus({
          mode: 'unclaimed',
          configured: false,
          authenticated: false,
          serverAvailable: true,
        });
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t('Password admin salah.', 'Incorrect admin password.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-zinc-950/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
        className="w-full max-w-sm overflow-hidden rounded-t-3xl border border-outline-variant bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary">
              {canUnlockViaFirebase || isFirstRunSetup ? (
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Lock className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <h2
                id="admin-login-title"
                className="font-display text-base font-extrabold text-on-surface"
              >
                {isFirstRunSetup
                  ? t('Atur Password Admin', 'Set Up Admin Password')
                  : t('Login Halaman Admin', 'Admin Console Login')}
              </h2>
              <p className="text-[11px] font-medium text-on-surface-variant">
                {canUnlockViaFirebase
                  ? t(
                      'Akun admin terverifikasi siap membuka Halaman Admin',
                      'Verified admin account ready to open Admin Console',
                    )
                  : isFirstRunSetup
                    ? t(
                        'Pengaturan pertama kali untuk membuka Halaman Admin',
                        'One-time setup to unlock the hidden Admin Console',
                      )
                    : t(
                        'Akses khusus admin: data pendaftar, progres & laporan bug',
                        'Admin access: registered users, progress & bug reports',
                      )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            aria-label={t('Tutup login admin', 'Close admin login')}
            className="m3-tactile inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {statusLoading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-6 text-on-surface-variant">
              <Loader2
                className="h-6 w-6 animate-spin text-primary"
                aria-hidden="true"
              />
              <span className="text-xs font-medium">
                {t('Memeriksa akses admin...', 'Checking admin access...')}
              </span>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1-tap Firebase verified admin unlock (works on Vercel & AI Studio) */}
              {canUnlockViaFirebase && (
                <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <div className="text-xs leading-relaxed text-emerald-950 dark:text-emerald-100">
                      <p className="font-bold">
                        {t('Akun Admin Terdeteksi', 'Admin Account Detected')}
                      </p>
                      <p className="mt-0.5 text-[11px] opacity-85">
                        {firebaseAdmin?.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnlockFirebaseAdmin}
                    className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-extrabold text-on-primary shadow-xs hover:bg-primary-hover"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {t(
                        'Buka Halaman Admin Sekarang',
                        'Open Admin Console Now',
                      )}
                    </span>
                  </button>
                </div>
              )}

              {/* Signed in as admin email, just needs 1-time Firebase email verification */}
              {needsEmailVerification && (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/30">
                  <div className="flex items-start gap-2.5">
                    <MailCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    <div className="space-y-1 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                      <p className="font-bold">
                        {t(
                          'Verifikasi Email Admin Sekali Saja',
                          'One-Time Admin Email Verification',
                        )}
                      </p>
                      <p className="text-[11px] opacity-90">
                        {t(
                          `Akun ${firebaseAdmin?.email} terdeteksi sebagai admin, tetapi emailnya belum diverifikasi di Firebase. Klik tombol di bawah lalu buka tautan di Gmail Anda.`,
                          `Account ${firebaseAdmin?.email} is recognized as admin, but its email is not yet verified in Firebase. Tap below and open the link in Gmail.`,
                        )}
                      </p>
                    </div>
                  </div>

                  {verifySent && (
                    <p className="rounded-xl bg-white/80 px-3 py-2 text-[11px] font-semibold text-emerald-700 dark:bg-zinc-900/60 dark:text-emerald-300">
                      {t(
                        'Tautan verifikasi sudah dikirim! Cek Gmail (atau folder Spam), klik tautannya, lalu tekan tombol "Sudah Verifikasi".',
                        'Verification link sent! Check Gmail (or Spam), click the link, then tap "I Verified".',
                      )}
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={sendingVerify}
                      onClick={() => void handleSendVerification()}
                      className="m3-tactile inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-on-primary shadow-xs hover:bg-primary-hover disabled:opacity-60"
                    >
                      {sendingVerify ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <MailCheck className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span>
                        {verifySent
                          ? t('Kirim Ulang Email Verifikasi', 'Resend Verification Email')
                          : t('Kirim Email Verifikasi', 'Send Verification Email')}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={checkingVerify}
                      onClick={() => void handleRecheckVerification()}
                      className="m3-tactile inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-60"
                    >
                      {checkingVerify ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {t(
                          'Sudah Verifikasi? Cek & Buka',
                          'Already Verified? Check & Open',
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Static hosting (Vercel) without server backend and not signed in as admin */}
              {!serverAvailable &&
                !canUnlockViaFirebase &&
                !needsEmailVerification && (
                  <div className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-xs leading-relaxed text-on-surface-variant">
                    <p className="font-bold text-on-surface">
                      {t(
                        'Masuk dengan Akun Admin UtamaGo!',
                        'Sign In with the UtamaGo! Admin Account',
                      )}
                    </p>
                    <p>
                      {t(
                        `Untuk membuka Halaman Admin (data pendaftar, progres & laporan bug) di versi web ini, keluar dulu dari akun saat ini (${firebaseAdmin?.email || 'belum login'}) lalu login menggunakan email admin ${BOOTSTRAP_ADMIN_EMAIL}.`,
                        `To open the Admin Console (users, progress & bug reports) on this web deployment, sign out from the current account (${firebaseAdmin?.email || 'signed out'}) and sign in with admin email ${BOOTSTRAP_ADMIN_EMAIL}.`,
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        onClose();
                      }}
                      className="m3-tactile inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-outline-variant bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
                    >
                      {t('Mengerti', 'Got It')}
                    </button>
                  </div>
                )}

              {/* Server password login / first-run setup (when Express backend is available) */}
              {serverAvailable && (
                <form
                  onSubmit={(e) => void handleSubmit(e)}
                  className="space-y-4"
                >
                  {canUnlockViaFirebase && (
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-on-surface-variant">
                      <span className="h-px flex-1 bg-outline-variant" />
                      <span>
                        {t('atau pakai password server', 'or use server password')}
                      </span>
                      <span className="h-px flex-1 bg-outline-variant" />
                    </div>
                  )}

                  {isFirstRunSetup && (
                    <div className="rounded-2xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs leading-relaxed text-on-surface-variant">
                      {t(
                        'Buat password admin sekali di sini untuk mengaktifkan Halaman Admin tersembunyi. Password disimpan aman dalam bentuk hash di server.',
                        'Create your admin password once here to unlock the hidden Admin Console. It is stored securely as a salted hash on the server.',
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label
                      htmlFor="admin-inbox-password"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface"
                    >
                      <KeyRound
                        className="h-3.5 w-3.5 text-primary"
                        aria-hidden="true"
                      />
                      <span>
                        {isFirstRunSetup
                          ? t('Password Admin Baru', 'New Admin Password')
                          : t('Password Admin', 'Admin Password')}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        ref={inputRef}
                        id="admin-inbox-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={
                          isFirstRunSetup ? 'new-password' : 'current-password'
                        }
                        value={password}
                        maxLength={128}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder={t(
                          'Masukkan password admin',
                          'Enter admin password',
                        )}
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

                  {isFirstRunSetup && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="admin-inbox-password-confirm"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface"
                      >
                        <KeyRound
                          className="h-3.5 w-3.5 text-primary"
                          aria-hidden="true"
                        />
                        <span>
                          {t(
                            'Ulangi Password Admin',
                            'Confirm Admin Password',
                          )}
                        </span>
                      </label>
                      <input
                        id="admin-inbox-password-confirm"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        maxLength={128}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder={t(
                          'Ketik ulang password admin',
                          'Re-enter admin password',
                        )}
                        className="min-h-[48px] w-full rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        onClose();
                      }}
                      className="m3-tactile inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
                    >
                      {t('Batal', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2 text-xs font-extrabold text-on-primary shadow-xs hover:bg-primary-hover disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          <span>{t('Memverifikasi...', 'Verifying...')}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {isFirstRunSetup
                              ? t('Simpan & Buka Admin', 'Save & Open Admin')
                              : t('Buka Halaman Admin', 'Open Admin Console')}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
