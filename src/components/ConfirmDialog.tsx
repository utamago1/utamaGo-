import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  secondaryLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onSecondary?: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Ya, Keluar',
  secondaryLabel,
  cancelLabel = 'Lanjut Belajar',
  tone = 'danger',
  onConfirm,
  onSecondary,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const hasSecondary = Boolean(secondaryLabel && onSecondary);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm rounded-3xl border border-outline-variant bg-surface-container-low p-6 shadow-xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>

        <h3
          id="confirm-dialog-title"
          className="mt-4 font-display text-lg font-extrabold text-on-surface"
        >
          {title}
        </h3>
        <p
          id="confirm-dialog-desc"
          className="mt-2 text-sm leading-relaxed text-on-surface-variant"
        >
          {description}
        </p>

        {hasSecondary ? (
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onConfirm}
              className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={onSecondary}
              className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-primary/40 bg-primary-container/45 px-4 py-2.5 text-sm font-bold text-on-primary-container hover:bg-primary-container/70"
            >
              {secondaryLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-outline bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high"
            >
              {cancelLabel}
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="m3-tactile inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-outline bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`m3-tactile inline-flex min-h-[48px] items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-bold text-on-primary ${
                tone === 'danger'
                  ? 'bg-primary text-on-primary hover:bg-primary-hover'
                  : 'bg-inverse-surface text-inverse-on-surface hover:opacity-90'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
