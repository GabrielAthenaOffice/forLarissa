import { Redirect } from "expo-router";
import { Button } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useSession } from "@/context/auth";
import { roleHome } from "@/lib/roles";

export default function AppIndex() {
  const { profile, isLoading, signOut } = useSession();

  // Perfil ainda carregando
  if (isLoading) return <ThemedView style={{ flex: 1 }} />;

  if (!profile) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <ThemedText style={{ textAlign: "center", marginBottom: 20 }}>
          O seu perfil não foi encontrado. Isso pode ocorrer se o cadastro não foi concluído corretamente.
        </ThemedText>
        <Button title="Sair da conta" onPress={signOut} />
      </ThemedView>
    );
  }

  return <Redirect href={roleHome[profile.role]} />;
}


