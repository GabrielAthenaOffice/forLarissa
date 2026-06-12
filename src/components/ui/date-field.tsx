import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
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

const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string, mode: "date" | "time"): Date {
  if (mode === "date") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  } else {
    const m = /^(\d{2}):(\d{2})$/.exec(value);
    if (m) {
      const d = new Date();
      d.setHours(Number(m[1]), Number(m[2]), 0, 0);
      return d;
    }
  }
  return new Date();
}

function format(date: Date, mode: "date" | "time"): string {
  return mode === "date"
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DateTimeField({
  label,
  value,
  onChange,
  mode = "date",
  placeholder,
}: DateTimeFieldProps) {
  const theme = useTheme();
  const [iosOpen, setIosOpen] = useState(false);

  function open() {
    // Android: diálogo imperativo. iOS: spinner inline com botão "Concluir".
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: parse(value, mode),
        mode,
        is24Hour: true,
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === "set" && selected) onChange(format(selected, mode));
        },
      });
    } else {
      setIosOpen(true);
    }
  }

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>

      <Pressable
        onPress={open}
        style={[styles.field, { backgroundColor: theme.backgroundElement }]}
      >
        <ThemedText
          type="default"
          themeColor={value ? "text" : "textSecondary"}
        >
          {value || placeholder || "Selecionar"}
        </ThemedText>
      </Pressable>

      {Platform.OS === "ios" && iosOpen && (
        <View style={[styles.iosBox, { backgroundColor: theme.backgroundElement }]}>
          <DateTimePicker
            value={parse(value, mode)}
            mode={mode}
            display="spinner"
            onChange={(_e, selected) => selected && onChange(format(selected, mode))}
          />
          <Button title="Concluir" onPress={() => setIosOpen(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two, alignSelf: "stretch" },
  field: {
    height: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    justifyContent: "center",
  },
  iosBox: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.two,
  },
});


