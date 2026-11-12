import { useEffect, useState } from "react";
import {
  initialServiceOperations,
  isServiceOperations,
  type ServiceOperations,
} from "@/lib/service-operations";
import { customerStorage } from "@/lib/customer-state";
const KEY = customerStorage.operations;
const EVENT = "oficios-customer-operations-changed";
function read(): ServiceOperations {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const value: unknown = JSON.parse(raw);
    if (isServiceOperations(value)) return value;
  }
  return initialServiceOperations();
}
export function useServiceOperations() {
  const [state, setState] = useState<ServiceOperations>(initialServiceOperations);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try {
        setState(read());
        setError("");
      } catch {
        setError("No se pudo leer la actividad guardada en este navegador.");
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
  function update(operation: (state: ServiceOperations) => ServiceOperations) {
    if (!ready) throw new Error("Esperá a que se cargue la actividad.");
    const previous = read();
    const next = operation(previous);
    if (next === previous) return;
    localStorage.setItem(KEY, JSON.stringify(next));
    setState(next);
    window.dispatchEvent(new Event(EVENT));
  }
  return { state, ready, error, update };
}
