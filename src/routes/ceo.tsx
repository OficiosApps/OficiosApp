import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/ceo")({
  head: () => ({
    meta: [{ title: "Panel de CEO | Oficios" }, { name: "robots", content: "noindex" }],
  }),
  component: () => null,
});
