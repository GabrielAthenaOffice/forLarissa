import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spacing, Radii } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import { roleLabel } from "@/lib/roles";

export default function ProfileScreen() {
  const { profile, signOut, updatePassword, updateProfileName } = useSession();
  const theme = useTheme();
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [name, setName] = useState(profile?.name ?? "");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingName, setLoadingName] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      Alert.alert("Erro", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    setLoadingPassword(true);
    const { error } = await updatePassword(password);
    setLoadingPassword(false);

    if (error) {
      Alert.alert("Erro ao atualizar", error);
    } else {
      Alert.alert("Sucesso", "Sua senha foi atualizada.");
      setPassword("");
    }
  };

  const handleUpdateName = async () => {
    if (name.trim().length < 2) {
      Alert.alert("Erro", "O nome deve ter pelo menos 2 caracteres.");
      return;
    }

    setLoadingName(true);
    const { error } = await updateProfileName(name);
    setLoadingName(false);

    if (error) {
      Alert.alert("Erro ao atualizar", error);
    } else {
      Alert.alert("Sucesso", "Seu nome foi atualizado.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Button
            title="Voltar"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <ThemedText type="subtitle">Meu Perfil</ThemedText>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="display" themeColor="accent">
                {profile?.name?.[0]?.toUpperCase() ?? "?"}
              </ThemedText>
            </View>
            
            <ThemedText type="subtitle" style={styles.name}>
              {profile?.name ?? "Nome não informado"}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.email}>
              {profile?.email ?? "E-mail não informado"}
            </ThemedText>

            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="smallBold" themeColor="accent">
                {profile ? roleLabel[profile.role] : "—"}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, alignItems: "stretch" }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Editar Informações</ThemedText>
            
            <View style={styles.formGroup}>
              <Input
                label="Nome"
                placeholder="Seu nome"
                value={name}
                onChangeText={setName}
              />
              <Button
                title="Atualizar Nome"
                loading={loadingName}
                onPress={handleUpdateName}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.formGroup}>
              <Input
                label="Nova Senha"
                placeholder="Digite a nova senha"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Button
                title="Atualizar Senha"
                loading={loadingPassword}
                onPress={handleUpdatePassword}
              />
            </View>
          </View>

          <Button 
            title="Sair da conta" 
            variant="secondary" 
            onPress={handleSignOut}
            style={styles.signOutButton}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  backButton: {
    height: 40,
    paddingHorizontal: Spacing.three,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  card: {
    padding: Spacing.six,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.two,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: Radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two,
  },
  name: {
    textAlign: "center",
  },
  email: {
    textAlign: "center",
    marginBottom: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.pill,
  },
  sectionTitle: {
    marginBottom: Spacing.four,
    textAlign: "center",
  },
  formGroup: {
    gap: Spacing.three,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(150, 150, 150, 0.2)",
    marginVertical: Spacing.six,
  },
  signOutButton: {
    marginTop: Spacing.two,
  },
});


