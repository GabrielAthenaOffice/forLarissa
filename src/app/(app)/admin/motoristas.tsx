import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  createAccount,
  listDriverAccounts,
  setDriverApproval,
  type DriverAccount,
  type NewAccount,
} from "@/lib/queries/drivers";

const ROLE_OPTIONS: { value: NewAccount["role"]; label: string }[] = [
  { value: "driver", label: "Motorista" },
  { value: "coordinator", label: "Coordenador" },
];

export default function DriversScreen() {
  const theme = useTheme();
  const [accounts, setAccounts] = useState<DriverAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  // Form de criação de conta
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<NewAccount["role"]>("driver");
  const [creating, setCreating] = useState(false);
  // Credenciais da última conta criada (mostradas em card — Alert não funciona no web).
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listDriverAccounts()
      .then(setAccounts)
      .catch((e) => setError(e.message ?? "Erro ao carregar motoristas"))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  async function toggle(driverId: string, isApproved: boolean) {
    setActingId(driverId);
    try {
      await setDriverApproval(driverId, !isApproved);
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
    const pwd = password.trim();
    if (pwd && pwd.length < 6) {
      setError("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const result = await createAccount({
        name: name.trim(),
        email: email.trim(),
        role,
        password: pwd || undefined,
      });
      setCreated({ email: email.trim(), password: result.password });
      setName("");
      setEmail("");
      setPassword("");
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
        data={accounts}
        keyExtractor={(a) => a.profileId}
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
                <Input
                  label="Senha provisória (opcional)"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Deixe em branco para gerar automaticamente"
                  autoCapitalize="none"
                  autoCorrect={false}
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
            {created ? (
              <View style={[styles.createdCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">Conta criada ✓</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Repasse estas credenciais ao usuário:
                </ThemedText>
                <ThemedText type="small" selectable>
                  Email: {created.email}
                </ThemedText>
                <ThemedText type="small" selectable>
                  Senha: {created.password}
                </ThemedText>
                <Button
                  title="Ok, anotei"
                  variant="secondary"
                  onPress={() => setCreated(null)}
                  style={styles.btn}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Nenhum motorista cadastrado.
          </ThemedText>
        }
        renderItem={({ item }) => {
          const d = item.driver;
          return (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.row}>
                <ThemedText type="smallBold" style={styles.flex}>
                  {item.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {!d ? "Sem veículo" : d.is_approved ? "Aprovado ✓" : "Pendente"}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {item.email}
              </ThemedText>

              {d ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {d.vehicle_model ?? "—"}
                    {d.vehicle_plate ? ` · ${d.vehicle_plate}` : ""} · {d.seat_count} vagas
                  </ThemedText>
                  {d.phone && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.phone}
                    </ThemedText>
                  )}
                  <Button
                    title={d.is_approved ? "Revogar aprovação" : "Aprovar"}
                    variant={d.is_approved ? "secondary" : "primary"}
                    onPress={() => toggle(d.id, d.is_approved)}
                    loading={actingId === d.id}
                    style={styles.btn}
                  />
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Conta criada — aguardando o motorista cadastrar o veículo.
                </ThemedText>
              )}
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
  headerGap: { gap: Spacing.three },
  formCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three },
  roleRow: { flexDirection: "row", gap: Spacing.two },
  roleChip: { flex: 1, height: 44, borderRadius: Spacing.three, alignItems: "center", justifyContent: "center" },
  formActions: { flexDirection: "row", gap: Spacing.two },
  empty: { textAlign: "center", marginTop: Spacing.five },
  error: { color: "#e5484d" },
  createdCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  flex: { flex: 1 },
  btn: { marginTop: Spacing.two },
});
