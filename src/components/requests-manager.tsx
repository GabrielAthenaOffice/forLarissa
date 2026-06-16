import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  listManagedRouteRequests,
  setRouteRequestStatus,
  type RouteRequestWithRequester,
} from "@/lib/queries/route-requests";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

/**
 * Lista e gerencia solicitações de rota (coordenador → admin). O admin pode
 * aprovar (aplica a mudança em routes via trigger) ou recusar.
 */
export function RequestsManager() {
  const theme = useTheme();
  const [requests, setRequests] = useState<RouteRequestWithRequester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listManagedRouteRequests()
      .then(setRequests)
      .catch((e: any) => setError(e.message ?? "Erro ao carregar solicitações"))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  async function act(id: string, status: "approved" | "rejected") {
    setActingId(id);
    setError(null);
    try {
      await setRouteRequestStatus(id, status);
      load();
    } catch (e: any) {
      setError(e.message ?? "Erro ao atualizar solicitação");
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
        data={requests}
        keyExtractor={(r) => r.id}
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
            Nenhuma solicitação recebida.
          </ThemedText>
        }
        renderItem={({ item }) => {
          const isPending = item.status === "pending";
          return (
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
                {item.origin} → {item.destination}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.departure_time?.slice(0, 5)} · {item.duration_min} min · por{" "}
                {item.requester?.name ?? "Coordenador"}
              </ThemedText>
              {item.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.description}
                </ThemedText>
              ) : null}

              {isPending && (
                <View style={styles.actions}>
                  <Button
                    title="Aprovar"
                    onPress={() => act(item.id, "approved")}
                    loading={actingId === item.id}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Recusar"
                    variant="secondary"
                    onPress={() => act(item.id, "rejected")}
                    disabled={actingId === item.id}
                    style={styles.actionBtn}
                  />
                </View>
              )}
            </View>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing.three, gap: Spacing.three },
  empty: { textAlign: "center", marginTop: Spacing.five },
  error: { color: "#e5484d", marginBottom: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
  actions: { flexDirection: "row", gap: Spacing.two, marginTop: Spacing.one },
  actionBtn: { flex: 1 },
});
