/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1410',
    background: '#FBF8F4',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F1EBE2',
    textSecondary: '#7C7166',
    // Direção "Sunrise Commute": âmbar quente sobre neutros aquecidos.
    accent: '#E8590C',
    accentText: '#FFFFFF',
    accentSoft: '#FBE6D4',
    success: '#2E9E5B',
    warning: '#C8860B',
    danger: '#E5484D',
    border: '#EBE3D8',
  },
  dark: {
    text: '#F7F2EA',
    background: '#14110D',
    backgroundElement: '#211C16',
    backgroundSelected: '#2C261E',
    textSecondary: '#A89C8C',
    accent: '#FF8A3D',
    accentText: '#1A1410',
    accentSoft: '#33241A',
    success: '#3FBF73',
    warning: '#E0A93D',
    danger: '#FF6369',
    border: '#322B22',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

/** Fonte de display (títulos e números). Carregada em app/_layout. */
export const DisplayFont = {
  regular: 'Bricolage_400',
  medium: 'Bricolage_500',
  semibold: 'Bricolage_600',
  bold: 'Bricolage_700',
  extrabold: 'Bricolage_800',
} as const;

/** Sombra suave e quente para cartões (cross-platform). */
export function cardShadow(scheme: 'light' | 'dark') {
  return Platform.select({
    web: {
      boxShadow:
        scheme === 'dark'
          ? '0 8px 24px rgba(0,0,0,0.45)'
          : '0 8px 24px rgba(120,90,50,0.10)',
    },
    default: {
      shadowColor: scheme === 'dark' ? '#000000' : '#7A5A32',
      shadowOpacity: scheme === 'dark' ? 0.4 : 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
  }) as object;
}

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
