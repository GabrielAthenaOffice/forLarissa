import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  listAllDrivers,
  setDriverApproval,
  type DriverWithProfile,
} from "@/lib/queries/drivers";

export default function DriversScreen() {
  const theme = useTheme();
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAllDrivers()
      .then(setDrivers)
      .catch((e) => setError(e.message ?? "Erro ao carregar motoristas"))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  async function toggle(d: DriverWithProfile) {
    setActingId(d.id);
    try {
      await setDriverApproval(d.id, !d.is_approved);
      load();
    } catch (e: any) {
      setError(e.message ?? "Erro ao atualizar motorista");
    } finally {
      setActingId(null);
    }
  }

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

            <Button
              title={item.is_approved ? "Revogar aprovação" : "Aprovar"}
              variant={item.is_approved ? "secondary" : "primary"}
              onPress={() => toggle(item)}
              loading={actingId === item.id}
              style={styles.btn}
            />
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
  btn: { marginTop: Spacing.two },
});


