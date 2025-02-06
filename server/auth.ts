import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { users } from "@db/schema";
import { db, pool } from "@db";
import { eq } from "drizzle-orm";

declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      username: string;
      role: string;
      fullName: string | null;
      email: string | null;
    }
  }
}

const PostgresSessionStore = connectPg(session);

export function setupAuth(app: Express) {
  // Middleware de sesión
  app.use(session({
    store: new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session'
    }),
    secret: process.env.REPL_ID || 'desarrollo-secreto',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    },
    name: 'chrono.sid'
  }));

  // Rutas de autenticación
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log('Intento de inicio de sesión para:', username);

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      }

      const [user] = await db.select().from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      console.log('Usuario encontrado:', { id: user.id, username: user.username, role: user.role });

      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Resultado de la comparación de contraseñas:', isValidPassword);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email
      };

      req.session.save((err) => {
        if (err) {
          console.error('Error al guardar la sesión:', err);
          return res.status(500).json({ error: 'Error al iniciar sesión' });
        }

        console.log('Sesión guardada exitosamente:', {
          sessionID: req.session.id,
          userData: req.session.user
        });

        res.json(req.session.user);
      });
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('Verificación de sesión de usuario:', {
      sessionID: req.session.id,
      sessionData: req.session
    });

    if (!req.session.user) {
      return res.sendStatus(401);
    }

    res.json(req.session.user);
  });
}