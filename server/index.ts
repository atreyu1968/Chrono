import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);

      // Log request details for debugging
      if (process.env.NODE_ENV === "development") {
        log(`Request body: ${JSON.stringify(req.body)}`);
        log(`Request headers: ${JSON.stringify(req.headers)}`);
      }
    }
  });
  next();
});

// Error handling middleware mejorado
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const stack = process.env.NODE_ENV === "development" ? err.stack : undefined;

  log(`Error ${status}: ${message}`);
  if (stack) log(`Stack: ${stack}`);

  res.status(status).json({ 
    error: message,
    ...(stack && { stack })
  });
});

// Setup auth before routes
setupAuth(app);

(async () => {
  const server = registerRoutes(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
    log(`Environment: ${app.get("env")}`);
    log(`Database URL: ${process.env.DATABASE_URL ? "configured" : "missing"}`);
  });
})().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});