'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeName = 'dark' | 'light' | 'midnight' | 'ocean' | 'forest' | 'sunset';
export type UIStyle = 'legacy' | 'silk';

interface ThemeContextType {
  theme: ThemeName;
  uiStyle: UIStyle;
  isSilkUI: boolean;
  setTheme: (theme: ThemeName) => void;
  setUIStyle: (style: UIStyle) => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  uiStyle: 'legacy',
  isSilkUI: false,
  setTheme: () => {},
  setUIStyle: () => {},
  loading: true,
});

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeName;
  initialUIStyle?: UIStyle;
}

export function ThemeProvider({ children, initialTheme = 'dark', initialUIStyle = 'legacy' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);
  const [uiStyle, setUIStyleState] = useState<UIStyle>(initialUIStyle);
  const [loading, setLoading] = useState(true);

  const isSilkUI = uiStyle === 'silk';

  // Apply theme to document
  const applyTheme = useCallback((newTheme: ThemeName, newUIStyle: UIStyle) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
      document.documentElement.setAttribute('data-silk', String(newUIStyle === 'silk'));
    }
  }, []);

  // Set theme and persist to server
  const setTheme = useCallback(async (newTheme: ThemeName) => {
    setThemeState(newTheme);
    applyTheme(newTheme, uiStyle);

    // Save to server
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ui_theme: newTheme }),
      });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, [uiStyle, applyTheme]);

  // Set UI style and persist to server
  const setUIStyle = useCallback(async (newStyle: UIStyle) => {
    setUIStyleState(newStyle);
    applyTheme(theme, newStyle);

    // Save to server
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ui_style: newStyle }),
      });
    } catch (error) {
      console.error('Failed to save UI style preference:', error);
    }
  }, [theme, applyTheme]);

  // Initialize theme from server on mount
  useEffect(() => {
    const fetchThemeSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const serverTheme = (data.ui_theme as ThemeName) || 'dark';
          const serverUIStyle = (data.ui_style as UIStyle) || 'legacy';
          setThemeState(serverTheme);
          setUIStyleState(serverUIStyle);
          applyTheme(serverTheme, serverUIStyle);
        }
      } catch (error) {
        console.error('Failed to fetch theme settings:', error);
        applyTheme(initialTheme, initialUIStyle);
      } finally {
        setLoading(false);
      }
    };

    fetchThemeSettings();
  }, [initialTheme, initialUIStyle, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, uiStyle, isSilkUI, setTheme, setUIStyle, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}