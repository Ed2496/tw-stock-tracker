import { createRouter, publicQuery } from "./middleware";
import { stockRouter, syncRouter } from "./stockRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  stock: stockRouter,
  sync: syncRouter,
});

export type AppRouter = typeof appRouter;
