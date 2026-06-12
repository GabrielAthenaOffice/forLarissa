import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/use-stack-options";

export default function MotoristaLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="veiculo" options={{ title: "Meu veículo" }} />
      <Stack.Screen name="disponibilidade" options={{ title: "Disponibilidade" }} />
      <Stack.Screen name="agenda" options={{ title: "Agenda" }} />
      <Stack.Screen name="solicitacoes" options={{ title: "Solicitações" }} />
    </Stack>
  );
}


