import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { users, type SelectUser } from "@db/schema";
import { db, pool } from "@db";
import { eq } from "drizzle-orm";

// Extend express-session types
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

async function hashPassword(password: string) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Error al procesar la contraseña');
  }
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!supplied || !stored) {
      console.error('Missing password data');
      return false;
    }

    console.log('Starting password comparison');
    console.log('Supplied password:', supplied);
    console.log('Stored hash:', stored);

    const isMatch = await bcrypt.compare(supplied, stored);
    console.log('Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Configuración de la sesión con PostgreSQL
  const store = new PostgresSessionStore({
    pool,
    createTableIfMissing: true,
    tableName: 'session'
  });

  // Middleware de sesión
  app.use(session({
    store,
    secret: process.env.REPL_ID || 'desarrollo-secreto',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to false for development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  // Rutas de autenticación
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log('Login attempt for username:', username);

      if (!username || !password) {
        console.log('Missing credentials');
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      }

      // Buscar usuario
      const [user] = await db.select().from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        console.log('User not found:', username);
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      console.log('User found:', { id: user.id, username: user.username, role: user.role });

      // Verificar contraseña
      const validPassword = await comparePasswords(password, user.password);

      if (!validPassword) {
        console.log('Invalid password for user:', username);
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      // Configurar sesión
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email
      };

      // Guardar sesión explícitamente
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          }
          console.log('Session saved successfully');
          resolve();
        });
      });

      console.log('Login successful. Session ID:', req.session.id);
      console.log('Session user data:', req.session.user);

      res.json(req.session.user);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post("/api/logout", (req, res) => {
    console.log('Logout attempt - Session:', req.session.id);

    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      console.log('Logout successful');
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('User session check - Session ID:', req.session.id);
    console.log('Session data:', req.session);

    if (!req.session.user) {
      console.log('No user session found');
      return res.sendStatus(401);
    }

    console.log('User session found:', req.session.user);
    res.json(req.session.user);
  });
}