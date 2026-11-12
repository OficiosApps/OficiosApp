import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Message = { id: string; role: "user" | "assistant"; content: string };
const suggestions = [
  "¿Cómo pido un servicio?",
  "¿Dónde veo mis solicitudes?",
  "¿Cómo guardo la dirección de mi casa?",
  "¿Puedo agregar fotos de lo que necesito?",
  "¿Dónde encuentro a los profesionales que contraté?",
];

function context(messages: Message[]) {
  const selected = messages
    .slice(-12)
    .map(({ role, content }) => ({ role, content: content.slice(0, 1600) }));
  while (selected.reduce((total, message) => total + message.content.length, 0) > 9500)
    selected.shift();
  return selected;
}

export function HelpChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy, error, open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setChecking(true);
    void fetch("/api/chat/status", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (typeof data.configured !== "boolean") throw new Error();
        setConfigured(data.configured);
      })
      .catch(() => {
        if (!controller.signal.aborted) setConfigured(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [open]);

  async function send(text: string, retry = false) {
    if (busy || !configured || !text.trim()) return;
    const next: Message[] = retry
      ? messages
      : [...messages, { id: crypto.randomUUID(), role: "user", content: text.trim() }];
    if (!retry) {
      setMessages(next);
      setDraft("");
    }
    setError("");
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: context(next) }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "not_configured") setConfigured(false);
        throw new Error(
          typeof data.error === "string" ? data.error : "No se pudo obtener la respuesta.",
        );
      }
      if (typeof data.reply !== "string" || !data.reply.trim())
        throw new Error("La respuesta llegó vacía. Probá de nuevo.");
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "assistant", content: data.reply },
      ]);
    } catch (cause) {
      if (request.current === controller)
        setError(
          controller.signal.aborted
            ? "La consulta tardó demasiado. Podés volver a intentarlo."
            : cause instanceof Error
              ? cause.message
              : "No se pudo conectar. Revisá tu conexión y volvé a intentar.",
        );
    } finally {
      window.clearTimeout(timer);
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  }

  function restart() {
    request.current?.abort();
    request.current = null;
    setMessages([]);
    setDraft("");
    setBusy(false);
    setError("");
    input.current?.focus();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="gradient-trust fixed bottom-[calc(1rem_+_env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full border border-white/20 px-5 py-3.5 font-semibold text-primary-foreground shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          aria-label="Abrir chat de ayuda con IA"
        >
          <MessageCircle className="size-5" />
          <span className="text-sm">Ayuda IA</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-[100dvh] w-full flex-col gap-0 border-l p-0 sm:max-w-md [&>button]:text-white"
      >
        <header className="gradient-trust shrink-0 px-5 pb-5 pt-6 text-primary-foreground">
          <div className="flex items-center gap-3 pr-7">
            <span className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10">
              <Bot className="size-6" />
            </span>
            <div>
              <SheetTitle className="font-display text-lg text-white">Oficios te ayuda</SheetTitle>
              <SheetDescription className="mt-1 text-xs text-white/75">
                Asistente con IA de OpenAI
              </SheetDescription>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 text-xs text-white/80">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              Consultas sobre la app
            </span>
            <button
              type="button"
              onClick={restart}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-white hover:bg-white/10"
            >
              <RotateCcw className="size-3.5" />
              Nueva conversación
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-4">
            <p className="text-sm leading-relaxed">
              ¡Hola! Te ayudo a encontrar un oficio, preparar tu pedido y ubicar tus solicitudes. ¿Qué necesitás resolver?
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Te responde una IA. No contrata servicios ni accede a tus pedidos.
            </p>
          </div>
          {checking ? (
            <p role="status" className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              Comprobando disponibilidad…
            </p>
          ) : (
            !configured && (
              <div
                role="status"
                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950"
              >
                {configured === false
                  ? "El chat con IA está pendiente de activación. Mientras tanto, podés usar los accesos de ayuda de abajo."
                  : "No se pudo comprobar la conexión con el asistente. Cerrá y volvé a abrir el chat para reintentar."}
              </div>
            )
          )}
          {messages.length === 0 && (
            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold text-muted-foreground">
                Podés empezar por acá
              </p>
              <div className="space-y-2">
                {suggestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={!configured || busy}
                    onClick={() => {
                      void send(question);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-xs font-medium text-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {question}
                    <ChevronRight className="size-4 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div
            role="log"
            aria-label="Conversación de ayuda"
            aria-live="polite"
            aria-relevant="additions"
            className="mt-5 space-y-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 ${message.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-tl-sm border border-border bg-card"}`}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-65">
                    {message.role === "user" ? "Vos" : "Oficios · IA"}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {busy && (
            <p role="status" className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Preparando una respuesta…
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-destructive/25 bg-card p-3 text-xs text-destructive"
            >
              <p>{error}</p>
              {configured && messages.at(-1)?.role === "user" && (
                <button
                  type="button"
                  className="mt-2 font-semibold underline"
                  disabled={busy}
                  onClick={() => {
                    void send(messages.at(-1)!.content, true);
                  }}
                >
                  Volver a intentar
                </button>
              )}
            </div>
          )}
          <div ref={end} />
        </div>
        <footer className="shrink-0 border-t border-border bg-card px-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] pt-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { to: "/solicitud", label: "Pedir servicio" },
              { to: "/mis-solicitudes", label: "Mis solicitudes" },
              { to: "/mis-direcciones", label: "Mis direcciones" },
              { to: "/como-funciona", label: "Cómo funciona" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-medium text-primary hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <form onSubmit={submit} className="flex items-end gap-2">
            <label htmlFor="help-chat-message" className="sr-only">
              Tu pregunta para el asistente
            </label>
            <Textarea
              ref={input}
              id="help-chat-message"
              rows={2}
              maxLength={1600}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!configured || busy}
              placeholder={configured ? "Escribí tu consulta…" : "La IA todavía no está disponible"}
              className="max-h-32 min-h-12 resize-none text-sm"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="mb-0.5 shrink-0 rounded-xl"
              aria-label="Enviar pregunta"
              disabled={!configured || busy || !draft.trim()}
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </form>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Se envía a OpenAI lo que escribas. No compartas DNI, fotos, contraseñas ni claves. La IA
            puede equivocarse.
          </p>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
