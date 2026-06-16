import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { useSession } from "@/context/auth";
import { getRoute } from "@/lib/queries/routes";
import { createRouteRequest } from "@/lib/queries/route-requests";

/**
 * Coordenador solicita CRIAÇÃO de uma rota, ou EDIÇÃO de uma existente
 * (quando recebe ?id=<route_id>). O admin aprova depois.
 */
export default function SolicitarRotaScreen() {
  const router = useRouter();
  const { profile } = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [departureTime, setDepartureTime] = useState("08:00");
  const [durationMin, setDurationMin] = useState("60");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ao solicitar edição, pré-carrega os valores atuais da rota.
  useEffect(() => {
    if (!id) return;
    let active = true;
    getRoute(id)
      .then((r) => {
        if (!active) return;
        setTitle(r.title);
        setOrigin(r.origin);
        setDestination(r.destination);
        setDescription(r.description ?? "");
        setDepartureTime(r.departure_time?.slice(0, 5) || "08:00");
        setDurationMin(String(r.duration_min ?? 60));
      })
      .catch((e) => active && setError(e.message ?? "Erro ao carregar rota"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit() {
    setError(null);
    if (!title.trim() || !origin.trim() || !destination.trim()) {
      setError("Preencha título, origem e destino.");
      return;
    }
    const duration = parseInt(durationMin, 10);
    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Informe uma duração válida (em minutos).");
      return;
    }
    setSaving(true);
    try {
      await createRouteRequest(
        {
          kind: isEdit ? "edit" : "create",
          route_id: id ?? null,
          title: title.trim(),
          origin: origin.trim(),
          destination: destination.trim(),
          description: description.trim() || null,
          departure_time: departureTime,
          duration_min: duration,
        },
        profile!.id
      );
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Erro ao enviar solicitação");
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
      <Stack.Screen options={{ title: isEdit ? "Solicitar edição" : "Solicitar rota" }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="small" themeColor="textSecondary">
            Esta solicitação será enviada ao administrador para aprovação.
          </ThemedText>

          <Input label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Centro → Zona Sul" />
          <Input label="Origem" value={origin} onChangeText={setOrigin} placeholder="Ponto de partida" />
          <Input label="Destino" value={destination} onChangeText={setDestination} placeholder="Ponto de chegada" />

          <View style={styles.timeRow}>
            <View style={styles.flex}>
              <DateTimeField label="Horário de partida" value={departureTime} onChange={setDepartureTime} mode="time" />
            </View>
            <View style={styles.flex}>
              <Input
                label="Duração (min)"
                value={durationMin}
                onChangeText={setDurationMin}
                placeholder="60"
                keyboardType="number-pad"
                inputMode="numeric"
              />
            </View>
          </View>

          <Input
            label="Descrição (opcional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Justificativa / detalhes"
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Button
            title={isEdit ? "Enviar solicitação de edição" : "Enviar solicitação"}
            onPress={handleSubmit}
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
  scroll: { padding: Spacing.four, gap: Spacing.three, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  timeRow: { flexDirection: "row", gap: Spacing.three },
  multiline: { height: 96, paddingTop: Spacing.three, textAlignVertical: "top" },
  error: { color: "#e5484d" },
});
