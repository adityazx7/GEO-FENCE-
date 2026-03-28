export const lightColors = {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    textMuted: '#64748b',
    primary: '#0284c7', // Premium Blue
    accent: '#7c3aed', // Purple
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    iconDefault: '#64748b',
    inputBg: '#f1f5f9',
    transparentBorder: 'rgba(0,0,0,0.05)',
    transparentPrimary: 'rgba(2,132,199,0.1)',
    glassBg: 'rgba(255,255,255,0.7)',
};

export const darkColors = {
    background: '#080b14', // Deeper Dark
    card: '#111827',
    text: '#f3f4f6',
    textMuted: '#9ca3af',
    primary: '#00d4ff', // Cyan Neon
    accent: '#a855f7', // Purple Neon
    border: 'rgba(255,255,255,0.08)',
    success: '#00f294', // Neon Green
    warning: '#ffb224',
    danger: '#ff4b5c',
    iconDefault: '#9ca3af',
    inputBg: '#1a2235',
    transparentBorder: 'rgba(255,255,255,0.08)',
    transparentPrimary: 'rgba(0,212,255,0.15)',
    glassBg: 'rgba(15,23,42,0.6)', // Glassmorphism base
};

export type ThemeColors = typeof lightColors;
