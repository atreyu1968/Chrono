import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { locations, attendance, messages, users, userSettings, departments, userSchedules, holidays } from "@db/schema";
import { eq, and, gte, lte, isNull, or, desc } from "drizzle-orm";
import fileUpload from "express-fileupload";
import path from "path";
import { addMinutes, parseISO, format } from "date-fns";
import { es } from 'date-fns/locale';

export function registerRoutes(app: Express): Server {
  setupAuth(app);
  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  // Setup file upload middleware
  app.use(fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB max file size
    },
    abortOnLimit: true,
  }));

  // Profile update route with avatar upload
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      let updateData = req.body;
      let avatarUrl = req.user.avatar;

      // Handle file upload if present
      if (req.files && req.files.avatar) {
        const avatar = req.files.avatar;
        if (Array.isArray(avatar)) {
          return res.status(400).json({ message: "Solo se permite un archivo" });
        }

        // Validate file type
        if (!avatar.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: "Solo se permiten imágenes" });
        }

        const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
        const fileName = `avatar_${req.user.id}_${Date.now()}${path.extname(avatar.name)}`;
        const filePath = path.join(uploadDir, fileName);

        await avatar.mv(filePath);
        avatarUrl = `/uploads/avatars/${fileName}`;
      }

      // Parse form data if it's a multipart request
      if (typeof updateData === 'string') {
        updateData = JSON.parse(updateData);
      }

      // Update user profile
      const [updatedUser] = await db
        .update(users)
        .set({
          ...updateData,
          avatar: avatarUrl,
        })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Error al actualizar el perfil" });
    }
  });

  // Biometric registration routes
  app.get("/api/auth/biometric/register", async (req, res) => {
    console.log("[Biometric Register] Starting registration process");
    if (!req.user) {
      console.log("[Biometric Register] Error: No authenticated user");
      return res.status(401).json({ message: "No authenticated user" });
    }

    try {
      const rpID = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.repl.co` : "localhost";
      const origin = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.repl.co` : "http://localhost:3000";

      console.log("[Biometric Register] Using RPID:", rpID, "and origin:", origin);
      console.log("[Biometric Register] Generating registration options for user:", req.user.username);

      const options = await generateRegistrationOptions({
        rpName: "Chrono",
        rpID: rpID,
        userID: new Uint8Array([req.user.id]),
        userName: req.user.username,
        attestationType: "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "preferred",
        },
      });

      // Store challenge in session for verification
      req.session.challenge = options.challenge;
      console.log("[Biometric Register] Challenge stored in session");

      res.json(options);
    } catch (error) {
      console.error("[Biometric Register] Error generating options:", error);
      res.status(500).json({ message: "Error generating registration options" });
    }
  });

  app.post("/api/auth/biometric/verify-registration", async (req, res) => {
    console.log("[Biometric Verify] Starting verification process");
    if (!req.user) {
      console.log("[Biometric Verify] Error: No authenticated user");
      return res.status(401).json({ message: "No authenticated user" });
    }

    try {
      const expectedChallenge = req.session.challenge;
      console.log("[Biometric Verify] Challenge from session:", expectedChallenge ? "present" : "missing");
      if (!expectedChallenge) {
        return res.status(400).json({ message: "No challenge found" });
      }

      const rpID = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.repl.co` : "localhost";
      const origin = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.repl.co` : "http://localhost:3000";

      console.log("[Biometric Verify] Using RPID:", rpID, "and origin:", origin);
      console.log("[Biometric Verify] Verifying registration response");

      const verification = await verifyRegistrationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      console.log("[Biometric Verify] Verification result:", verification.verified);
      if (verification.verified && verification.registrationInfo) {
        const credentialPublicKey = verification.registrationInfo.credentialPublicKey;
        if (!credentialPublicKey) {
          console.log("[Biometric Verify] Error: No credential public key");
          return res.status(400).json({ message: "No credential public key" });
        }

        console.log("[Biometric Verify] Storing credential for user:", req.user.username);
        const base64Key = Buffer.from(credentialPublicKey).toString('base64');
        await db
          .update(users)
          .set({
            biometricToken: base64Key,
          })
          .where(eq(users.id, req.user.id));

        res.json({ verified: true });
      } else {
        console.log("[Biometric Verify] Verification failed");
        res.status(400).json({ message: "Verification failed" });
      }
    } catch (error) {
      console.error("[Biometric Verify] Registration verification error:", error);
      res.status(400).json({ message: "Registration failed", error: error.message });
    }
  });

  // También actualizar las rutas de autenticación
  app.get("/api/auth/biometric/challenge", async (req, res) => {
    if (!req.user?.biometricToken) {
      return res.status(400).json({ message: "No biometric token registered" });
    }

    const rpID = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.repl.co` : "localhost";

    const options = await generateAuthenticationOptions({
      allowCredentials: [{
        id: Buffer.from(req.user.biometricToken, 'base64'),
        type: 'public-key',
      }],
      userVerification: "preferred",
      rpID: rpID,
    });

    // Store challenge in session for verification
    req.session.challenge = options.challenge;

    res.json(options);
  });

  app.post("/api/auth/biometric/verify", async (req, res) => {
    try {
      const expectedChallenge = req.session.challenge;
      if (!expectedChallenge) {
        return res.status(400).json({ message: "No challenge found" });
      }

      const rpID = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.repl.co` : "localhost";
      const origin = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.repl.co` : "http://localhost:3000";

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.biometricToken, req.body.id))
        .limit(1);

      if (!user) {
        return res.status(400).json({ message: "Invalid credential" });
      }

      const verification = await verifyAuthenticationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialPublicKey: Buffer.from(user.biometricToken, 'base64'),
          credentialID: Buffer.from(req.body.id, 'base64'),
          counter: 0,
        },
      });

      if (verification.verified) {
        // Log the user in
        await new Promise((resolve, reject) => {
          req.login(user, (err) => {
            if (err) reject(err);
            else resolve(user);
          });
        });

        res.json(user);
      } else {
        res.status(400).json({ message: "Verification failed" });
      }
    } catch (error) {
      console.error("Biometric verification error:", error);
      res.status(400).json({ message: "Verification failed" });
    }
  });

  // Users routes (admin only)
  app.get("/api/users", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    // Si es admin, devolver toda la información
    if (req.user.role === "admin") {
      const allUsers = await db.select().from(users);
      return res.json(allUsers);
    }

    // Para usuarios regulares, devolver solo información básica
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
        department: users.department,
      })
      .from(users);

    res.json(allUsers);
  });

  // Ruta para obtener un usuario específico
  app.get("/api/users/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Error al obtener el usuario" });
    }
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

  // User Schedules routes
  app.get("/api/user/schedules", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const schedules = await db
        .select()
        .from(userSchedules)
        .where(eq(userSchedules.userId, req.user.id))
        .orderBy(userSchedules.weekday);

      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Error al obtener los horarios" });
    }
  });

  app.post("/api/user/schedules", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      console.log("[Schedules] Starting schedule update for user:", req.user.id);
      console.log("[Schedules] Received schedules:", req.body.schedules);

      // Eliminar horarios existentes
      await db
        .delete(userSchedules)
        .where(eq(userSchedules.userId, req.user.id));

      // Insertar nuevos horarios
      const { schedules } = req.body;

      if (!Array.isArray(schedules)) {
        console.log("[Schedules] Error: schedules is not an array");
        return res.status(400).json({
          message: "El formato de los horarios es inválido"
        });
      }

      console.log("[Schedules] Processing schedules:", schedules);

      const insertedSchedules = await db
        .insert(userSchedules)
        .values(
          schedules.map((schedule: any) => ({
            userId: req.user!.id,
            weekday: parseInt(schedule.weekday),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            enabled: schedule.enabled ?? true
          }))
        )
        .returning();

      console.log("[Schedules] Successfully inserted schedules:", insertedSchedules);
      res.json(insertedSchedules);
    } catch (error) {
      console.error("[Schedules] Error updating schedules:", error);
      res.status(500).json({
        message: "Error al actualizar los horarios",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.get("/api/admin/user/:userId/schedules", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    try {
      const schedules = await db
        .select()
        .from(userSchedules)
        .where(eq(userSchedules.userId, parseInt(req.params.userId)))
        .orderBy(userSchedules.weekday);

      res.json(schedules);
    } catch (error) {
      console.error("Error fetching user schedules:", error);
      res.status(500).json({ message: "Error al obtener los horarios" });
    }
  });

  app.post("/api/admin/user/:userId/schedules", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    try {
      // Eliminar horarios existentes
      await db
        .delete(userSchedules)
        .where(eq(userSchedules.userId, parseInt(req.params.userId)));

      // Insertar nuevos horarios
      const { schedules } = req.body;
      const insertedSchedules = await db
        .insert(userSchedules)
        .values(
          schedules.map((schedule: any) => ({
            userId: parseInt(req.params.userId),
            weekday: parseInt(schedule.weekday),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            enabled: schedule.enabled
          }))
        )
        .returning();

      res.json(insertedSchedules);
    } catch (error) {
      console.error("Error updating user schedules:", error);
      res.status(500).json({ message: "Error al actualizar los horarios" });
    }
  });

  // Attendance routes
  app.post("/api/attendance/check-in", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { locationId, latitude, longitude } = req.body;
    const today = new Date();

    try {
      console.log("[Check-in] Starting check-in process for user:", req.user.id);

      // 1. Verificar si es un día festivo
      const holiday = await db.query.holidays.findFirst({
        where: eq(holidays.date, today),
        columns: {
          id: true,
          name: true,
          type: true,
          date: true
        }
      });

      if (holiday) {
        console.log("[Check-in] Holiday found:", holiday.name);
        return res.status(400).json({
          message: `Hoy es festivo: ${holiday.name} (${holiday.type})`,
          holiday: {
            name: holiday.name,
            type: holiday.type,
            date: holiday.date
          }
        });
      }

      // 2. Verificar horario
      const weekday = today.getDay();
      const schedule = await db.query.userSchedules.findFirst({
        where: and(
          eq(userSchedules.userId, req.user.id),
          eq(userSchedules.weekday, weekday)
        )
      });

      if (!schedule) {
        console.log("[Check-in] No schedule found for user:", req.user.id);
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return res.status(400).json({
          message: `No tienes un horario configurado para los ${dias[weekday]}`,
          type: "no_schedule"
        });
      }

      if (!schedule.enabled) {
        console.log("[Check-in] Schedule disabled for user:", req.user.id);
        return res.status(400).json({
          message: `El horario para los ${dias[weekday]} está deshabilitado`,
          type: "schedule_disabled"
        });
      }

      // 3. Verificar ubicación
      const location = await db.query.locations.findFirst({
        where: eq(locations.id, locationId)
      });

      if (!location) {
        console.log("[Check-in] Location not found:", locationId);
        return res.status(404).json({ message: "Ubicación no encontrada" });
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude
      );

      if (distance > location.radius) {
        console.log("[Check-in] User too far from location. Distance:", distance, "Radius:", location.radius);
        return res.status(400).json({
          message: `No estás dentro del rango permitido para fichar (${Math.round(distance)}m del centro, máximo ${location.radius}m)`,
          distance,
          maxRadius: location.radius
        });
      }

       // 4. Verificar si ya existe un registro para hoy si la configuración está activa
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, req.user.id)
      });

      if (settings?.singleCheckInPerDay) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingRecord = await db.query.attendance.findFirst({
          where: and(
            eq(attendance.userId, req.user.id),
            gte(attendance.checkInTime, today)
          )
        });

        if (existingRecord) {
          console.log("[Check-in] User already has a record for today");
          return res.status(400).json({ 
            message: "Ya tienes un registro de asistencia para hoy. Solo se permite un registro por día según la configuración actual.",
            type: "single_check_in_limit"
          });
        }
      }

      // 5. Determinar estado
      const now = new Date();
      const scheduleStart = parseISO(`${format(today, 'yyyy-MM-dd')}T${schedule.startTime}`);
      const status = now > addMinutes(scheduleStart, 5) ? "late" : "present";

      // 6. Registrar asistencia
      console.log("[Check-in] Inserting attendance record");
      const [checkIn] = await db
        .insert(attendance)
        .values({
          userId: req.user.id,
          locationId: locationId,
          checkInTime: now,
          status: status,
        })
        .returning();

      console.log("[Check-in] Successfully created attendance record:", checkIn.id);

      // 7. Preparar respuesta
      const response = {
        ...checkIn,
        schedule: {
          startTime: schedule.startTime,
          endTime: schedule.endTime
        },
        location: {
          name: location.name,
          distance: Math.round(distance)
        },
        status
      };

      res.json(response);
    } catch (error) {
      console.error("[Check-in] Error during check-in:", error);
      res.status(500).json({
        message: "Error al registrar la entrada",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/attendance/check-out", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const [latestAttendance] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, req.user.id),
          isNull(attendance.checkOutTime)
        )
      )
      .orderBy(attendance.checkInTime as any, "desc")
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

  // Rutas de asistencia para usuarios específicos (admin y el propio usuario)
    app.get("/api/attendance/user", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { userId } = req.query;

    try {
      // Validar que userId sea un número válido
      const userIdNumber = userId ? parseInt(userId as string) : req.user.id;
      if (isNaN(userIdNumber)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }

      // Verificar permisos - solo admin o el propio usuario pueden ver los registros
      if (req.user.role !== "admin" && userIdNumber !== req.user.id) {
        return res.sendStatus(403);
      }

      // Consulta directa con joins
      const records = await db
        .select({
          id: attendance.id,
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
          status: attendance.status,
          location: {
            id: locations.id,
            name: locations.name,
          }
        })
        .from(attendance)
        .leftJoin(locations, eq(attendance.locationId, locations.id))
        .where(eq(attendance.userId, userIdNumber))
        .orderBy(desc(attendance.checkInTime));

      console.log("[Backend] Found records:", records.length);
      res.json(records);
    } catch (error) {
      console.error("[Backend] Error:", error);
      res.status(500).json({ message: "Error al obtener el historial de asistencia" });
    }
  });

  // También actualizar la ruta de historial para incluir más detalles
  app.get("/api/attendance/history", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { startDate, endDate } = req.query;

    try {
      let start, end;

      if (startDate && endDate) {
        start = new Date(startDate.toString());
        end = new Date(endDate.toString());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        start = startOfMonth(new Date());
        end = endOfMonth(new Date());
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Fechas inválidas" });
      }

      // Obtener registros con información detallada
      const history = await db.query.attendance.findMany({
        where: and(
          eq(attendance.userId, req.user.id),
          gte(attendance.checkInTime, start),
          lte(attendance.checkInTime, end)
        ),
        with: {
          location: true
        },
        orderBy: [desc(attendance.checkInTime)]
      });

      // Enriquecer la respuesta con información adicional
      const enrichedHistory = await Promise.all(
        history.map(async (record) => {
          const recordDate = new Date(record.checkInTime);
          const weekday = recordDate.getDay();

          // Obtener el horario para ese día
          const [schedule] = await db
            .select()
            .from(userSchedules)
            .where(
              and(
                eq(userSchedules.userId, req.user.id),
                eq(userSchedules.weekday, weekday)
              )
            );

          // Verificar si era festivo
          const [holiday] = await db
            .select({
              id: holidays.id,
              name: holidays.name,
              type: holidays.type,
              date: holidays.date
            })
            .from(holidays)
            .where(eq(holidays.date, recordDate));

          return {
            ...record,
            date: format(recordDate, 'yyyy-MM-dd'),
            weekday: format(recordDate, 'EEEE', { locale: es }),
            schedule: schedule ? {
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              enabled: schedule.enabled
            } : null,
            holiday: holiday ? {
              name: holiday.name,
              type: holiday.type,
              date: holiday.date
            } : null,
            checkInFormatted: format(new Date(record.checkInTime), 'HH:mm'),
            checkOutFormatted: record.checkOutTime
              ? format(new Date(record.checkOutTime), 'HH:mm')
              : null
          };
        })
      );

      res.json(enrichedHistory);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      res.status(500).json({ message: "Error al obtener el historial de asistencia" });
    }
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
    const message = await db.insert(messages).values({      ...req.body,      fromUserId: req.user.id,
      sentAt: new Date()
    }).returning();
    res.json(message[0]);
  });

  app.get("/api/messages", async (req, res) => {
if (!req.user) return res.sendStatus(401);

    const userMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        sentAt: messages.sentAt,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        fromUser: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(messages)
      .where(
        or(
          eq(messages.toUserId, req.user.id),
          eq(messages.fromUserId, req.user.id)
        )
      )
      .leftJoin(users, eq(messages.fromUserId,users.id))
      .orderBy(messages.sentAt);

    res.json(userMessages);
  });

  // User Settings routes
  app.get("/api/user/settings", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, req.user.id))
      .limit(1);

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        theme: "blue",
        appearance: "light",
        animationsEnabled: true,
        animationSpeed: 1,
        sidebarCollapsed: false,
        compactMode: false,
      });
    }

    res.json(settings);
  });

  app.patch("/api/user/settings", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    // Solo permitir que los administradores modifiquen singleCheckInPerDay
    const updateData = { ...req.body };
    if ('singleCheckInPerDay' in updateData && req.user.role !== 'admin') {
      delete updateData.singleCheckInPerDay;
    }

    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, req.user.id))
      .limit(1);

    let updatedSettings;
    if (existingSettings) {
      [updatedSettings] = await db.update(userSettings)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, req.user.id))
        .returning();
    } else {
      [updatedSettings] = await db
        .insert(userSettings)
        .values({
          userId: req.user.id,
          ...updateData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    res.json(updatedSettings);
  });

  // Department routes
  app.get("/api/departments", async (req, res) => {
    try {
      const allDepartments = await db.select().from(departments);
      res.json(allDepartments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Error al obtener los departamentos" });
    }
  });

  app.post("/api/departments", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    try {
      const [department] = await db.insert(departments)
        .values({
          name: req.body.name,
          description: req.body.description,
          updatedAt: new Date()
        })
        .returning();

      res.json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Error al crear el departamento" });
    }
  });

  app.patch("/api/departments/:id", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    try {
      const [department] = await db
        .update(departments)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(departments.id, parseInt(req.params.id)))
        .returning();

      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(500).json({ message: "Error al actualizar el departamento" });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    try {
      await db
        .delete(departments)
        .where(eq(departments.id, parseInt(req.params.id)));

      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ message: "Error al eliminar el departamento" });
    }
  });

  // Holiday routes (admin only)
  app.get("/api/holidays", async (req, res) => {
    try {
      const allHolidays = await db.select({
        id: holidays.id,
        name: holidays.name,
        date: holidays.date,
        type: holidays.type,
        createdAt: holidays.createdAt,
      })
      .from(holidays)
      .orderBy(holidays.date);

      res.json(allHolidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ message: "Error al obtener los días festivos" });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    try {
      const [holiday] = await db
        .insert(holidays)
        .values({
          ...req.body,
          createdById: req.user.id,
          updatedAt: new Date()
        })
        .returning();

      res.json(holiday);
    } catch (error) {
      console.error("Error creating holiday:", error);
      res.status(500).json({ message: "Error al crear el día festivo" });
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    if (req.user?.role !== "admin") return res.sendStatus(403);

    try {
      await db
        .delete(holidays)
        .where(eq(holidays.id, parseInt(req.params.id)));

      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting holiday:", error);
      res.status(500).json({ message: "Error al eliminar el día festivo" });
    }
  });

  // Ruta para registro manual de asistencia (usuarios y admin)
  app.post("/api/attendance/manual", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const { 
        userId, 
        checkInTime, 
        checkOutTime, 
        locationId, 
        incidenceType,
        incidenceDescription 
      } = req.body;

      // Si es un usuario normal, solo puede registrar sus propias asistencias
      if (req.user.role !== "admin" && userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Solo puedes registrar tus propias asistencias" 
        });
      }

      console.log("[Manual Check] Starting manual attendance registration", {
        userId,
        checkInTime,
        checkOutTime,
        locationId,
        isAdmin: req.user.role === "admin"
      });

      // Validar que el usuario existe
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Validar que la ubicación existe
      const location = await db.query.locations.findFirst({
        where: eq(locations.id, locationId)
      });

      if (!location) {
        return res.status(404).json({ message: "Ubicación no encontrada" });
      }

      // Validar que no haya solapamiento con otros registros
      const checkInDate = new Date(checkInTime);
      const checkOutDate = checkOutTime ? new Date(checkOutTime) : null;

      const overlapping = await db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, userId),
          or(
            and(
              lte(attendance.checkInTime, checkInDate),
              isNull(attendance.checkOutTime)
            ),
            and(
              lte(attendance.checkInTime, checkInDate),
              gte(attendance.checkOutTime, checkInDate)
            ),
            checkOutDate ? and(
              lte(attendance.checkInTime, checkOutDate),
              gte(attendance.checkOutTime, checkOutDate)
            ) : undefined
          )
        )
      });

      if (overlapping) {
        return res.status(400).json({
          message: "Ya existe un registro que se solapa con el período especificado"
        });
      }

      // Determinar si es aprobado automáticamente (solo para admin)
      const isApproved = req.user.role === "admin";

      // Registrar la asistencia manual
      const [record] = await db
        .insert(attendance)
        .values({
          userId,
          locationId,
          checkInTime: checkInDate,
          checkOutTime: checkOutDate,
          status: "present", // Por defecto presente, el admin puede cambiar después
          isManualEntry: true,
          incidenceType: req.user.role !== "admin" ? incidenceType : null,
          incidenceDescription: req.user.role !== "admin" ? incidenceDescription : null,
          approvedById: isApproved ? req.user.id : null,
          approvedAt: isApproved ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log("[Manual Check] Successfully created manual attendance record:", record.id);

      // Preparar mensaje de respuesta según el rol
      const message = req.user.role === "admin" 
        ? "Registro manual creado correctamente"
        : "Registro manual creado correctamente. Pendiente de aprobación por un administrador";

      res.json({
        record,
        message,
        requiresApproval: !isApproved
      });

    } catch (error) {
      console.error("[Manual Check] Error creating manual attendance:", error);
      res.status(500).json({
        message: "Error al registrar la asistencia manual",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Nueva ruta para aprobar/rechazar incidencias (solo admin)
  app.patch("/api/attendance/:id/approve", async (req, res) => {
    if (!req.user || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const { approved } = req.body;
      const attendanceId = parseInt(req.params.id);

      const [record] = await db
        .update(attendance)
        .set({
          approvedById: approved ? req.user.id : null,
          approvedAt: approved ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(attendance.id, attendanceId))
        .returning();

      if (!record) {
        return res.status(404).json({ message: "Registro no encontrado" });
      }

      res.json({
        record,
        message: approved 
          ? "Incidencia aprobada correctamente" 
          : "Incidencia rechazada"
      });

    } catch (error) {
      console.error("[Approve] Error updating attendance record:", error);
      res.status(500).json({
        message: "Error al actualizar el registro",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
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

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}