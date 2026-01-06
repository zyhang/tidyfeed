/**
 * Linear-style Design System Tokens
 *
 * Spacing: 4, 8, 12, 16, 24 (pixels)
 * Base font: 14px, Inter
 * Border radius: 8px
 * No shadows, no gradients
 * Neutral colors + single blue primary
 */

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
} as const;

export const fontSize = {
    xs: '11px',
    sm: '12px',
    base: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
} as const;

export const borderRadius = {
    sm: '4px',
    md: '8px',
    lg: '12px',
} as const;

// Neutral colors
export const neutral = {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
} as const;

// Primary blue
export const primary = {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
} as const;

// Semantic colors
export const semantic = {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
} as const;

// CSS class mappings (for Tailwind)
export const classes = {
    // Border
    border: 'border-[#e5e5e5]',
    borderHover: 'hover:border-[#d4d4d4]',

    // Background
    bg: 'bg-[#fafafa]',
    bgHover: 'hover:bg-[#f5f5f5]',
    bgMuted: 'bg-[#f5f5f5]',

    // Text
    text: 'text-[#171717]',
    textMuted: 'text-[#737373]',
    textPlaceholder: 'text-[#a3a3a3]',

    // Primary button
    btnPrimary: 'bg-[#171717] text-white hover:bg-[#262626]',
    btnSecondary: 'bg-[#f5f5f5] text-[#171717] hover:bg-[#e5e5e5]',
    btnGhost: 'text-[#737373] hover:text-[#171717] hover:bg-[#f5f5f5]',

    // Focus
    focus: 'focus:outline-none focus:ring-2 focus:ring-[#171717]/10 focus:ring-offset-2',

    // Typography
    font: 'font-sans text-[14px] leading-[1.5]',
} as const;
