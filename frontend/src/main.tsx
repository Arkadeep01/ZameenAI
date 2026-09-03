import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* eslint-disable */
import "./index.css"; // eslint-disable-line

import { routeTree } from "./routeTree.gen";

// 1. Initialize the QueryClient
const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    {/* 2. Wrap the RouterProvider */}
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);