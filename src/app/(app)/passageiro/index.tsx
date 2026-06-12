import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Search, Map, History, Compass } from "lucide-react-native";

import { Dashboard, type DashboardAction } from "@/components/dashboard";
import { useSession } from "@/context/auth";
import { passengerStats } from "@/lib/queries/stats";
import { useTheme } from "@/hooks/use-theme";

export default function PassageiroHome() {
  const theme = useTheme();
  const { profile } = useSession();
  const [s, setS] = useState({ pending: 0, confirmed: 0 });

  useFocusEffect(
    useCallback(() => {
      if (profile) {
        passengerStats(profile.id)
          .then(setS)
          .catch(() => {});
      }
    }, [profile])
  );

  const ACTIONS: DashboardAction[] = [
    { label: "Viagens disponíveis", description: "Ver rotas e solicitar vaga", href: "/passageiro/viagens", icon: <Search size={20} stroke={theme.accent} /> },
    { label: "Minhas viagens", description: "Acompanhar status das solicitações", href: "/passageiro/minhas-viagens", icon: <Map size={20} stroke={theme.accent} /> },
    { label: "Histórico", description: "Viagens já realizadas", href: "/passageiro/historico", icon: <History size={20} stroke={theme.accent} /> },
  ];

  return (
    <Dashboard
      roleLabel="Passageiro"
      hero={{
        label: "Viagens confirmadas",
        value: s.confirmed,
        caption: `${s.pending} aguardando aprovação`,
        icon: <Compass size={28} stroke={theme.accentText} />
      }}
      stats={[
        { label: "Confirmadas", value: s.confirmed, tone: "success" },
        {
          label: "Pendentes",
          value: s.pending,
          tone: s.pending > 0 ? "warning" : "default",
        },
      ]}
      actions={ACTIONS}
    />
  );
}


