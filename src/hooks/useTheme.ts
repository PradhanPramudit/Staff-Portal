import { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings } from '../lib/storage';
import type { Settings } from '../types';

export function useTheme() {
  const [theme, setThemeState] = useState<Settings['theme']>('system');
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    getSettings().then((s) => {
      setThemeState(s.theme || 'system');
      applyTheme(s.theme || 'system');
    });
  }, []);

  const applyTheme = useCallback((pref: Settings['theme']) => {
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = pref === 'dark' || (pref === 'system' && systemPrefersDark);

    if (shouldBeDark) {
      root.classList.add('dark');
      setIsDark(true);
    } else {
      root.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme, applyTheme]);

  const setTheme = useCallback(
    async (newTheme: Settings['theme']) => {
      setThemeState(newTheme);
      applyTheme(newTheme);
      await updateSettings({ theme: newTheme });
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(async () => {
    const next = isDark ? 'light' : 'dark';
    await setTheme(next);
  }, [isDark, setTheme]);

  return { theme, isDark, setTheme, toggleTheme };
}
