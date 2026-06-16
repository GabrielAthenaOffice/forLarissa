import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useMyDriver } from "@/hooks/use-my-driver";
import { useTheme } from "@/hooks/use-theme";
import {
  listDriverAssignments,
  type AssignmentWithRoute,
} from "@/lib/queries/assignments";

const STATUS_LABEL: Record<string, string> = {
  assigned: "Designada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default function MinhasRotasScreen() {
  const theme = useTheme();
  const { driver, loading: loadingDriver } = useMyDriver();
  const [items, setItems] = useState<AssignmentWithRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!driver) {
        if (!loadingDriver) setLoading(false);
        return;
      }
      let active = true;
      setError(null);
      listDriverAssignments(driver.id)
        .then((data) => active && setItems(data))
        .catch((e) => active && setError(e.message ?? "Erro ao carregar rotas"))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [driver, loadingDriver])
  );

  if (loading || loadingDriver) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!driver) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          Cadastre seu veículo para receber rotas.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
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
            Você ainda não tem rotas designadas.
          </ThemedText>
        }
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
              {item.route?.origin} → {item.route?.destination}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.date} · {item.route?.departure_time?.slice(0, 5)} ·{" "}
              {item.route?.duration_min} min
            </ThemedText>
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.four },
  list: { padding: Spacing.three, gap: Spacing.three, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  empty: { textAlign: "center", marginTop: Spacing.five },
  error: { color: "#e5484d", marginBottom: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
});
