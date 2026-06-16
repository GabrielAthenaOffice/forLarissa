import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { listAllDrivers, type DriverWithProfile } from "@/lib/queries/drivers";

export default function CoordenadorDriversScreen() {
  const theme = useTheme();
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      listAllDrivers()
        .then(setDrivers)
        .catch((e) => setError(e.message ?? "Erro ao carregar motoristas"))
        .finally(() => setLoading(false));
    }, [])
  );

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
        data={drivers}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Nenhum motorista cadastrado.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.row}>
              <ThemedText type="smallBold" style={styles.flex}>
                {item.profile?.name ?? "Motorista"}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.is_approved ? "Aprovado ✓" : "Pendente"}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {item.vehicle_model ?? "—"}
              {item.vehicle_plate ? ` · ${item.vehicle_plate}` : ""} · {item.seat_count} vagas
            </ThemedText>
            {item.phone && (
              <ThemedText type="small" themeColor="textSecondary">
                {item.phone}
              </ThemedText>
            )}
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
  error: { color: "#e5484d", marginBottom: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
});
