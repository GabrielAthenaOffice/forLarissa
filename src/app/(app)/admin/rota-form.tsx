import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { createRoute, getRoute, updateRoute } from "@/lib/queries/routes";

export default function RouteFormScreen() {
  const router = useRouter();
  const { profile } = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega a rota existente ao editar.
  useEffect(() => {
    if (!id) return;
    let active = true;
    getRoute(id)
      .then((route) => {
        if (!active) return;
        setTitle(route.title);
        setOrigin(route.origin);
        setDestination(route.destination);
        setDescription(route.description ?? "");
        setIsActive(route.is_active);
      })
      .catch((e) => active && setError(e.message ?? "Erro ao carregar rota"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSave() {
    setError(null);
    if (!title.trim() || !origin.trim() || !destination.trim()) {
      setError("Preencha título, origem e destino.");
      return;
    }
    const input = {
      title: title.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };
    setSaving(true);
    try {
      if (isEditing) {
        await updateRoute(id, input);
      } else {
        await createRoute(input, profile!.id);
      }
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Erro ao salvar rota");
      setSaving(false);
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
      <Stack.Screen options={{ title: isEditing ? "Editar rota" : "Nova rota" }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Input
            label="Título"
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Centro → Zona Sul"
          />
          <Input
            label="Origem"
            value={origin}
            onChangeText={setOrigin}
            placeholder="Ponto de partida"
          />
          <Input
            label="Destino"
            value={destination}
            onChangeText={setDestination}
            placeholder="Ponto de chegada"
          />
          <Input
            label="Descrição (opcional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Detalhes da rota"
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />

          <View style={styles.switchRow}>
            <ThemedText type="smallBold">Rota ativa</ThemedText>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Button
            title={isEditing ? "Salvar alterações" : "Cadastrar rota"}
            onPress={handleSave}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  multiline: { height: 96, paddingTop: Spacing.three, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.two,
  },
  error: { color: "#e5484d" },
});


