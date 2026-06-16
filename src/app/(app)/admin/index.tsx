import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Route, Users, Calendar, ClipboardList, BarChart3, MapPin, Settings2 } from "lucide-react-native";

import { Dashboard, type DashboardAction } from "@/components/dashboard";
import { adminStats } from "@/lib/queries/stats";
import { useTheme } from "@/hooks/use-theme";

export default function AdminHome() {
  const theme = useTheme();
  const [s, setS] = useState({
    activeRoutes: 0,
    pendingDrivers: 0,
    assignmentsToday: 0,
    pendingRequests: 0,
  });

  useFocusEffect(
    useCallback(() => {
      adminStats()
        .then(setS)
        .catch(() => {});
    }, [])
  );

  const ACTIONS: DashboardAction[] = [
    { label: "Rotas", description: "Cadastrar e listar rotas", href: "/admin/rotas", icon: <Route size={20} stroke={theme.accent} /> },
    { label: "Designações", description: "Atribuir rotas a motoristas", href: "/admin/designacoes", icon: <MapPin size={20} stroke={theme.accent} /> },
    { label: "Motoristas", description: "Aprovar e criar contas", href: "/admin/motoristas", icon: <Users size={20} stroke={theme.accent} /> },
    { label: "Solicitações", description: "Pedidos de rota do coordenador", href: "/admin/solicitacoes", icon: <ClipboardList size={20} stroke={theme.accent} /> },
    { label: "Calendário", description: "Designações por dia", href: "/admin/calendario", icon: <Calendar size={20} stroke={theme.accent} /> },
    { label: "Relatórios", description: "Relatório por rota/motorista", href: "/admin/relatorios", icon: <BarChart3 size={20} stroke={theme.accent} /> },
  ];

  return (
    <Dashboard
      roleLabel="Administrador"
      hero={{
        label: "Rotas designadas hoje",
        value: s.assignmentsToday,
        caption: `${s.pendingRequests} solicitação(ões) pendente(s)`,
        icon: <Settings2 size={28} stroke={theme.accentText} />,
      }}
      stats={[
        { label: "Rotas ativas", value: s.activeRoutes },
        {
          label: "Aprovar motorista",
          value: s.pendingDrivers,
          tone: s.pendingDrivers > 0 ? "warning" : "default",
        },
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
