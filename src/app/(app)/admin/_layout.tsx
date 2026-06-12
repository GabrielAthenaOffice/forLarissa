import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/use-stack-options";

export default function AdminLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="rotas" options={{ title: "Rotas" }} />
      <Stack.Screen name="rota-form" options={{ title: "Rota", presentation: "modal" }} />
      <Stack.Screen name="motoristas" options={{ title: "Motoristas" }} />
      <Stack.Screen name="solicitacoes" options={{ title: "Solicitações" }} />
      <Stack.Screen name="calendario" options={{ title: "Calendário" }} />
      <Stack.Screen name="relatorios" options={{ title: "Relatórios" }} />
    </Stack>
  );
}


