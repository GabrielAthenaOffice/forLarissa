import { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { MaxContentWidth, Radii, Spacing, cardShadow } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { AssignmentWithDetails } from "@/lib/queries/assignments";

interface CalendarProps {
  assignments: AssignmentWithDetails[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfWeek(d: Date) {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function addWeeks(d: Date, weeks: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + weeks * 7);
  return date;
}

function formatYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMonthYear(d: Date) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function CalendarComponent({ assignments, selectedDate, onSelectDate }: CalendarProps) {
  const theme = useTheme();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  
  const [currentWeek, setCurrentWeek] = useState(
    selectedDate ? new Date(selectedDate + "T12:00:00") : new Date()
  );

  useEffect(() => {
    if (selectedDate) {
      setCurrentWeek(new Date(selectedDate + "T12:00:00"));
    }
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentWeek]);

  const markedDates = useMemo(() => {
    const dates = new Set<string>();
    for (const a of assignments) {
      dates.add(a.date.split(" ")[0]);
    }
    return dates;
  }, [assignments]);

  return (
    <View 
      style={[
        styles.container, 
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        cardShadow(scheme)
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => setCurrentWeek(w => addWeeks(w, -1))} style={styles.iconBtn}>
          <ChevronLeft color={theme.text} size={20} />
        </Pressable>
        <ThemedText type="subtitle">{formatMonthYear(currentWeek)}</ThemedText>
        <Pressable onPress={() => setCurrentWeek(w => addWeeks(w, 1))} style={styles.iconBtn}>
          <ChevronRight color={theme.text} size={20} />
        </Pressable>
      </View>

      <View style={styles.weekLabels}>
        {DAYS_OF_WEEK.map((day) => (
          <ThemedText key={day} type="smallBold" themeColor="textSecondary" style={styles.dayLabel}>
            {day}
          </ThemedText>
        ))}
      </View>

      <View style={styles.daysRow}>
        {weekDays.map((day) => {
          const dateStr = formatYYYYMMDD(day);
          const isSelected = dateStr === selectedDate;
          const hasAssignment = markedDates.has(dateStr);

          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelectDate(dateStr)}
              style={[
                styles.dayButton,
                isSelected && { backgroundColor: theme.accent },
              ]}
            >
              <ThemedText
                type="default"
                style={[{ color: isSelected ? theme.accentText : theme.text }, isSelected && { fontFamily: "Bricolage_600" }]}
              >
                {day.getDate()}
              </ThemedText>
              {hasAssignment && (
                <View 
                  style={[
                    styles.dot, 
                    { backgroundColor: isSelected ? theme.accentText : theme.accent }
                  ]} 
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    width: "100%",
    maxWidth: MaxContentWidth,
    marginVertical: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.three,
  },
  iconBtn: {
    padding: Spacing.two,
  },
  weekLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.two,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 44,
    maxHeight: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: "absolute",
    bottom: 4,
  },
});
