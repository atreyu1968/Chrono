import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { locations, attendance, messages, users } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);
  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  // Users routes (admin only)
  app.get("/api/users", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  app.patch("/api/users/:id", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const [user] = await db
      .update(users)
      .set(req.body)
      .where(eq(users.id, parseInt(req.params.id)))
      .returning();
    res.json(user);
  });

  // Locations routes
  app.get("/api/locations", async (req, res) => {
    const allLocations = await db.select().from(locations);
    res.json(allLocations);
  });

  app.post("/api/locations", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const location = await db.insert(locations).values(req.body).returning();
    res.json(location[0]);
  });

  app.patch("/api/locations/:id", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const [location] = await db
      .update(locations)
      .set(req.body)
      .where(eq(locations.id, parseInt(req.params.id)))
      .returning();
    res.json(location);
  });

  app.delete("/api/locations/:id", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    await db
      .delete(locations)
      .where(eq(locations.id, parseInt(req.params.id)));
    res.sendStatus(200);
  });

  // Attendance routes
  app.post("/api/attendance/check-in", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { locationId, latitude, longitude } = req.body;
    const [location] = await db.select().from(locations).where(eq(locations.id, locationId));

    if (!location) {
      return res.status(404).json({ message: "Ubicación no encontrada" });
    }

    // Verificar si el usuario está dentro del radio
    const distance = calculateDistance(
      latitude,
      longitude,
      location.latitude,
      location.longitude
    );

    if (distance > location.radius) {
      return res.status(400).json({ message: "No estás dentro del rango permitido para fichar" });
    }

    const now = new Date();
    // TODO: Implementar lógica para determinar si es tarde basado en horarios configurados
    const status = "present"; 

    const checkIn = await db.insert(attendance).values({
      userId: req.user.id,
      locationId,
      checkInTime: now,
      status
    }).returning();

    res.json(checkIn[0]);
  });

  app.post("/api/attendance/check-out", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const [latestAttendance] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, req.user.id),
          eq(attendance.checkOutTime, null)
        )
      )
      .orderBy(attendance.checkInTime, "desc")
      .limit(1);

    if (!latestAttendance) {
      return res.status(400).json({ message: "No hay un registro de entrada abierto" });
    }

    const [updated] = await db
      .update(attendance)
      .set({ checkOutTime: new Date() })
      .where(eq(attendance.id, latestAttendance.id))
      .returning();

    res.json(updated);
  });

  app.get("/api/attendance/history", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { startDate, endDate } = req.query;

    const history = await db.select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, req.user.id),
          gte(attendance.checkInTime, new Date(startDate as string)),
          lte(attendance.checkInTime, new Date(endDate as string))
        )
      );

    res.json(history);
  });

  // Attendance stats (admin only)
  app.get("/api/attendance/stats", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await db.select()
      .from(attendance)
      .where(gte(attendance.checkInTime, today));

    // Get last 7 days trend
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const trend = await db.select({
      date: attendance.checkInTime,
      checkIns: attendance.id
    })
    .from(attendance)
    .where(gte(attendance.checkInTime, weekAgo))
    .orderBy(attendance.checkInTime);

    // Group by date for trend
    const trendByDate = trend.reduce((acc: any[], curr) => {
      const date = curr.date.toISOString().split('T')[0];
      const existing = acc.find(x => x.date === date);
      if (existing) {
        existing.checkIns++;
      } else {
        acc.push({ date, checkIns: 1 });
      }
      return acc;
    }, []);

    const stats = {
      today: todayAttendance.length,
      onTime: todayAttendance.filter(a => a.status === "present").length,
      late: todayAttendance.filter(a => a.status === "late").length,
      trend: trendByDate
    };

    res.json(stats);
  });

  // Messaging routes
  app.post("/api/messages", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const message = await db.insert(messages).values({
      ...req.body,
      fromUserId: req.user.id,
      sentAt: new Date()
    }).returning();
    res.json(message[0]);
  });

  app.get("/api/messages", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const userMessages = await db.select()
      .from(messages)
      .where(eq(messages.toUserId, req.user.id));
    res.json(userMessages);
  });

  return httpServer;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}