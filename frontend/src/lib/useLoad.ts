import { useCallback, useEffect, useState } from "react";

// Runs a loader and gives back the result, the error and a retry button handler.
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    loader()
      .then((result) => !cancelled && setData(result))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, round]);

  const retry = useCallback(() => setRound((n) => n + 1), []);
  return { data, failed, retry };
}
