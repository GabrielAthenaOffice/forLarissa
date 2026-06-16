import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/use-stack-options";

export default function MotoristaLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="veiculo" options={{ title: "Meu veículo" }} />
      <Stack.Screen name="minhas-rotas" options={{ title: "Minhas rotas" }} />
    </Stack>
  );
}
