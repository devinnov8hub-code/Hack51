import app from "../src/app.js";

// Vercel serverless handler — Hono's fetch is Web Standard Request/Response
// No @hono/node-server needed here, Vercel handles the HTTP layer
export default app.fetch;
