import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-field";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  listAssignmentsByDate,
  type AssignmentWithDetails,
} from "@/lib/queries/assignments";

const STATUS_LABEL: Record<string, string> = {
  assigned: "Designada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Relatório de designações de rota por data, com agregação por rota/motorista.
 * `canExport` libera os botões de exportar CSV/PDF (admin).
 */
export function AssignmentsReport({ canExport = true }: { canExport?: boolean }) {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [items, setItems] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((d: string) => {
    setLoading(true);
    setError(null);
    listAssignmentsByDate(d)
      .then(setItems)
      .catch((e) => setError(e.message ?? "Erro ao carregar relatório"))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(date);
    }, [load, date])
  );

  const summary = useMemo(() => {
    const active = items.filter((a) => a.status !== "cancelled");
    const byRoute = new Map<string, number>();
    const byDriver = new Map<string, number>();
    for (const a of active) {
      const r = a.route?.title ?? "—";
      const d = a.driver?.profile?.name ?? "—";
      byRoute.set(r, (byRoute.get(r) ?? 0) + 1);
      byDriver.set(d, (byDriver.get(d) ?? 0) + 1);
    }
    return {
      total: active.length,
      routes: byRoute.size,
      drivers: byDriver.size,
      byRoute: [...byRoute.entries()],
      byDriver: [...byDriver.entries()],
    };
  }, [items]);

  async function exportCsv() {
    try {
      const header = "Rota,Origem,Destino,Horario,Duracao,Motorista,Status";
      const rows = items.map((a) =>
        [
          `"${a.route?.title ?? ""}"`,
          `"${a.route?.origin ?? ""}"`,
          `"${a.route?.destination ?? ""}"`,
          a.route?.departure_time?.slice(0, 5) ?? "",
          a.route?.duration_min ?? "",
          `"${a.driver?.profile?.name ?? ""}"`,
          `"${STATUS_LABEL[a.status] ?? a.status}"`,
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
            <h1>Relatório de Designações - ${date}</h1>
            <div class="summary">
              <p><strong>Total de Designações (ativas):</strong> ${summary.total}</p>
              <p><strong>Rotas:</strong> ${summary.routes}</p>
              <p><strong>Motoristas:</strong> ${summary.drivers}</p>
            </div>
            <table>
              <tr>
                <th>Horário</th><th>Rota</th><th>Trajeto</th><th>Duração</th><th>Motorista</th><th>Status</th>
              </tr>
              ${items
                .map(
                  (a) => `
                <tr>
                  <td>${a.route?.departure_time?.slice(0, 5) ?? ""}</td>
                  <td>${a.route?.title ?? "—"}</td>
                  <td>${a.route?.origin ?? ""} → ${a.route?.destination ?? ""}</td>
                  <td>${a.route?.duration_min ?? ""} min</td>
                  <td>${a.driver?.profile?.name ?? "—"}</td>
                  <td>${STATUS_LABEL[a.status] ?? a.status}</td>
                </tr>`
                )
                .join("")}
            </table>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = uri;
        link.setAttribute("download", `relatorio-${date}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch (err: any) {
      Alert.alert("Erro ao gerar PDF", err.message);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
            <View style={[styles.totals, { backgroundColor: theme.backgroundElement }]}>
              <Metric label="Designações" value={summary.total} />
              <Metric label="Rotas" value={summary.routes} />
              <Metric label="Motoristas" value={summary.drivers} />
            </View>

            <Section title="Por rota" rows={summary.byRoute} unit="rota(s)" />
            <Section title="Por motorista" rows={summary.byDriver} unit="rota(s)" />

            <ThemedText type="smallBold">Designações do dia</ThemedText>
            {items.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhuma designação nesta data.
              </ThemedText>
            ) : (
              items.map((a) => (
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
                    {a.route?.departure_time?.slice(0, 5)} · {a.route?.duration_min} min ·{" "}
                    {a.driver?.profile?.name ?? "—"}
                  </ThemedText>
                </View>
              ))
            )}

            {canExport && (
              <View style={styles.exportRow}>
                <Button title="Exportar PDF" variant="primary" style={styles.flex} onPress={exportPdf} />
                <Button title="Exportar CSV" variant="secondary" style={styles.flex} onPress={exportCsv} />
              </View>
            )}
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
  unit,
}: {
  title: string;
  rows: [string, number][];
  unit: string;
}) {
  const theme = useTheme();
  if (rows.length === 0) return null;
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {rows.map(([name, count]) => (
        <View key={name} style={[styles.aggRow, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" style={styles.flex}>
            {name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {count} {unit}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  dateRow: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.two },
  navBtn: { height: 48, width: 48, borderRadius: Spacing.three, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  spacer: { marginTop: Spacing.five },
  error: { color: "#e5484d", marginTop: Spacing.five },
  totals: { flexDirection: "row", borderRadius: Spacing.three, padding: Spacing.three },
  metric: { flex: 1, alignItems: "center", gap: Spacing.half },
  metricValue: { fontSize: 32, lineHeight: 36 },
  section: { gap: Spacing.two },
  aggRow: { flexDirection: "row", alignItems: "center", padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  exportRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two, marginTop: Spacing.three },
});
