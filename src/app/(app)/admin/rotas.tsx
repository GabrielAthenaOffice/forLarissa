import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { listRoutes } from "@/lib/queries/routes";
import type { Route } from "@/types/database";

export default function RoutesListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recarrega sempre que a tela volta ao foco (após criar/editar).
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
            title="+ Nova rota"
            onPress={() => router.push("/admin/rota-form")}
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
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.spacer}
            >
              Nenhuma rota cadastrada ainda.
            </ThemedText>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/admin/rota-form",
                params: { id: item.id },
              })
            }
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}
          >
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
          </Pressable>
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
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
});


