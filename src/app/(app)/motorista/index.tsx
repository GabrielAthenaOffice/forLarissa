import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Car, CalendarClock, Users, MapPin, Navigation } from "lucide-react-native";

import { Dashboard, type DashboardAction } from "@/components/dashboard";
import { useMyDriver } from "@/hooks/use-my-driver";
import { driverStats } from "@/lib/queries/stats";
import { useTheme } from "@/hooks/use-theme";

export default function MotoristaHome() {
  const theme = useTheme();
  const { driver } = useMyDriver();
  const [s, setS] = useState({ tripsToday: 0, upcomingTrips: 0, pendingRequests: 0 });

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
    { label: "Disponibilidade", description: "Informar datas e horários", href: "/motorista/disponibilidade", icon: <CalendarClock size={20} stroke={theme.accent} /> },
    { label: "Solicitações", description: "Aprovar ou recusar passageiros", href: "/motorista/solicitacoes", icon: <Users size={20} stroke={theme.accent} /> },
    { label: "Agenda do dia", description: "Viagens confirmadas", href: "/motorista/agenda", icon: <MapPin size={20} stroke={theme.accent} /> },
  ];

  return (
    <Dashboard
      roleLabel="Motorista"
      hero={{ 
        label: "Viagens hoje", 
        value: s.tripsToday, 
        caption: vehicleCaption,
        icon: <Navigation size={28} stroke={theme.accentText} />
      }}
      stats={[
        { label: "Próximas viagens", value: s.upcomingTrips },
        {
          label: "Solicitações",
          value: s.pendingRequests,
          tone: s.pendingRequests > 0 ? "accent" : "default",
        },
      ]}
      actions={ACTIONS}
    />
  );
}


