import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Car, MapPin, Navigation } from "lucide-react-native";

import { Dashboard, type DashboardAction } from "@/components/dashboard";
import { useMyDriver } from "@/hooks/use-my-driver";
import { driverStats } from "@/lib/queries/stats";
import { useTheme } from "@/hooks/use-theme";

export default function MotoristaHome() {
  const theme = useTheme();
  const { driver } = useMyDriver();
  const [s, setS] = useState({ assignmentsToday: 0, upcoming: 0 });

  useFocusEffect(
    useCallback(() => {
      if (driver) {
        driverStats(driver.id)
          .then(setS)
          .catch(() => {});
      }
    }, [driver])
  );

  const vehicleCaption = !driver
    ? "Cadastre seu veículo para começar"
    : driver.is_approved
      ? "Veículo aprovado ✓"
      : "Aprovação do veículo pendente";

  const ACTIONS: DashboardAction[] = [
    { label: "Meu veículo", description: "Cadastrar dados do carro", href: "/motorista/veiculo", icon: <Car size={20} stroke={theme.accent} /> },
    { label: "Minhas rotas", description: "Rotas designadas a você", href: "/motorista/minhas-rotas", icon: <MapPin size={20} stroke={theme.accent} /> },
  ];

  return (
    <Dashboard
      roleLabel="Motorista"
      hero={{
        label: "Rotas hoje",
        value: s.assignmentsToday,
        caption: vehicleCaption,
        icon: <Navigation size={28} stroke={theme.accentText} />,
      }}
      stats={[{ label: "Próximas rotas", value: s.upcoming }]}
      actions={ACTIONS}
    />
  );
}
