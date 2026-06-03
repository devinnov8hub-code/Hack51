import "dotenv/config";
import { validateEnv } from "./utils/env.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRouter } from "./routes/auth.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { employerRouter } from "./routes/employer.routes.js";
import { candidateRouter } from "./routes/candidate.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";
import { setupSwagger } from "./config/swagger.js";
import { uuidPathValidator } from "./middleware/uuid-validator.middleware.js";
import { AppError } from "./exceptions/AppError.js";
import { errorResponse } from "./types/api-response.js";
import { ZodError } from "zod";


validateEnv();

const app = new Hono();


const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://hack51.vercel.app",
  "https://hack51-main.vercel.app",
  "https://www.hack51.africa",
  "https://hack51.africa",
];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : DEFAULT_CORS_ORIGINS;

app.use("*", cors({
  origin: (origin) => {
    
    if (!origin) return origin;
    
    if (allowedOrigins.includes("*")) return "*";
    
    if (allowedOrigins.includes(origin)) return origin;
    
    return null;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 600,
}));


app.get("/",       (c) => c.json({ status: "success", message: "Hack51 API is running", data: { version: "1.0.0" }, error: null }));
app.get("/health", (c) => c.json({ status: "success", message: "OK", data: { uptime: process.uptime() }, error: null }));


setupSwagger(app);


app.use("*", uuidPathValidator);


app.route("/auth",      authRouter);
app.route("/admin",     adminRouter);
app.route("/employer",  employerRouter);
app.route("/candidate", candidateRouter);
app.route("/payments",  paymentRouter);


app.notFound((c) => c.json(
  { status: "error", message: "Route not found", data: null, error: { code: "NOT_FOUND" } },
  404
));


app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      errorResponse(err.message, err.errorCode),
      err.status as 400 | 401 | 403 | 404 | 409 | 422 | 500
    );
  }
  if (err instanceof ZodError) {
    const first = err.errors[0];
    return c.json(
      errorResponse(first?.message ?? "Validation error", "VALIDATION_ERROR", JSON.stringify(err.errors)),
      422
    );
  }
  console.error("[unhandled]", err);
  return c.json(errorResponse("An unexpected error occurred", "INTERNAL_ERROR"), 500);
});

export default app;