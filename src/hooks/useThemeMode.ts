import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  safeStorageGet,
  safeStorageSet,
  THEME_STORAGE_KEY,
} from '../utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

const LIGHT_BG_COLOR = '#fafaf8';
const DARK_BG_COLOR = '#111114';

function readStoredThemeMode(): ThemeMode {
  const saved = safeStorageGet(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'light';
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeToDocument(isDark: boolean): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? DARK_BG_COLOR : LIGHT_BG_COLOR);
    }
  }

  try {
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light,
      }).catch(() => {});
      void StatusBar.setBackgroundColor({
        color: isDark ? DARK_BG_COLOR : LIGHT_BG_COLOR,
      }).catch(() => {});
    }
  } catch {
    // Ignore outside Capacitor native shell
  }
}

export function useThemeMode() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    readStoredThemeMode(),
  );
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    getSystemPrefersDark(),
  );

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemDark);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };
    setSystemDark(mq.matches);
    mq.addEventListener?.('change', handleChange);
    return () => {
      mq.removeEventListener?.('change', handleChange);
    };
  }, []);

  useEffect(() => {
    safeStorageSet(THEME_STORAGE_KEY, themeMode);
    applyThemeToDocument(isDark);
  }, [themeMode, isDark]);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setThemeModeState(nextMode);
    safeStorageSet(THEME_STORAGE_KEY, nextMode);
  }, []);

  const toggleDarkLight = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  return {
    themeMode,
    isDark,
    setThemeMode,
    toggleDarkLight,
  };
}
