import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Administración | Oficios" }, { name: "robots", content: "noindex" }],
  }),
  component: () => null,
});
