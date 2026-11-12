import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { marketApi, type MarketSession } from "@/lib/market-client";
const initial: MarketSession = {
  authenticated: false,
  identity: null,
  account: null,
  staffRole: null,
};
const MarketContext = createContext({
  session: initial,
  loading: true,
  error: "",
  refresh: async () => {},
});
export function MarketProvider({ children }: { children: ReactNode }) {
  const epoch = useRef(0);
  const [session, setSession] = useState(initial),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const current = ++epoch.current;
    try {
      const result = await marketApi<MarketSession>("/session");
      if (current !== epoch.current) return;
      setSession(result);
      setError("");
    } catch (e) {
      if (current !== epoch.current) return;
      setError(e instanceof Error ? e.message : "No pudimos cargar tu cuenta.");
    } finally {
      if (current === epoch.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      ++epoch.current;
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh]);
  return (
    <MarketContext.Provider value={{ session, loading, error, refresh }}>
      {children}
    </MarketContext.Provider>
  );
}
export const useMarket = () => useContext(MarketContext);
export function useRemote<T>(path: string | null, poll = false) {
  const epoch = useRef(0);
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(Boolean(path)),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const current = ++epoch.current;
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const result = await marketApi<T>(path);
      if (current !== epoch.current) return;
      setData(result);
      setError("");
    } catch (e) {
      if (current !== epoch.current) return;
      setError(e instanceof Error ? e.message : "No pudimos cargar los datos.");
    } finally {
      if (current === epoch.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    setError("");
    setLoading(Boolean(path));
    void refresh();
    if (!poll)
      return () => {
        ++epoch.current;
      };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20000);
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      ++epoch.current;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh, poll, path]);
  return { data, loading, error, refresh };
}
