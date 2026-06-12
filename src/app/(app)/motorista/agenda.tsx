import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useMyDriver } from "@/hooks/use-my-driver";
import { useTheme } from "@/hooks/use-theme";
import {
  cancelTrip,
  completeTrip,
  listDriverTrips,
  type TripWithRoute,
} from "@/lib/queries/trips";

const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  full: "Lotada",
  cancelled: "Cancelada",
  completed: "Concluída",
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AgendaScreen() {
  const theme = useTheme();
  const { driver, loading: loadingDriver } = useMyDriver();
  const [trips, setTrips] = useState<TripWithRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!driver) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listDriverTrips(driver.id)
      .then(setTrips)
      .finally(() => setLoading(false));
  }, [driver]);

  useFocusEffect(load);

  async function runAction(tripId: string, action: () => Promise<void>, errMsg: string) {
    setActingId(tripId);
    try {
      await action();
      load();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? errMsg);
    } finally {
      setActingId(null);
    }
  }

  function confirmComplete(tripId: string) {
    Alert.alert("Concluir viagem", "Confirmar que esta viagem foi realizada?", [
      { text: "Voltar", style: "cancel" },
      { text: "Concluir", onPress: () => runAction(tripId, () => completeTrip(tripId), "Não foi possível concluir") },
    ]);
  }

  function confirmCancel(tripId: string) {
    Alert.alert(
      "Cancelar viagem",
      "Cancelar a viagem? As solicitações dos passageiros também serão canceladas.",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Cancelar viagem",
          style: "destructive",
          onPress: () => runAction(tripId, () => cancelTrip(tripId), "Não foi possível cancelar"),
        },
      ]
    );
  }

  if (loadingDriver || loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Nenhuma viagem agendada. Informe sua disponibilidade para criar viagens.
          </ThemedText>
        }
        renderItem={({ item }) => {
          const isActive = item.status === "open" || item.status === "full";
          // Pode concluir viagens de hoje/passadas que ainda não foram finalizadas.
          const canComplete = isActive && item.trip_date <= todayStr();
          return (
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
                {item.trip_date} às {item.departure_time?.slice(0, 5)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.available_seats}/{item.total_seats} vagas livres
              </ThemedText>

              {canComplete && (
                <Button
                  title="Concluir viagem"
                  onPress={() => confirmComplete(item.id)}
                  loading={actingId === item.id}
                  style={styles.btn}
                />
              )}
              {isActive && (
                <Button
                  title="Cancelar viagem"
                  variant="secondary"
                  onPress={() => confirmCancel(item.id)}
                  disabled={actingId === item.id}
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


