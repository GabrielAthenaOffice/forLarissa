import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-field";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import {
  createAssignment,
  listUpcomingAssignments,
  setAssignmentStatus,
  type AssignmentWithDetails,
} from "@/lib/queries/assignments";
import { listAllDrivers, type DriverWithProfile } from "@/lib/queries/drivers";
import { listRoutes } from "@/lib/queries/routes";
import type { Route } from "@/types/database";

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABEL: Record<string, string> = {
  assigned: "Designada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default function DesignacoesScreen() {
  const theme = useTheme();
  const { profile } = useSession();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [routeId, setRouteId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [date, setDate] = useState(tomorrow());
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([listRoutes(), listAllDrivers(), listUpcomingAssignments()])
      .then(([r, d, a]) => {
        setRoutes(r.filter((x) => x.is_active));
        setDrivers(d.filter((x) => x.is_approved));
        setAssignments(a);
      })
      .catch((e) => setError(e.message ?? "Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  async function handleCreate() {
    if (!routeId || !driverId) {
      setError("Escolha uma rota e um motorista.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAssignment(
        { route_id: routeId, driver_id: driverId, date },
        profile!.id
      );
      setRouteId(null);
      setDriverId(null);
      load();
    } catch (e: any) {
      setError(e.message ?? "Erro ao designar rota");
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id: string) {
    setActingId(id);
    try {
      await setAssignmentStatus(id, "cancelled");
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Nova designação</ThemedText>

          <ThemedText type="small" themeColor="textSecondary">Rota</ThemedText>
          <View style={styles.chips}>
            {routes.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">Nenhuma rota ativa.</ThemedText>
            ) : (
              routes.map((r) => (
                <Chip key={r.id} label={r.title} selected={routeId === r.id} onPress={() => setRouteId(r.id)} />
              ))
            )}
          </View>

          <ThemedText type="small" themeColor="textSecondary">Motorista</ThemedText>
          <View style={styles.chips}>
            {drivers.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">Nenhum motorista aprovado.</ThemedText>
            ) : (
              drivers.map((d) => (
                <Chip
                  key={d.id}
                  label={d.profile?.name ?? "Motorista"}
                  selected={driverId === d.id}
                  onPress={() => setDriverId(d.id)}
                />
              ))
            )}
          </View>

          <DateTimeField label="Data" value={date} onChange={setDate} mode="date" />

          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <Button title="Designar rota" onPress={handleCreate} loading={saving} />
        </View>

        <ThemedText type="smallBold" style={styles.sectionLabel}>
          Próximas designações
        </ThemedText>
        {assignments.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma designação futura.
          </ThemedText>
        ) : (
          assignments.map((a) => (
            <View key={a.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.row}>
                <ThemedText type="smallBold" style={styles.flex}>
                  {a.route?.title ?? "Rota"}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {STATUS_LABEL[a.status] ?? a.status}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {a.date} · {a.route?.departure_time?.slice(0, 5)} · {a.driver?.profile?.name ?? "—"}
              </ThemedText>
              {a.status === "assigned" && (
                <Button
                  title="Cancelar designação"
                  variant="secondary"
                  onPress={() => cancel(a.id)}
                  loading={actingId === a.id}
                  style={styles.btn}
                />
              )}
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? theme.text : theme.background }]}
    >
      <ThemedText type="small" style={{ color: selected ? theme.background : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: Spacing.three, gap: Spacing.three, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  formCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, height: 40, borderRadius: Spacing.three, alignItems: "center", justifyContent: "center" },
  sectionLabel: { marginTop: Spacing.two },
  error: { color: "#e5484d" },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
  btn: { marginTop: Spacing.two },
});
