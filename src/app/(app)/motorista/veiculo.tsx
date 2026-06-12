import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { useMyDriver } from "@/hooks/use-my-driver";
import { saveDriver } from "@/lib/queries/drivers";

export default function VehicleScreen() {
  const router = useRouter();
  const { profile } = useSession();
  const { driver, loading } = useMyDriver();

  const [phone, setPhone] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");
  const [seats, setSeats] = useState("4");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preenche o formulário quando o cadastro existente carrega.
  useEffect(() => {
    if (!driver) return;
    setPhone(driver.phone ?? "");
    setModel(driver.vehicle_model ?? "");
    setPlate(driver.vehicle_plate ?? "");
    setColor(driver.vehicle_color ?? "");
    setSeats(String(driver.seat_count));
  }, [driver]);

  async function handleSave() {
    setError(null);
    const seatCount = Number(seats);
    if (!model.trim() || !plate.trim()) {
      setError("Informe ao menos modelo e placa.");
      return;
    }
    if (!Number.isInteger(seatCount) || seatCount < 1) {
      setError("Número de vagas inválido.");
      return;
    }
    setSaving(true);
    try {
      await saveDriver(
        profile!.id,
        {
          phone: phone.trim() || null,
          vehicle_model: model.trim(),
          vehicle_plate: plate.trim().toUpperCase(),
          vehicle_color: color.trim() || null,
          seat_count: seatCount,
        },
        driver?.id
      );
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Erro ao salvar veículo");
      setSaving(false);
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.statusRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Status do cadastro
            </ThemedText>
            <ThemedText type="smallBold">
              {driver?.is_approved ? "Aprovado ✓" : "Aguardando aprovação"}
            </ThemedText>
          </View>

          <Input label="Telefone" value={phone} onChangeText={setPhone} placeholder="(11) 99999-0000" keyboardType="phone-pad" />
          <Input label="Modelo do veículo" value={model} onChangeText={setModel} placeholder="Ex: Toyota Corolla" />
          <Input label="Placa" value={plate} onChangeText={setPlate} placeholder="ABC1D23" autoCapitalize="characters" />
          <Input label="Cor" value={color} onChangeText={setColor} placeholder="Ex: Prata" />
          <Input label="Número de vagas" value={seats} onChangeText={setSeats} placeholder="4" keyboardType="number-pad" />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Button
            title={driver ? "Salvar alterações" : "Cadastrar veículo"}
            onPress={handleSave}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  statusRow: {
    gap: Spacing.half,
    paddingBottom: Spacing.two,
  },
  error: { color: "#e5484d" },
});


