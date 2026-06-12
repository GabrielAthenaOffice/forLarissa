import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { DisplayFont, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'display'
    | 'metric'
    | 'overline';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'display' && styles.display,
        type === 'metric' && styles.metric,
        type === 'overline' && styles.overline,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontFamily: DisplayFont.bold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: DisplayFont.semibold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
  display: {
    fontFamily: DisplayFont.bold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  metric: {
    fontFamily: DisplayFont.extrabold,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  overline: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});


