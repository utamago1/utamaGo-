import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  safeStorageGet,
  safeStorageSet,
  THEME_STORAGE_KEY,
} from '../utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadInitialThemeMode(): ThemeMode {
  const saved = safeStorageGet(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

export function useThemeMode() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(loadInitialThemeMode);
  const [systemDark, setSystemDark] = useState<boolean>(getSystemPrefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemDark(media.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemDark);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';

    const bgColor = isDark ? '#09090b' : '#fafafa';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', bgColor);
    }

    try {
      if (Capacitor.isNativePlatform()) {
        void StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light,
        }).catch(() => {});
        void StatusBar.setBackgroundColor({ color: bgColor }).catch(() => {});
      }
    } catch {
      // Ignore outside Capacitor native shell
    }
  }, [isDark]);

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
