import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/superadmin")({
  head: () => ({
    meta: [{ title: "Superadministración | Oficios" }, { name: "robots", content: "noindex" }],
  }),
  component: () => null,
});
