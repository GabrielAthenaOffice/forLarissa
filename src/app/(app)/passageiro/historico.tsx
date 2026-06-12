import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import {
  isPastRequest,
  listPassengerRequests,
  type PassengerRequest,
} from "@/lib/queries/requests";

const STATUS_LABEL: Record<string, string> = {
  pending: "Não confirmada",
  approved: "Realizada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

export default function HistoryScreen() {
  const { profile } = useSession();
  const theme = useTheme();
  const [requests, setRequests] = useState<PassengerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!profile) return;
    setLoading(true);
    listPassengerRequests(profile.id)
      // Histórico: viagens já realizadas ou com data passada.
      .then((all) => setRequests(all.filter(isPastRequest)))
      .finally(() => setLoading(false));
  }, [profile]);

  useFocusEffect(load);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Você ainda não tem viagens no histórico.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.row}>
              <ThemedText type="smallBold" style={styles.flex}>
                {item.trip?.route?.title ?? "Rota"}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {STATUS_LABEL[item.status] ?? item.status}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {item.trip?.route?.origin} → {item.trip?.route?.destination}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.trip?.trip_date} às {item.trip?.departure_time?.slice(0, 5)}
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
  list: { padding: Spacing.three, gap: Spacing.three, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  empty: { textAlign: "center", marginTop: Spacing.five },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
});


