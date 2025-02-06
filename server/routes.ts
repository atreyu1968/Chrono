import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { users, attendance, locations } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  app.get("/api/users/recent", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const recentUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.id))
      .limit(5);
    res.json(recentUsers);
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

  app.get("/api/attendance/recent", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    const recentAttendance = await db
      .select({
        id: attendance.id,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .orderBy(desc(attendance.checkInTime))
      .limit(10);

    res.json(recentAttendance);
  });

  app.get("/api/attendance/stats", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await db
      .select()
      .from(attendance)
      .where(sql`DATE(${attendance.checkInTime}) = CURRENT_DATE`);

    const onTimeCount = todayAttendance.filter(record => {
      const checkInHour = new Date(record.checkInTime).getHours();
      return checkInHour <= 9; // Assuming 9 AM is the cutoff for "on time"
    }).length;

    // Get attendance trend for the last 7 days
    const trend = await db
      .select({
        date: sql`DATE(${attendance.checkInTime})`,
        checkIns: sql`COUNT(*)`,
      })
      .from(attendance)
      .where(sql`${attendance.checkInTime} >= CURRENT_DATE - INTERVAL '7 days'`)
      .groupBy(sql`DATE(${attendance.checkInTime})`)
      .orderBy(sql`DATE(${attendance.checkInTime})`);

    res.json({
      today: todayAttendance.length,
      onTime: onTimeCount,
      late: todayAttendance.length - onTimeCount,
      trend,
    });
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}