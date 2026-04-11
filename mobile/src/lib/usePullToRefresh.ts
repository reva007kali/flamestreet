import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function usePullToRefresh() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
      await qc.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }, [qc, refreshing]);

  return { refreshing, onRefresh };
}

