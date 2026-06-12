import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import { createRequest, listPassengerRequests } from "@/lib/queries/requests";
import { listAvailableTrips, type AvailableTrip } from "@/lib/queries/trips";

export default function AvailableTripsScreen() {
  const { profile } = useSession();
  const theme = useTheme();
  const [trips, setTrips] = useState<AvailableTrip[]>([]);
  const [requestedTripIds, setRequestedTripIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    Promise.all([listAvailableTrips(), listPassengerRequests(profile.id)])
      .then(([available, mine]) => {
        setTrips(available);
        // Viagens já solicitadas e não canceladas → botão desabilitado.
        setRequestedTripIds(
          new Set(
            mine
              .filter((r) => r.status !== "cancelled" && r.status !== "rejected")
              .map((r) => r.trip_id)
          )
        );
      })
      .catch((e) => setError(e.message ?? "Erro ao carregar viagens"))
      .finally(() => setLoading(false));
  }, [profile]);

  useFocusEffect(load);

  async function request(tripId: string) {
    setActingId(tripId);
    try {
      await createRequest(tripId, profile!.id);
      Alert.alert("Pronto", "Solicitação enviada. Acompanhe em Minhas viagens.");
      load();
    } catch (e: any) {
      Alert.alert("Não foi possível", e.message ?? "Erro ao solicitar vaga");
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
        data={trips}
        keyExtractor={(t) => t.id}
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
            Nenhuma viagem disponível no momento.
          </ThemedText>
        }
        renderItem={({ item }) => {
          const alreadyRequested = requestedTripIds.has(item.id);
          return (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{item.route?.title ?? "Rota"}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.route?.origin} → {item.route?.destination}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.trip_date} às {item.departure_time?.slice(0, 5)} ·{" "}
                {item.available_seats} vaga(s)
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Motorista: {item.driver?.profile?.name ?? "—"}
                {item.driver?.vehicle_model ? ` · ${item.driver.vehicle_model}` : ""}
              </ThemedText>

              <Button
                title={alreadyRequested ? "Já solicitada" : "Solicitar vaga"}
                onPress={() => request(item.id)}
                loading={actingId === item.id}
                disabled={alreadyRequested}
                style={styles.btn}
              />
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
  error: { color: "#e5484d", marginBottom: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  btn: { marginTop: Spacing.two },
});


