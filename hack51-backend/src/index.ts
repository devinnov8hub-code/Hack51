import { serve } from "@hono/node-server";
import { pingSupabase } from "./config/supabase.js";
import app from "./app.js";

const port = parseInt(process.env.PORT ?? "3000", 10);

serve({ fetch: app.fetch, port }, async () => {
  console.log(`\n🚀  Server:  http://localhost:${port}`);
  console.log(`📘  Swagger: http://localhost:${port}/docs`);
  console.log(`📄  OpenAPI: http://localhost:${port}/openapi.json\n`);
  try {
    await pingSupabase();
  } catch (err) {
    console.error((err as Error).message);
    console.error("⚠️  Database unreachable — check .env\n");
  }
});

export default app;
