/**
 * Client-side content & inspect deterrent for UtamaGo!.
 *
 * Blocks casual right-click context menus, DevTools / View Source / Save / Print
 * keyboard shortcuts, and bulk text copying/dragging while preserving normal typing
 * and editing inside `<input>`, `<textarea>`, and `[contenteditable]` fields.
 */

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, [contenteditable="true"]'));
}

export function installContentProtection(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const handleContextMenu = (e: MouseEvent) => {
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    const isInspectShortcut =
      key === 'F12' ||
      (ctrlOrMeta && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || key === 'K')) ||
      (ctrlOrMeta && e.altKey && (key === 'I' || key === 'J' || key === 'C' || key === 'U')) ||
      (ctrlOrMeta && (key === 'U' || key === 'S' || key === 'P'));

    if (isInspectShortcut) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Block Ctrl/Cmd+C, Ctrl/Cmd+X, Ctrl/Cmd+A outside text input fields
    if (ctrlOrMeta && (key === 'C' || key === 'X' || key === 'A') && !isEditableTarget(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleCopyOrCut = (e: ClipboardEvent) => {
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
  };

  const handleDragStart = (e: DragEvent) => {
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
  };

  const handleSelectStart = (e: Event) => {
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
  };

  document.addEventListener('contextmenu', handleContextMenu, { capture: true });
  document.addEventListener('keydown', handleKeyDown, { capture: true });
  document.addEventListener('copy', handleCopyOrCut, { capture: true });
  document.addEventListener('cut', handleCopyOrCut, { capture: true });
  document.addEventListener('dragstart', handleDragStart, { capture: true });
  document.addEventListener('selectstart', handleSelectStart, { capture: true });

  return () => {
    document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    document.removeEventListener('keydown', handleKeyDown, { capture: true });
    document.removeEventListener('copy', handleCopyOrCut, { capture: true });
    document.removeEventListener('cut', handleCopyOrCut, { capture: true });
    document.removeEventListener('dragstart', handleDragStart, { capture: true });
    document.removeEventListener('selectstart', handleSelectStart, { capture: true });
  };
}
