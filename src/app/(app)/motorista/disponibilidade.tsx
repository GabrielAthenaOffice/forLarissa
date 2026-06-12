import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useMyDriver } from "@/hooks/use-my-driver";
import {
  createAvailability,
  listDriverAvailability,
  type AvailabilityWithRoute,
} from "@/lib/queries/availability";
import { listRoutes } from "@/lib/queries/routes";
import type { Route } from "@/types/database";
import { useTheme } from "@/hooks/use-theme";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export default function AvailabilityScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { driver, loading: loadingDriver } = useMyDriver();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [items, setItems] = useState<AvailabilityWithRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const [routeId, setRouteId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!driver) return;
    setLoading(true);
    Promise.all([listRoutes(), listDriverAvailability(driver.id)])
      .then(([r, a]) => {
        setRoutes(r);
        setItems(a);
      })
      .catch((e) => setError(e.message ?? "Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, [driver]);

  useFocusEffect(load);

  async function handleCreate() {
    setError(null);
    if (!routeId) return setError("Escolha uma rota.");
    if (!DATE_RE.test(date)) return setError("Data no formato AAAA-MM-DD.");
    if (!TIME_RE.test(time)) return setError("Horário no formato HH:MM.");
    const seatCount = Number(seats);
    if (!Number.isInteger(seatCount) || seatCount < 1)
      return setError("Número de vagas inválido.");

    setSaving(true);
    try {
      await createAvailability(driver!.id, {
        route_id: routeId,
        date,
        departure_time: time,
        available_seats: seatCount,
      });
      setDate("");
      setTime("");
      setSeats("");
      setRouteId(null);
      load();
    } catch (e: any) {
      setError(e.message ?? "Erro ao criar disponibilidade");
    } finally {
      setSaving(false);
    }
  }

  if (loadingDriver) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  // Sem cadastro de veículo ainda → orienta a criar primeiro.
  if (!driver) {
    return (
      <ThemedView style={styles.center}>
        <View style={styles.emptyBox}>
          <ThemedText type="default" style={styles.centerText}>
            Cadastre seu veículo antes de informar disponibilidade.
          </ThemedText>
          <Button
            title="Cadastrar veículo"
            onPress={() => router.replace("/motorista/veiculo")}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="smallBold">Nova disponibilidade</ThemedText>

        <View style={styles.routeWrap}>
          <ThemedText type="small" themeColor="textSecondary">
            Rota
          </ThemedText>
          {routes.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma rota ativa disponível.
            </ThemedText>
          ) : (
            <View style={styles.chips}>
              {routes.map((r) => {
                const selected = routeId === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setRouteId(r.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.text
                          : theme.backgroundElement,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: selected ? theme.background : theme.text }}
                    >
                      {r.title}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <DateTimeField label="Data" value={date} onChange={setDate} mode="date" placeholder="Selecionar data" />
        <DateTimeField label="Horário" value={time} onChange={setTime} mode="time" placeholder="Selecionar horário" />
        <Input label="Vagas" value={seats} onChangeText={setSeats} placeholder={String(driver.seat_count)} keyboardType="number-pad" />

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <Button title="Adicionar" onPress={handleCreate} loading={saving} />

        <View style={styles.divider} />

        <ThemedText type="smallBold">Próximas disponibilidades</ThemedText>
        {loading ? (
          <ActivityIndicator color={theme.text} />
        ) : items.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma disponibilidade cadastrada.
          </ThemedText>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText type="smallBold">{item.route?.title ?? "Rota"}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.date} às {item.departure_time?.slice(0, 5)} · {item.available_seats} vaga(s)
              </ThemedText>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.four },
  centerText: { textAlign: "center" },
  emptyBox: { gap: Spacing.three, maxWidth: 320 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  routeWrap: { gap: Spacing.two },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  divider: { height: 1, backgroundColor: "#8884", marginVertical: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  error: { color: "#e5484d" },
});


