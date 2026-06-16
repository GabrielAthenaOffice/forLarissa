import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Route, PlusCircle, ClipboardList, Users, BarChart3, ClipboardCheck } from "lucide-react-native";

import { Dashboard, type DashboardAction } from "@/components/dashboard";
import { useSession } from "@/context/auth";
import { coordinatorStats } from "@/lib/queries/stats";
import { useTheme } from "@/hooks/use-theme";

export default function CoordenadorHome() {
  const theme = useTheme();
  const { profile } = useSession();
  const [s, setS] = useState({ activeRoutes: 0, drivers: 0, myPending: 0 });

  useFocusEffect(
    useCallback(() => {
      if (profile) {
        coordinatorStats(profile.id)
          .then(setS)
          .catch(() => {});
      }
    }, [profile])
  );

  const ACTIONS: DashboardAction[] = [
    { label: "Rotas", description: "Ver rotas e solicitar edição", href: "/coordenador/rotas", icon: <Route size={20} stroke={theme.accent} /> },
    { label: "Solicitar rota", description: "Pedir criação de uma rota", href: "/coordenador/solicitar-rota", icon: <PlusCircle size={20} stroke={theme.accent} /> },
    { label: "Minhas solicitações", description: "Acompanhar aprovações", href: "/coordenador/solicitacoes", icon: <ClipboardList size={20} stroke={theme.accent} /> },
    { label: "Motoristas", description: "Ver motoristas cadastrados", href: "/coordenador/motoristas", icon: <Users size={20} stroke={theme.accent} /> },
    { label: "Relatórios", description: "Designações por dia", href: "/coordenador/relatorios", icon: <BarChart3 size={20} stroke={theme.accent} /> },
  ];

  return (
    <Dashboard
      roleLabel="Coordenador"
      hero={{
        label: "Rotas ativas",
        value: s.activeRoutes,
        caption: `${s.myPending} solicitação(ões) sua(s) pendente(s)`,
        icon: <ClipboardCheck size={28} stroke={theme.accentText} />,
      }}
      stats={[
        { label: "Motoristas", value: s.drivers },
        {
          label: "Minhas pendentes",
          value: s.myPending,
          tone: s.myPending > 0 ? "accent" : "default",
        },
      ]}
      actions={ACTIONS}
    />
  );
}
