import { useEffect, useState } from "react";
import {
  defaultProfessionalAccount,
  isProfessionalAccount,
  type ProfessionalAccount,
} from "@/lib/professional-account";
const KEY = "oficios-professional-account-pro-1";
const EVENT = "oficios-professional-account-updated";
function read(): ProfessionalAccount {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const data: unknown = JSON.parse(raw);
    if (isProfessionalAccount(data)) return data;
  }
  return defaultProfessionalAccount();
}
export function useProfessionalAccount() {
  const [account, setAccount] = useState<ProfessionalAccount>(defaultProfessionalAccount);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try {
        setAccount(read());
        setError("");
      } catch {
        setError("El navegador no permite guardar la configuración de prueba.");
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
  function update(operation: (account: ProfessionalAccount) => ProfessionalAccount) {
    if (!ready) throw new Error("Esperá a que termine de cargar tu configuración.");
    const next = operation(read());
    localStorage.setItem(KEY, JSON.stringify(next));
    setAccount(next);
    window.dispatchEvent(new Event(EVENT));
  }
  return { account, ready, error, update };
}
