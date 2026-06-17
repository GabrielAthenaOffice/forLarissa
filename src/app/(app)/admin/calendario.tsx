import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, SectionList, StyleSheet, View } from "react-native";

import { CalendarComponent } from "@/components/calendar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  listUpcomingAssignments,
  type AssignmentWithDetails,
} from "@/lib/queries/assignments";

const STATUS_LABEL: Record<string, string> = {
  assigned: "Designada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default function CalendarScreen() {
  const theme = useTheme();
  const [allItems, setAllItems] = useState<AssignmentWithDetails[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      listUpcomingAssignments()
        .then((data) => {
          setAllItems(data);
          // Define o primeiro dia com rota como selecionado
          if (data.length > 0) {
            const firstDate = data[0].date.split(" ")[0];
            setSelectedDate(firstDate);
          }
        })
        .finally(() => setLoading(false));
    }, [])
  );

  // Filtra assignments para o dia selecionado
  const itemsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return allItems.filter((a) => a.date.startsWith(selectedDate));
  }, [allItems, selectedDate]);

  // Agrupa por data os items do dia selecionado
  const sections = useMemo(() => {
    const groups: { title: string; data: AssignmentWithDetails[] }[] = [];
    for (const a of itemsForSelectedDate) {
      const last = groups[groups.length - 1];
      if (last && last.title === a.date) last.data.push(a);
      else groups.push({ title: a.date, data: [a] });
    }
    return groups;
  }, [itemsForSelectedDate]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CalendarComponent
        assignments={allItems}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <SectionList
        sections={sections}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        scrollEnabled={false}
        ListEmptyComponent={
          selectedDate ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Nenhuma rota designada para este dia.
            </ThemedText>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" style={styles.dateHeader}>
            {section.title}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.row}>
              <ThemedText type="smallBold" style={styles.flex}>
                {item.route?.title ?? "Rota"}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {STATUS_LABEL[item.status] ?? item.status}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {item.route?.departure_time?.slice(0, 5)} · {item.route?.duration_min} min ·{" "}
              {item.driver?.profile?.name ?? "—"}
            </ThemedText>
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing.three, gap: Spacing.two, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  empty: { textAlign: "center", marginTop: Spacing.three },
  dateHeader: { marginTop: Spacing.two, marginBottom: Spacing.one },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
});
