import { DisplayFont } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** Opções de header coerentes com o tema "Sunrise Commute" para as Stacks. */
export function useStackOptions() {
  const theme = useTheme();
  return {
    headerStyle: { backgroundColor: theme.background },
    headerShadowVisible: false,
    headerTintColor: theme.accent,
    headerTitleStyle: { fontFamily: DisplayFont.semibold, color: theme.text },
    contentStyle: { backgroundColor: theme.background },
  };
}
