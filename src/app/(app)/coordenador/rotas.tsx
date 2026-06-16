import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { listRoutes } from "@/lib/queries/routes";
import type { Route } from "@/types/database";

export default function CoordenadorRoutesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      listRoutes()
        .then((data) => active && setRoutes(data))
        .catch((e) => active && setError(e.message ?? "Erro ao carregar rotas"))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Button
            title="+ Solicitar nova rota"
            onPress={() => router.push("/coordenador/solicitar-rota")}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.spacer} color={theme.text} />
          ) : error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.spacer}>
              Nenhuma rota cadastrada ainda.
            </ThemedText>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold" style={styles.flex}>
                {item.title}
              </ThemedText>
              {!item.is_active && (
                <ThemedText type="small" themeColor="textSecondary">
                  inativa
                </ThemedText>
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {item.origin} → {item.destination}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.departure_time?.slice(0, 5)} · {item.duration_min} min
            </ThemedText>
            <Button
              title="Solicitar edição"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/coordenador/solicitar-rota",
                  params: { id: item.id },
                })
              }
              style={styles.btn}
            />
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.three, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  spacer: { marginTop: Spacing.five, textAlign: "center" },
  error: { color: "#e5484d", marginTop: Spacing.five, textAlign: "center" },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
  btn: { marginTop: Spacing.two },
});
