import { useEffect, useState } from "react";
import {
  isClientPortfolio,
  type ClientPortfolio,
} from "@/lib/client-portfolio";
import { customerStorage, emptyCustomerPortfolio } from "@/lib/customer-state";
const KEY = customerStorage.portfolio;
const EVENT = "oficios-customer-contacts-updated";
function read(): ClientPortfolio {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const parsed: unknown = JSON.parse(raw);
    if (isClientPortfolio(parsed)) return parsed;
  }
  return emptyCustomerPortfolio();
}
export function useClientPortfolio() {
  const [portfolio, setPortfolio] = useState<ClientPortfolio>(emptyCustomerPortfolio);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try {
        setPortfolio(read());
        setError("");
      } catch {
        setError("No se pudo leer el historial de este navegador.");
      }
      setReady(true);
    };
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  function update(operation: (state: ClientPortfolio) => ClientPortfolio) {
    if (!ready) throw new Error("Esperá a que termine de cargar tu historial.");
    const previous = read();
    const next = operation(previous);
    if (next === previous) return;
    localStorage.setItem(KEY, JSON.stringify(next));
    setPortfolio(next);
    window.dispatchEvent(new Event(EVENT));
  }
  return { portfolio, ready, error, update };
}
