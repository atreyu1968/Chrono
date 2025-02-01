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

  // Lista de usuarios (solo para administradores)
  app.get("/api/users", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  // Gestión de ubicaciones
  app.get("/api/locations", async (req, res) => {
    const allLocations = await db.select().from(locations);
    res.json(allLocations);
  });

  app.post("/api/locations", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const location = await db.insert(locations).values(req.body).returning();
    res.json(location[0]);
  });

  // Gestión de asistencia
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

    const checkIn = await db.insert(attendance).values({
      userId: req.user.id,
      locationId,
      checkInTime: new Date(),
      status: "present"
    }).returning();

    res.json(checkIn[0]);
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

  // Estadísticas de asistencia (solo para administradores)
  app.get("/api/attendance/stats", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await db.select()
      .from(attendance)
      .where(gte(attendance.checkInTime, today));

    const stats = {
      today: todayAttendance.length,
      onTime: todayAttendance.filter(a => a.status === "present").length,
      late: todayAttendance.filter(a => a.status === "late").length,
      trend: [] // TODO: Implementar tendencia
    };

    res.json(stats);
  });

  // Mensajería
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