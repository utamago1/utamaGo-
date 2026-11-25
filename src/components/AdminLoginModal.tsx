import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  FeedbackInboxApiError,
  fetchAdminInboxStatus,
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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setErrorMessage(null);
    setStatusLoading(true);

    void fetchAdminInboxStatus()
      .then((status) => {
        if (!cancelled) {
          setInboxStatus(status);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : t(
                  'Gagal terhubung ke server admin.',
                  'Failed to connect to admin server.',
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

  const isFirstRunSetup = inboxStatus?.mode === 'unclaimed';

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
              {isFirstRunSetup ? (
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
                  : t('Login Admin Pesan', 'Admin Inbox Login')}
              </h2>
              <p className="text-[11px] font-medium text-on-surface-variant">
                {isFirstRunSetup
                  ? t(
                      'Pengaturan pertama kali untuk membuka tab Pesan',
                      'One-time setup to unlock the hidden Messages tab',
                    )
                  : t(
                      'Masukkan password untuk membuka tab Pesan laporan',
                      'Enter password to open the hidden reports tab',
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

        <div className="px-5 py-5">
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
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {isFirstRunSetup && (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs leading-relaxed text-on-surface-variant">
                  {t(
                    'Buat password admin sekali di sini untuk mengaktifkan tab Pesan tersembunyi. Password disimpan aman dalam bentuk hash di server.',
                    'Create your admin password once here to unlock the hidden Messages tab. It is stored securely as a salted hash on the server.',
                  )}
                </div>
              )}

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
                      {t('Ulangi Password Admin', 'Confirm Admin Password')}
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
                          ? t('Simpan & Buka Pesan', 'Save & Open Inbox')
                          : t('Buka Tab Pesan', 'Open Messages Tab')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
