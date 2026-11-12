import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/equipo")({
  head: () => ({ meta: [{ title: "Equipo | Oficios" }, { name: "robots", content: "noindex" }] }),
  component: () => null,
});
