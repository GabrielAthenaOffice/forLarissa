import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  createAccount,
  listAllDrivers,
  setDriverApproval,
  type DriverWithProfile,
  type NewAccount,
} from "@/lib/queries/drivers";

const ROLE_OPTIONS: { value: NewAccount["role"]; label: string }[] = [
  { value: "driver", label: "Motorista" },
  { value: "coordinator", label: "Coordenador" },
];

export default function DriversScreen() {
  const theme = useTheme();
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  // Form de criação de conta
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<NewAccount["role"]>("driver");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAllDrivers()
      .then(setDrivers)
      .catch((e) => setError(e.message ?? "Erro ao carregar motoristas"))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  async function toggle(d: DriverWithProfile) {
    setActingId(d.id);
    try {
      await setDriverApproval(d.id, !d.is_approved);
      load();
    } catch (e: any) {
      setError(e.message ?? "Erro ao atualizar motorista");
    } finally {
      setActingId(null);
    }
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim()) {
      setError("Informe nome e email.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const { password } = await createAccount({
        name: name.trim(),
        email: email.trim(),
        role,
      });
      Alert.alert(
        "Conta criada",
        `Senha provisória de ${email.trim()}:\n\n${password}\n\nRepasse ao usuário.`
      );
      setName("");
      setEmail("");
      setRole("driver");
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message ?? "Erro ao criar conta");
    } finally {
      setCreating(false);
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
        data={drivers}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerGap}>
            {showForm ? (
              <View style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
                <Input label="Nome" value={name} onChangeText={setName} placeholder="Nome completo" autoCapitalize="words" />
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="pessoa@exemplo.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  inputMode="email"
                />
                <View style={styles.roleRow}>
                  {ROLE_OPTIONS.map((o) => {
                    const selected = role === o.value;
                    return (
                      <Pressable
                        key={o.value}
                        onPress={() => setRole(o.value)}
                        style={[
                          styles.roleChip,
                          { backgroundColor: selected ? theme.text : theme.background },
                        ]}
                      >
                        <ThemedText type="smallBold" style={{ color: selected ? theme.background : theme.text }}>
                          {o.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.formActions}>
                  <Button title="Criar conta" onPress={handleCreate} loading={creating} style={styles.flex} />
                  <Button title="Cancelar" variant="secondary" onPress={() => setShowForm(false)} disabled={creating} style={styles.flex} />
                </View>
              </View>
            ) : (
              <Button title="+ Criar conta" onPress={() => setShowForm(true)} />
            )}
            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Nenhum motorista cadastrado.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.row}>
              <ThemedText type="smallBold" style={styles.flex}>
                {item.profile?.name ?? "Motorista"}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.is_approved ? "Aprovado ✓" : "Pendente"}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {item.vehicle_model ?? "—"}
              {item.vehicle_plate ? ` · ${item.vehicle_plate}` : ""} · {item.seat_count} vagas
            </ThemedText>
            {item.phone && (
              <ThemedText type="small" themeColor="textSecondary">
                {item.phone}
              </ThemedText>
            )}

            <Button
              title={item.is_approved ? "Revogar aprovação" : "Aprovar"}
              variant={item.is_approved ? "secondary" : "primary"}
              onPress={() => toggle(item)}
              loading={actingId === item.id}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing.three, gap: Spacing.three, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  headerGap: { gap: Spacing.three },
  formCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three },
  roleRow: { flexDirection: "row", gap: Spacing.two },
  roleChip: { flex: 1, height: 44, borderRadius: Spacing.three, alignItems: "center", justifyContent: "center" },
  formActions: { flexDirection: "row", gap: Spacing.two },
  empty: { textAlign: "center", marginTop: Spacing.five },
  error: { color: "#e5484d" },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
  btn: { marginTop: Spacing.two },
});
