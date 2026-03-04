import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { db } from "@db";
import { users, attendance, locations, userSettings, departments, messages } from "@db/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/users", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const allUsers = await db.select().from(users);
    res.json(allUsers.map((u: any) => { const { password: _, ...rest } = u; return rest; }));
  });

  app.get("/api/users/recent", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    const recentUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.id))
      .limit(5);
    res.json(recentUsers.map((u: any) => { const { password: _, ...rest } = u; return rest; }));
  });

  app.post("/api/users", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    try {
      const { password, ...userData } = req.body;
      const hashedPassword = await hashPassword(password || "password123");
      const [newUser] = await db.insert(users).values({
        ...userData,
        password: hashedPassword,
      }).returning();
      const { password: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(400).json({ error: error.message || "Error al crear usuario" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    try {
      const userId = parseInt(req.params.id);
      const { password, ...userData } = req.body;
      const updateData: any = { ...userData };
      if (password) {
        updateData.password = await hashPassword(password);
      }
      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      if (!updated) return res.sendStatus(404);
      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: error.message || "Error al actualizar usuario" });
    }
  });

  app.get("/api/locations", async (_req, res) => {
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
    try {
      const locationId = parseInt(req.params.id);
      const [updated] = await db
        .update(locations)
        .set(req.body)
        .where(eq(locations.id, locationId))
        .returning();
      if (!updated) return res.sendStatus(404);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Error al actualizar ubicación" });
    }
  });

  app.delete("/api/locations/:id", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    try {
      const locationId = parseInt(req.params.id);
      await db.delete(locations).where(eq(locations.id, locationId));
      res.sendStatus(200);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Error al eliminar ubicación" });
    }
  });

  app.get("/api/user/settings", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      let [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, req.user.id))
        .limit(1);

      if (!settings) {
        [settings] = await db
          .insert(userSettings)
          .values({ userId: req.user.id })
          .returning();
      }

      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Error al obtener configuración" });
    }
  });

  app.patch("/api/user/settings", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      let [existing] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, req.user.id))
        .limit(1);

      if (!existing) {
        [existing] = await db
          .insert(userSettings)
          .values({ userId: req.user.id, ...req.body })
          .returning();
      } else {
        [existing] = await db
          .update(userSettings)
          .set(req.body)
          .where(eq(userSettings.userId, req.user.id))
          .returning();
      }

      res.json(existing);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Error al actualizar configuración" });
    }
  });

  app.patch("/api/user/profile", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const { currentPassword, newPassword, confirmPassword, ...profileData } = req.body;

      const updateData: any = {};
      if (profileData.fullName) updateData.fullName = profileData.fullName;
      if (profileData.email) updateData.email = profileData.email;
      if (profileData.phone !== undefined) updateData.phone = profileData.phone;

      if (newPassword && currentPassword) {
        const { comparePasswords } = await import("./auth");
        const isValid = await comparePasswords(currentPassword, req.user.password);
        if (!isValid) {
          return res.status(400).json({ error: "La contraseña actual es incorrecta" });
        }
        updateData.password = await hashPassword(newPassword);
      }

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, req.user.id))
        .returning();

      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(400).json({ error: error.message || "Error al actualizar perfil" });
    }
  });

  app.get("/api/attendance", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const records = await db
      .select()
      .from(attendance)
      .where(eq(attendance.userId, req.user.id))
      .orderBy(desc(attendance.checkInTime));
    res.json(records);
  });

  app.get("/api/attendance/history", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const { startDate, endDate } = req.query;
      let conditions = [eq(attendance.userId, req.user.id)];

      if (startDate) {
        conditions.push(sql`DATE(${attendance.checkInTime}) >= ${startDate}`);
      }
      if (endDate) {
        conditions.push(sql`DATE(${attendance.checkInTime}) <= ${endDate}`);
      }

      const records = await db
        .select({
          id: attendance.id,
          userId: attendance.userId,
          locationId: attendance.locationId,
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
          isManualEntry: attendance.isManualEntry,
          location: {
            id: locations.id,
            name: locations.name,
            address: locations.address,
            latitude: locations.latitude,
            longitude: locations.longitude,
            radius: locations.radius,
          },
        })
        .from(attendance)
        .leftJoin(locations, eq(attendance.locationId, locations.id))
        .where(and(...conditions))
        .orderBy(desc(attendance.checkInTime));

      res.json(records);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      res.status(500).json({ error: "Error al obtener historial" });
    }
  });

  app.post("/api/attendance/check-in", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const { locationId, latitude, longitude } = req.body;

      if (locationId) {
        const [loc] = await db
          .select()
          .from(locations)
          .where(eq(locations.id, locationId))
          .limit(1);

        if (loc && latitude !== undefined && longitude !== undefined) {
          const distance = getDistanceFromLatLonInMeters(
            latitude, longitude, loc.latitude, loc.longitude
          );
          if (distance > loc.radius) {
            return res.status(400).json({
              error: `Estás demasiado lejos del centro de trabajo (${Math.round(distance)}m). Radio permitido: ${loc.radius}m`
            });
          }
        }
      }

      const [record] = await db
        .insert(attendance)
        .values({
          userId: req.user.id,
          locationId: locationId || null,
          checkInTime: new Date(),
        })
        .returning();

      res.json(record);
    } catch (error: any) {
      console.error("Error checking in:", error);
      res.status(400).json({ error: error.message || "Error al fichar entrada" });
    }
  });

  app.post("/api/attendance/check-out", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const [openRecord] = await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.userId, req.user.id),
            sql`${attendance.checkOutTime} IS NULL`
          )
        )
        .orderBy(desc(attendance.checkInTime))
        .limit(1);

      if (!openRecord) {
        return res.status(400).json({ error: "No hay fichaje de entrada abierto" });
      }

      const [updated] = await db
        .update(attendance)
        .set({ checkOutTime: new Date() })
        .where(eq(attendance.id, openRecord.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("Error checking out:", error);
      res.status(400).json({ error: error.message || "Error al fichar salida" });
    }
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

    const todayAttendance = await db
      .select()
      .from(attendance)
      .where(sql`DATE(${attendance.checkInTime}) = CURRENT_DATE`);

    const onTimeCount = todayAttendance.filter((record: any) => {
      const checkInHour = new Date(record.checkInTime).getHours();
      return checkInHour <= 9;
    }).length;

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

  app.get("/api/departments", async (_req, res) => {
    const allDepartments = await db.select().from(departments);
    res.json(allDepartments);
  });

  app.post("/api/departments", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);
    try {
      const [dept] = await db.insert(departments).values(req.body).returning();
      res.json(dept);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Error al crear departamento" });
    }
  });

  app.get("/api/messages", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const userMessages = await db
        .select({
          id: messages.id,
          content: messages.content,
          sentAt: messages.sentAt,
          fromUserId: messages.fromUserId,
          toUserId: messages.toUserId,
          read: messages.read,
          fromUser: {
            id: users.id,
            fullName: users.fullName,
            email: users.email,
          },
        })
        .from(messages)
        .innerJoin(users, eq(messages.fromUserId, users.id))
        .where(
          or(
            eq(messages.toUserId, req.user.id),
            eq(messages.fromUserId, req.user.id)
          )
        )
        .orderBy(desc(messages.sentAt));

      res.json(userMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Error al obtener mensajes" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const [message] = await db
        .insert(messages)
        .values({
          fromUserId: req.user.id,
          toUserId: req.body.toUserId,
          content: req.body.content,
        })
        .returning();
      res.json(message);
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(400).json({ error: error.message || "Error al enviar mensaje" });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const messageId = parseInt(req.params.id);
      const [updated] = await db
        .update(messages)
        .set({ read: true })
        .where(
          and(
            eq(messages.id, messageId),
            eq(messages.toUserId, req.user.id)
          )
        )
        .returning();
      if (!updated) return res.sendStatus(404);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Error al marcar mensaje como leído" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getDistanceFromLatLonInMeters(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
