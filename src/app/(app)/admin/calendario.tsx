import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, SectionList, StyleSheet, View } from "react-native";

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
  const [items, setItems] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      listUpcomingAssignments()
        .then(setItems)
        .finally(() => setLoading(false));
    }, [])
  );

  // Agrupa por data preservando a ordem (a query já vem ordenada por data).
  const sections = useMemo(() => {
    const groups: { title: string; data: AssignmentWithDetails[] }[] = [];
    for (const a of items) {
      const last = groups[groups.length - 1];
      if (last && last.title === a.date) last.data.push(a);
      else groups.push({ title: a.date, data: [a] });
    }
    return groups;
  }, [items]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Nenhuma rota designada.
          </ThemedText>
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
  empty: { textAlign: "center", marginTop: Spacing.five },
  dateHeader: { marginTop: Spacing.three, marginBottom: Spacing.one },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
});
