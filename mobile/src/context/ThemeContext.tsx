import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from '../theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    colors: ThemeColors;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    isDark: true,
    colors: darkColors,
    setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('dark'); // Default to dark

    const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');
    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
