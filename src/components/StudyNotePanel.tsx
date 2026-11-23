import { useEffect, useState } from 'react';
import { Bookmark, Check, StickyNote, Trash2 } from 'lucide-react';
import { vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  STUDY_NOTE_MAX_LENGTH,
  type StudyNoteEntry,
} from '../utils/studyNotes';

interface StudyNotePanelProps {
  itemId: string;
  entry: StudyNoteEntry;
  onToggleBookmark: () => void;
  onSaveNote: (note: string) => void;
  placeholder?: string;
  compact?: boolean;
  className?: string;
}

export function StudyNotePanel({
  itemId,
  entry,
  onToggleBookmark,
  onSaveNote,
  placeholder = 'Tulis catatan pribadi, trik hafalan, atau perbedaan nuansa...',
  compact = false,
  className = '',
}: StudyNotePanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.note);

  // Sync draft when switching to a different Bunpou / Vocab item
  useEffect(() => {
    setEditing(false);
    setDraft(entry.note);
  }, [itemId, entry.note]);

  const handleOpenEditor = () => {
    vibrateTap();
    setDraft(entry.note);
    setEditing(true);
  };

  const handleSave = () => {
    vibrateSuccess();
    onSaveNote(draft);
    setEditing(false);
  };

  const handleDeleteNote = () => {
    vibrateTap();
    onSaveNote('');
    setDraft('');
    setEditing(false);
  };

  const hasNote = entry.note.length > 0;

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            vibrateTap();
            onToggleBookmark();
          }}
          aria-pressed={entry.bookmarked}
          className={`m3-tactile inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
            entry.bookmarked
              ? 'border-amber-500/45 bg-amber-50 text-amber-900 hover:bg-amber-100/80'
              : 'border-outline-variant bg-surface text-on-surface hover:border-outline hover:bg-surface-container'
          }`}
        >
          <Bookmark
            className={`h-4 w-4 shrink-0 ${
              entry.bookmarked
                ? 'fill-amber-500 text-amber-600'
                : 'text-on-surface-variant'
            }`}
            aria-hidden="true"
          />
          <span>{entry.bookmarked ? 'Tersimpan' : 'Simpan'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (editing) {
              vibrateTap();
              setEditing(false);
              setDraft(entry.note);
            } else {
              handleOpenEditor();
            }
          }}
          aria-expanded={editing}
          className={`m3-tactile inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
            editing || hasNote
              ? 'border-amber-500/40 bg-amber-50/70 text-amber-900 hover:bg-amber-100/70'
              : 'border-outline-variant bg-surface text-on-surface hover:border-outline hover:bg-surface-container'
          }`}
        >
          <StickyNote
            className={`h-4 w-4 shrink-0 ${
              hasNote || editing ? 'text-amber-600' : 'text-on-surface-variant'
            }`}
            aria-hidden="true"
          />
          <span>
            {editing
              ? 'Tutup Editor'
              : hasNote
                ? 'Edit Catatan'
                : 'Catatan Pribadi'}
          </span>
        </button>
      </div>

      {!editing && hasNote && (
        <div className="rounded-xl border border-amber-500/25 border-l-4 border-l-amber-500 bg-amber-50/60 px-3.5 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[11px] font-bold tracking-wide text-amber-900/80">
                Catatan Pribadi
              </p>
              <p
                className={`${
                  compact ? 'text-xs' : 'text-sm'
                } whitespace-pre-wrap break-words leading-relaxed text-on-surface`}
              >
                {entry.note}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenEditor}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200/50"
            >
              Ubah
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="space-y-2.5 rounded-2xl border border-outline-variant bg-surface p-3.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={`study-note-input-${itemId}`}
              className="text-xs font-bold text-on-surface"
            >
              Catatan Pribadi
            </label>
            <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
              {draft.length}/{STUDY_NOTE_MAX_LENGTH}
            </span>
          </div>

          <textarea
            id={`study-note-input-${itemId}`}
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.slice(0, STUDY_NOTE_MAX_LENGTH))
            }
            rows={compact ? 2 : 3}
            maxLength={STUDY_NOTE_MAX_LENGTH}
            placeholder={placeholder}
            className="w-full resize-y rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant/75 focus:border-primary focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            {hasNote ? (
              <button
                type="button"
                onClick={handleDeleteNote}
                className="m3-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface-variant hover:border-primary/40 hover:text-primary"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Hapus</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setDraft(entry.note);
                  setEditing(false);
                }}
                className="m3-tactile inline-flex min-h-[44px] items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2 text-xs font-semibold text-on-surface hover:border-outline"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Simpan Catatan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
