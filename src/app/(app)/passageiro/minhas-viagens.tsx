import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import {
  cancelRequest,
  isPastRequest,
  listPassengerRequests,
  type PassengerRequest,
} from "@/lib/queries/requests";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando aprovação",
  approved: "Confirmada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

export default function MyTripsScreen() {
  const { profile } = useSession();
  const theme = useTheme();
  const [requests, setRequests] = useState<PassengerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!profile) return;
    setLoading(true);
    listPassengerRequests(profile.id)
      // Esta tela mostra apenas as viagens futuras/ativas; passadas vão para o Histórico.
      .then((all) => setRequests(all.filter((r) => !isPastRequest(r))))
      .finally(() => setLoading(false));
  }, [profile]);

  useFocusEffect(load);

  function confirmCancel(id: string) {
    Alert.alert("Cancelar solicitação", "Deseja cancelar esta solicitação?", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar",
        style: "destructive",
        onPress: async () => {
          setActingId(id);
          try {
            await cancelRequest(id);
            load();
          } catch (e: any) {
            Alert.alert("Erro", e.message ?? "Não foi possível cancelar");
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
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
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Você ainda não solicitou nenhuma viagem.
          </ThemedText>
        }
        renderItem={({ item }) => {
          const canCancel = item.status === "pending" || item.status === "approved";
          return (
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

              {canCancel && (
                <Button
                  title="Cancelar solicitação"
                  variant="secondary"
                  onPress={() => confirmCancel(item.id)}
                  loading={actingId === item.id}
                  style={styles.btn}
                />
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
  list: { padding: Spacing.three, gap: Spacing.three, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  empty: { textAlign: "center", marginTop: Spacing.five },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
  btn: { marginTop: Spacing.two },
});


