import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useClientPortfolio } from "@/hooks/use-client-portfolio";
import {
  markContactMessagesRead,
  sendContactMessage,
  unreadContactMessages,
  type ContactMessage,
} from "@/lib/client-portfolio";
import { getProfesional } from "@/lib/mock-data";

export function ContactConversation({
  professionalId,
  side = "cliente",
}: {
  professionalId: string;
  side?: ContactMessage["sender"];
}) {
  const { portfolio, ready, error: loadError, update } = useClientPortfolio();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const messages = portfolio.conversations[professionalId] ?? [];
  const unread = unreadContactMessages(portfolio, professionalId, side);
  const pro = getProfesional(professionalId);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);
  useEffect(() => {
    if (ready && unread) {
      try {
        update((state) => markContactMessagesRead(state, professionalId, side));
      } catch {}
    }
  }, [ready, unread, professionalId, side]);
  function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!draft.trim()) return;
    try {
      update((state) =>
        sendContactMessage(state, professionalId, side, draft, crypto.randomUUID()),
      );
      setDraft("");
      setError("");
      input.current?.focus();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar el mensaje.");
    }
  }
  return (
    <section
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={`Conversación con ${side === "cliente" ? pro?.nombre : "tu cliente de ejemplo"}`}
    >
      <div className="border-b border-border bg-secondary/50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="size-4 text-primary" />
          {side === "cliente" ? pro?.nombre : "Cliente de ejemplo"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {side === "cliente" ? pro?.oficio : "Persona que ya te contrató"} · historial privado de
          prueba
        </p>
      </div>
      <div
        role="log"
        aria-label="Historial de mensajes"
        aria-live="polite"
        aria-relevant="additions"
        className="h-[min(48dvh,24rem)] min-h-40 space-y-3 overflow-y-auto overscroll-contain p-4"
      >
        {!ready ? (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando conversación…
          </p>
        ) : !messages.length ? (
          <div className="py-8 text-center">
            <MessageCircle className="mx-auto mb-4 size-8 text-primary" />
            <p className="text-sm font-medium">Retomá el contacto cuando lo necesites</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Consultá por otro trabajo o coordiná una nueva visita.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === side ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.sender === side ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary"}`}
              >
                <p className="mb-1 text-[10px] font-semibold opacity-70">
                  {message.sender === side
                    ? "Vos"
                    : message.sender === "cliente"
                      ? "Cliente"
                      : pro?.nombre}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {message.text}
                </p>
                <p className="mt-2 text-[10px] opacity-70">
                  {new Intl.DateTimeFormat("es-AR", {
                    timeZone: "America/Buenos_Aires",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(message.sentAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>
      <div className="border-t border-border p-4">
        {side === "cliente" && (
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              "Hola, ¿tenés disponibilidad para otro trabajo?",
              "Quería consultarte por un nuevo presupuesto.",
            ].map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => {
                  setDraft(text);
                  input.current?.focus();
                }}
                className="rounded-full bg-secondary px-3 py-1.5 text-left text-[11px] font-medium text-primary"
              >
                {text}
              </button>
            ))}
          </div>
        )}
        <form className="flex items-end gap-2" onSubmit={send}>
          <label htmlFor={`contact-message-${side}-${professionalId}`} className="sr-only">
            Escribí tu mensaje
          </label>
          <Textarea
            ref={input}
            id={`contact-message-${side}-${professionalId}`}
            rows={2}
            maxLength={2000}
            disabled={!ready || Boolean(loadError)}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribí tu mensaje…"
            className="min-h-14 resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Guardar mensaje de prueba"
            disabled={!ready || !draft.trim() || Boolean(loadError)}
            className="mb-1 shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </form>
        {(error || loadError) && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error || loadError}
          </p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Mensajería de demostración: se guarda en este navegador. No envía mensajes ni
          notificaciones a personas reales. Las respuestas profesionales requieren escribir desde la
          vista profesional de prueba.
        </p>
      </div>
    </section>
  );
}

export function ProfessionalClientInbox({ professionalId }: { professionalId: string }) {
  const { portfolio, ready } = useClientPortfolio();
  const jobs = portfolio.jobs.filter((job) => job.professionalId === professionalId);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[0.65fr_1fr]">
      <aside className="surface-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Mensajes de clientes
        </p>
        <h2 className="mt-3 font-display text-xl font-semibold">
          Volvé a trabajar con tus clientes
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Esta bandeja reúne las conversaciones de quienes ya te contrataron.
        </p>
        <div className="mt-5 rounded-xl bg-secondary p-4">
          <p className="font-semibold">Cliente de ejemplo</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {jobs.length} trabajos registrados con vos.
          </p>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Para probar ida y vuelta, escribí desde Mis profesionales como cliente y respondé desde
          esta pestaña del panel de Gustavo.
        </p>
      </aside>
      {ready && jobs.length ? (
        <ContactConversation professionalId={professionalId} side="profesional" />
      ) : (
        <div role="status" className="surface-panel p-8 text-sm text-muted-foreground">
          {ready
            ? "Todavía no tenés conversaciones con este cliente de ejemplo."
            : "Cargando bandeja…"}
        </div>
      )}
    </div>
  );
}
