import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClientSave, persistQueryClientRestore } from "@tanstack/query-persist-client-core";
import { get, set, del } from "idb-keyval";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { NotificationProvider } from "./components/NotificationStack";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos — dados ficam "frescos" sem refetch
      gcTime: 1000 * 60 * 30, // 30 minutos — cache mantido em memória
      refetchOnWindowFocus: true, // Atualiza ao voltar ao app
      refetchOnReconnect: true, // Atualiza ao reconectar internet
      retry: (failureCount, error) => {
        // Não retentar se offline
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
    },
  },
});

// ── Persistência do cache via IndexedDB ──────────────────────────────────────
const IDB_CACHE_KEY = "hubly-query-cache";
const MAX_AGE = 1000 * 60 * 60 * 24; // 24 horas

const idbPersister = {
  persistClient: async (client: any) => {
    try {
      await set(IDB_CACHE_KEY, client);
    } catch {}
  },
  restoreClient: async () => {
    try {
      return await get(IDB_CACHE_KEY);
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await del(IDB_CACHE_KEY);
    } catch {}
  },
};

// Restaurar cache do IndexedDB ao iniciar (cold start instantâneo)
(async () => {
  try {
    const persisted = await idbPersister.restoreClient();
    if (persisted) {
      await persistQueryClientRestore({
        queryClient,
        persister: {
          restoreClient: async () => persisted,
          persistClient: async () => {},
          removeClient: async () => {},
        },
        maxAge: MAX_AGE,
      });
    }
  } catch {}
})();

// Salvar cache no IndexedDB periodicamente e ao sair
const saveCache = () => {
  persistQueryClientSave({
    queryClient,
    persister: idbPersister,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // Só persistir queries com sucesso
        return query.state.status === "success";
      },
    },
  });
};

// Salvar a cada 30 segundos e ao sair
setInterval(saveCache, 30_000);
window.addEventListener("beforeunload", saveCache);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveCache();
});

// ── Error handling ───────────────────────────────────────────────────────────
const redirectToLoginIfUnauthorized = (error: unknown) => {
  // Não redirecionar automaticamente - o AdminLayout gerencia o estado de login
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  // Silenciar erros de autenticação - a UI mostrará a tela de login
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    // Suprimir erros de autenticação (10001) — a UI de login já trata isso
    if (error instanceof TRPCClientError && (error as any)?.data?.code === 'UNAUTHORIZED') return;
    if (error instanceof TRPCClientError && error.message?.includes('10001')) return;
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    // Suprimir erros de autenticação (10001) — a UI de login já trata isso
    if (error instanceof TRPCClientError && (error as any)?.data?.code === 'UNAUTHORIZED') return;
    if (error instanceof TRPCClientError && error.message?.includes('10001')) return;
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
