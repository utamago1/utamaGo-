import { useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { safeStorageSet, THEME_STORAGE_KEY } from '../utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

const LIGHT_BG_COLOR = '#fafaf8';

/**
 * UtamaGo! always renders in Light Mode regardless of OS / system theme settings.
 */
export function useThemeMode() {
  const themeMode: ThemeMode = 'light';
  const isDark = false;

  useEffect(() => {
    safeStorageSet(THEME_STORAGE_KEY, 'light');

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('dark');
      root.style.colorScheme = 'light';

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', LIGHT_BG_COLOR);
      }
    }

    try {
      if (Capacitor.isNativePlatform()) {
        void StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        void StatusBar.setBackgroundColor({ color: LIGHT_BG_COLOR }).catch(
          () => {},
        );
      }
    } catch {
      // Ignore outside Capacitor native shell
    }
  }, []);

  const setThemeMode = useCallback((_nextMode: ThemeMode) => {
    safeStorageSet(THEME_STORAGE_KEY, 'light');
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, []);

  const toggleDarkLight = useCallback(() => {
    setThemeMode('light');
  }, [setThemeMode]);

  return {
    themeMode,
    isDark,
    setThemeMode,
    toggleDarkLight,
  };
}
