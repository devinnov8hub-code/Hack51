import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/app.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const host = req.headers.host ?? "localhost";
    const url = `https://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
    
    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString()));
        req.on("error", reject);
      });
    }

    const webRequest = new Request(url, {
      method: req.method ?? "GET",
      headers,
      body: body && body.length > 0 ? body : undefined,
    });

    const webResponse = await app.fetch(webRequest);

    res.statusCode = webResponse.status;
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await webResponse.arrayBuffer();
    res.end(Buffer.from(responseBody));

  } catch (err) {
    console.error("[vercel handler error]", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "error", message: "Internal server error" }));
    }
  }
}