import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, ShieldCheck, ClipboardCheck, Wrench, ArrowLeft, LogOut } from "lucide-react";
import { useMarket } from "@/hooks/use-market";
import { managementRoles } from "@/lib/management-access";
import { Button } from "@/components/ui/button";
export function ManagementLayout({ children }: { children: ReactNode }) {
  const { session } = useMarket();
  if (!session.staffRole) return null;
  const role = session.staffRole;
  const info = managementRoles[role];
  const Icon = role === "ceo" ? Crown : role === "superadmin" ? ShieldCheck : ClipboardCheck;
  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link
            to={info.home}
            className="flex items-center gap-2 font-display text-xl font-semibold"
          >
            <Wrench className="size-6 text-primary" />
            Oficios <span className="text-sm font-normal text-muted-foreground">/ Gestión</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="break-all text-muted-foreground">{session.identity?.email}</span>
            <form method="post" action="/auth/logout">
              <Button type="submit" size="sm" variant="outline">
                <LogOut className="size-4" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className={`p-6 lg:min-h-[calc(100vh-80px)] ${info.color}`}>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${info.badge}`}
          >
            <Icon className="size-4" />
            {info.label}
          </div>
          <p className="mt-7 text-xs uppercase tracking-widest opacity-60">Tu espacio de trabajo</p>
          <nav aria-label="Gestión" className="mt-3">
            <Link
              to={info.home}
              className="block rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold"
            >
              {info.title}
            </Link>
          </nav>
          <ul className="mt-5 hidden space-y-4 text-sm opacity-80 lg:block">
            {info.tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 text-xs opacity-80">
            <ArrowLeft className="size-4" />
            Ir al sitio de Oficios
          </Link>
        </aside>
        <main className="min-w-0 px-4 py-8 sm:px-8 sm:py-10">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{info.title}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{info.description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
