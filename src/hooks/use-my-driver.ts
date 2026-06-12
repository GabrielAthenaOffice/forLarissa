import { useCallback, useEffect, useState } from "react";

import { useSession } from "@/context/auth";
import { getMyDriver } from "@/lib/queries/drivers";
import type { Driver } from "@/types/database";

/** Carrega o cadastro de motorista do usuário logado. `reload` reexecuta a busca. */
export function useMyDriver() {
  const { profile } = useSession();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      setDriver(await getMyDriver(profile.id));
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar motorista");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { driver, loading, error, reload };
}
