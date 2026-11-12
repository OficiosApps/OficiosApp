import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Match URLs with or without a trailing slash without redirecting; the
    // build-time prerenderer requests every page with a trailing slash.
    trailingSlash: "preserve",
  });

  return router;
};
