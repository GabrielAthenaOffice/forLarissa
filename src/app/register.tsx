import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import type { UserRole } from "@/types/database";

// Admin é criado pelo coordenador; no cadastro só passageiro ou motorista.
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "passenger", label: "Passageiro" },
  { value: "driver", label: "Motorista" },
];

export default function RegisterScreen() {
  const { signUp } = useSession();
  const router = useRouter();
  const theme = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("passenger");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!name || !email || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp({
      name,
      email,
      password,
      role,
    });
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }
    if (needsConfirmation) {
      Alert.alert(
        "Confirme seu email",
        "Enviamos um link de confirmação. Confirme e faça login para continuar."
      );
      router.replace("/login");
    }
    // Sem confirmação: o guard de rota redireciona automaticamente.
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.header}>
              <ThemedText type="title">Criar conta</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                Comece a usar o rotas-flow
              </ThemedText>
            </View>

            <View style={styles.form}>
              <Input
                label="Nome"
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                autoCapitalize="words"
              />
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="voce@exemplo.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                inputMode="email"
              />
              <Input
                label="Senha"
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                autoCapitalize="none"
              />

              <View style={styles.roleWrapper}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Você é
                </ThemedText>
                <View style={styles.roleRow}>
                  {ROLE_OPTIONS.map((option) => {
                    const selected = role === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setRole(option.value)}
                        style={[
                          styles.roleChip,
                          {
                            backgroundColor: selected
                              ? theme.text
                              : theme.backgroundElement,
                          },
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{
                            color: selected ? theme.background : theme.text,
                          }}
                        >
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {error && (
                <ThemedText type="small" style={styles.error}>
                  {error}
                </ThemedText>
              )}

              <Button title="Criar conta" onPress={handleSubmit} loading={loading} />
            </View>

            <View style={styles.footer}>
              <ThemedText type="small" themeColor="textSecondary">
                Já tem conta?
              </ThemedText>
              <Link href="/login">
                <ThemedText type="linkPrimary">Entrar</ThemedText>
              </Link>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.five,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  header: { gap: Spacing.two },
  form: { gap: Spacing.three },
  roleWrapper: { gap: Spacing.two },
  roleRow: { flexDirection: "row", gap: Spacing.two },
  roleChip: {
    flex: 1,
    height: 48,
    borderRadius: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: "#e5484d" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
});


