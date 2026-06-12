import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type DateTimeFieldProps = {
  label: string;
  /** 'YYYY-MM-DD' quando mode='date'; 'HH:MM' quando mode='time'. */
  value: string;
  onChange: (value: string) => void;
  mode?: "date" | "time";
  placeholder?: string;
};

// Na web (react-native-web roda sobre react-dom) usamos o input HTML nativo,
// cujo formato de valor já bate com nosso contrato (date=YYYY-MM-DD, time=HH:MM).
export function DateTimeField({
  label,
  value,
  onChange,
  mode = "date",
}: DateTimeFieldProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: Spacing.two, alignSelf: "stretch" }}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <input
        type={mode === "date" ? "date" : "time"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 48,
          borderRadius: Spacing.three,
          paddingLeft: Spacing.three,
          paddingRight: Spacing.three,
          fontSize: 16,
          border: "none",
          color: theme.text,
          backgroundColor: theme.backgroundElement,
        }}
      />
    </View>
  );
}


