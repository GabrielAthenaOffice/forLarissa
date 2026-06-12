import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ButtonProps = Omit<PressableProps, "children"> & {
  title: string;
  variant?: "primary" | "secondary";
  loading?: boolean;
};

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;
  const fg = isPrimary ? theme.accentText : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        {
          backgroundColor: isPrimary ? theme.accent : theme.backgroundElement,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: theme.border,
          opacity: isDisabled ? 0.45 : state.pressed ? 0.85 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <ThemedText type="smallBold" style={{ color: fg }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: Radii.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
});


