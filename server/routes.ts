import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { users, attendance, locations } from "@db/schema";
import { eq, and } from "drizzle-orm";
import fileUpload from "express-fileupload";

export function registerRoutes(app: Express): Server {
  // Setup auth routes and middleware
  setupAuth(app);

  // Setup file upload middleware
  app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
    abortOnLimit: true,
  }));

  // Basic health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    if (!req.user?.role === "admin") return res.sendStatus(403);
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  // Location routes
  app.get("/api/locations", async (_req, res) => {
    const allLocations = await db.select().from(locations);
    res.json(allLocations);
  });

  // Admin only routes
  app.post("/api/locations", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const location = await db.insert(locations).values(req.body).returning();
    res.json(location[0]);
  });

  // Attendance routes
  app.get("/api/attendance", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const records = await db
      .select()
      .from(attendance)
      .where(eq(attendance.userId, req.user.id));

    res.json(records);
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}