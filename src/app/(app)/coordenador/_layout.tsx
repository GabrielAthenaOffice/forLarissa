import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/use-stack-options";

export default function CoordenadorLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="rotas" options={{ title: "Rotas" }} />
      <Stack.Screen name="solicitar-rota" options={{ title: "Solicitar rota", presentation: "modal" }} />
      <Stack.Screen name="solicitacoes" options={{ title: "Minhas solicitações" }} />
      <Stack.Screen name="motoristas" options={{ title: "Motoristas" }} />
      <Stack.Screen name="relatorios" options={{ title: "Relatórios" }} />
    </Stack>
  );
}
