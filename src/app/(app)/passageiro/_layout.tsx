import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/use-stack-options";

export default function PassageiroLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="viagens" options={{ title: "Viagens disponíveis" }} />
      <Stack.Screen name="minhas-viagens" options={{ title: "Minhas viagens" }} />
      <Stack.Screen name="historico" options={{ title: "Histórico" }} />
    </Stack>
  );
}


