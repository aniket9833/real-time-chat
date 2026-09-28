import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '../theme/theme';
import { getThemeMode, saveThemeMode } from '../utils/storage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [savedMode, setSavedMode] = useState(null);

  useEffect(() => {
    getThemeMode().then((mode) => {
      if (mode === 'light' || mode === 'dark') setSavedMode(mode);
    });
  }, []);

  const mode = savedMode || (systemScheme === 'dark' ? 'dark' : 'light');

  const toggleTheme = useCallback(() => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setSavedMode(next);
    saveThemeMode(next).catch(() => {});
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      theme: mode === 'dark' ? darkTheme : lightTheme,
      toggleTheme,
    }),
    [mode, toggleTheme],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
