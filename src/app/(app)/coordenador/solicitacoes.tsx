import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import { cancelRouteRequest, listMyRouteRequests } from "@/lib/queries/route-requests";
import type { RouteRequest } from "@/types/database";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

export default function MinhasSolicitacoesScreen() {
  const theme = useTheme();
  const { profile } = useSession();
  const [items, setItems] = useState<RouteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!profile) return;
    setError(null);
    listMyRouteRequests(profile.id)
      .then(setItems)
      .catch((e) => setError(e.message ?? "Erro ao carregar solicitações"))
      .finally(() => setLoading(false));
  }, [profile]);

  useFocusEffect(load);

  async function cancel(id: string) {
    setActingId(id);
    try {
      await cancelRouteRequest(id);
      load();
    } catch (e: any) {
      setError(e.message ?? "Erro ao cancelar");
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
            Você ainda não fez solicitações.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.row}>
              <ThemedText type="smallBold" style={styles.flex}>
                {item.kind === "create" ? "Criar rota" : "Editar rota"}: {item.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {STATUS_LABEL[item.status] ?? item.status}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {item.origin} → {item.destination} · {item.departure_time?.slice(0, 5)} ·{" "}
              {item.duration_min} min
            </ThemedText>
            {item.status === "pending" && (
              <Button
                title="Cancelar solicitação"
                variant="secondary"
                onPress={() => cancel(item.id)}
                loading={actingId === item.id}
                style={styles.btn}
              />
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
  btn: { marginTop: Spacing.two },
});
