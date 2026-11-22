import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const HAPTICS_STORAGE_KEY = 'utamago_haptics_enabled_v1';

let hapticsEnabledCache: boolean | null = null;
let lastHapticTimestamp = 0;

function isNativeCapacitor(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isHapticsSupported(): boolean {
  if (isNativeCapacitor()) return true;
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

export function getHapticsEnabled(): boolean {
  if (hapticsEnabledCache !== null) return hapticsEnabledCache;
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(HAPTICS_STORAGE_KEY);
    hapticsEnabledCache = raw === null ? true : raw === 'true';
  } catch {
    hapticsEnabledCache = true;
  }
  return hapticsEnabledCache;
}

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabledCache = enabled;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage failures
  }
}

function canFireHaptic(cooldownMs = 35): boolean {
  if (!getHapticsEnabled()) return false;
  const now = Date.now();
  if (now - lastHapticTimestamp < cooldownMs) return false;
  lastHapticTimestamp = now;
  return true;
}

export function vibrateTap(): void {
  if (!canFireHaptic(35)) return;
  if (isNativeCapacitor()) {
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    return;
  }
  if (!isHapticsSupported()) return;
  try {
    navigator.vibrate(15);
  } catch {
    // Ignore haptic failures in restricted WebViews
  }
}

export function vibrateSelection(): void {
  if (!canFireHaptic(30)) return;
  if (isNativeCapacitor()) {
    void Haptics.selectionChanged().catch(() => {
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    });
    return;
  }
  if (!isHapticsSupported()) return;
  try {
    navigator.vibrate(12);
  } catch {
    // Ignore haptic failures in restricted WebViews
  }
}

export function vibrateMedium(): void {
  if (!canFireHaptic(35)) return;
  if (isNativeCapacitor()) {
    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    return;
  }
  if (!isHapticsSupported()) return;
  try {
    navigator.vibrate(24);
  } catch {
    // Ignore haptic failures in restricted WebViews
  }
}

export function vibrateSuccess(): void {
  if (!getHapticsEnabled()) return;
  lastHapticTimestamp = Date.now();
  if (isNativeCapacitor()) {
    void Haptics.notification({ type: NotificationType.Success }).catch(
      () => {},
    );
    return;
  }
  if (!isHapticsSupported()) return;
  try {
    navigator.vibrate([16, 42, 26]);
  } catch {
    // Ignore haptic failures in restricted WebViews
  }
}

export function vibrateError(): void {
  if (!getHapticsEnabled()) return;
  lastHapticTimestamp = Date.now();
  if (isNativeCapacitor()) {
    void Haptics.notification({ type: NotificationType.Error }).catch(() => {});
    return;
  }
  if (!isHapticsSupported()) return;
  try {
    navigator.vibrate([30, 45, 30]);
  } catch {
    // Ignore haptic failures in restricted WebViews
  }
}

const INTERACTIVE_SELECTOR =
  'button:not(:disabled), [role="button"]:not([aria-disabled="true"]), [role="tab"], [role="radio"], [role="switch"], a[href]';

/**
 * Attaches a lightweight document-level tactile haptic delegate so every button,
 * tab, radio option, switch, and navigation link feels responsive on touch/click.
 * Cooldown deduplication prevents double-buzzing when handlers also call vibrateSuccess/Error.
 */
export function attachGlobalHapticsListener(): () => void {
  if (typeof document === 'undefined') return () => {};

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (!(event.target instanceof Element)) return;
    const interactive = event.target.closest(INTERACTIVE_SELECTOR);
    if (!interactive) return;

    const role = interactive.getAttribute('role');
    if (role === 'tab' || role === 'radio' || role === 'switch') {
      vibrateSelection();
    } else {
      vibrateTap();
    }
  };

  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown);
  };
}
