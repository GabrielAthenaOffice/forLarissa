import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  Alert,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { FileText, FileDown } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-field";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { listTripsByDate, type ReportTrip } from "@/lib/queries/trips";

const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  full: "Lotada",
  cancelled: "Cancelada",
  completed: "Concluída",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Passageiros confirmados = vagas ocupadas (cada aprovação desconta uma vaga). */
function confirmedOf(t: ReportTrip): number {
  return Math.max(0, t.total_seats - t.available_seats);
}

export default function ReportsScreen() {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [trips, setTrips] = useState<ReportTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((d: string) => {
    setLoading(true);
    setError(null);
    listTripsByDate(d)
      .then(setTrips)
      .catch((e) => setError(e.message ?? "Erro ao carregar relatório"))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(date);
    }, [load, date])
  );

  const summary = useMemo(() => {
    const active = trips.filter((t) => t.status !== "cancelled");
    const confirmed = active.reduce((sum, t) => sum + confirmedOf(t), 0);
    const seats = active.reduce((sum, t) => sum + t.total_seats, 0);

    const byRoute = new Map<string, { trips: number; confirmed: number }>();
    const byDriver = new Map<string, { trips: number; confirmed: number }>();
    for (const t of active) {
      const r = t.route?.title ?? "—";
      const d = t.driver?.profile?.name ?? "—";
      const ra = byRoute.get(r) ?? { trips: 0, confirmed: 0 };
      byRoute.set(r, { trips: ra.trips + 1, confirmed: ra.confirmed + confirmedOf(t) });
      const da = byDriver.get(d) ?? { trips: 0, confirmed: 0 };
      byDriver.set(d, { trips: da.trips + 1, confirmed: da.confirmed + confirmedOf(t) });
    }
    return {
      tripCount: active.length,
      confirmed,
      seats,
      byRoute: [...byRoute.entries()],
      byDriver: [...byDriver.entries()],
    };
  }, [trips]);

  async function exportCsv() {
    try {
      const header = "Rota,Motorista,Horario,Vagas,Confirmados,Status";
      const rows = trips.map((t) =>
        [
          `"${t.route?.title ?? ""}"`,
          `"${t.driver?.profile?.name ?? ""}"`,
          t.departure_time?.slice(0, 5) ?? "",
          t.total_seats,
          confirmedOf(t),
          `"${STATUS_LABEL[t.status] ?? t.status}"`,
        ].join(",")
      );
      const csv = [header, ...rows].join("\n");
      const filename = `relatorio-${date}.csv`;

      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        if (!directory) throw new Error("Diretório de arquivos indisponível");
        const uri = directory + filename;
        await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(uri);
      }
    } catch (err: any) {
      Alert.alert("Erro ao exportar", err.message);
    }
  }

  async function exportPdf() {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
              h1 { color: #111; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f4f4f4; }
              .summary { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            </style>
          </head>
          <body>
            <h1>Relatório Diário - ${date}</h1>
            <div class="summary">
              <p><strong>Total de Viagens (Ativas):</strong> ${summary.tripCount}</p>
              <p><strong>Total de Vagas Oferecidas:</strong> ${summary.seats}</p>
              <p><strong>Total de Passageiros Confirmados:</strong> ${summary.confirmed}</p>
            </div>
            <h2>Viagens</h2>
            <table>
              <tr>
                <th>Horário</th>
                <th>Rota</th>
                <th>Motorista</th>
                <th>Vagas</th>
                <th>Confirmados</th>
                <th>Status</th>
              </tr>
              ${trips.map(t => `
                <tr>
                  <td>${t.departure_time?.slice(0, 5) ?? ""}</td>
                  <td>${t.route?.title ?? "—"}</td>
                  <td>${t.driver?.profile?.name ?? "—"}</td>
                  <td>${t.total_seats}</td>
                  <td>${confirmedOf(t)}</td>
                  <td>${STATUS_LABEL[t.status] ?? t.status}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;

      if (Platform.OS === "web") {
        const { uri } = await Print.printToFileAsync({ html });
        const link = document.createElement("a");
        link.href = uri;
        link.setAttribute("download", `relatorio-${date}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      }
    } catch (err: any) {
      Alert.alert("Erro ao gerar PDF", err.message);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Seletor de data */}
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => setDate((d) => shiftDay(d, -1))}
            style={[styles.navBtn, { backgroundColor: theme.backgroundElement }]}
          >
            <ThemedText type="smallBold">‹</ThemedText>
          </Pressable>
          <View style={styles.flex}>
            <DateTimeField label="Data" value={date} onChange={setDate} mode="date" />
          </View>
          <Pressable
            onPress={() => setDate((d) => shiftDay(d, 1))}
            style={[styles.navBtn, { backgroundColor: theme.backgroundElement }]}
          >
            <ThemedText type="smallBold">›</ThemedText>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.text} style={styles.spacer} />
        ) : error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : (
          <>
            {/* Totais do dia */}
            <View style={[styles.totals, { backgroundColor: theme.backgroundElement }]}>
              <Metric label="Viagens" value={summary.tripCount} />
              <Metric label="Confirmados" value={summary.confirmed} />
              <Metric label="Vagas" value={summary.seats} />
            </View>

            <Section title="Por rota" rows={summary.byRoute} />
            <Section title="Por motorista" rows={summary.byDriver} />

            {/* Detalhe das viagens */}
            <ThemedText type="smallBold">Viagens do dia</ThemedText>
            {trips.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhuma viagem nesta data.
              </ThemedText>
            ) : (
              trips.map((t) => (
                <View key={t.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.row}>
                    <ThemedText type="smallBold" style={styles.flex}>
                      {t.route?.title ?? "Rota"}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {STATUS_LABEL[t.status] ?? t.status}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.departure_time?.slice(0, 5)} · {t.driver?.profile?.name ?? "—"} ·{" "}
                    {confirmedOf(t)}/{t.total_seats} confirmados
                  </ThemedText>
                </View>
              ))
            )}

            <View style={styles.exportRow}>
              <Button 
                title="Exportar PDF" 
                variant="primary" 
                style={styles.flex} 
                onPress={exportPdf} 
              />
              <Button 
                title="Exportar CSV" 
                variant="secondary" 
                style={styles.flex} 
                onPress={exportCsv} 
              />
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <ThemedText type="title" style={styles.metricValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: [string, { trips: number; confirmed: number }][];
}) {
  const theme = useTheme();
  if (rows.length === 0) return null;
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {rows.map(([name, agg]) => (
        <View key={name} style={[styles.aggRow, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" style={styles.flex}>
            {name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {agg.trips} viagem(ns) · {agg.confirmed} pass.
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  dateRow: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.two },
  navBtn: {
    height: 48,
    width: 48,
    borderRadius: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
  spacer: { marginTop: Spacing.five },
  error: { color: "#e5484d", marginTop: Spacing.five },
  totals: {
    flexDirection: "row",
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  metric: { flex: 1, alignItems: "center", gap: Spacing.half },
  metricValue: { fontSize: 32, lineHeight: 36 },
  section: { gap: Spacing.two },
  aggRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  exportRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two, marginTop: Spacing.three },
});


