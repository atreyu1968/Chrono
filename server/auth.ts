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
      fullName: string;
      email: string;
    }
  }
}

const PostgresSessionStore = connectPg(session);

export function setupAuth(app: Express) {
  // Configuración de sesión
  app.use(session({
    store: new PostgresSessionStore({
      pool,
      tableName: 'session'
    }),
    secret: process.env.REPL_ID || 'desarrollo-secreto',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get('env') === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  }));

  // Rutas de autenticación
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Validar campos requeridos
      if (!username || !password) {
        return res.status(400).json({ 
          error: 'Usuario y contraseña son requeridos' 
        });
      }

      // Buscar usuario
      const [user] = await db.select().from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({ 
          error: 'Usuario o contraseña incorrectos' 
        });
      }

      // Validar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Usuario o contraseña incorrectos' 
        });
      }

      // Guardar usuario en sesión
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email
      };

      // Devolver datos del usuario (sin contraseña)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error en logout:', err);
        return res.status(500).json({ 
          error: 'Error al cerrar sesión' 
        });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.session.user) {
      return res.sendStatus(401);
    }
    res.json(req.session.user);
  });

  // Middleware para rutas protegidas
  app.use('/api/*', (req, res, next) => {
    // Permitir rutas de autenticación
    if (req.path === '/api/login' || req.path === '/api/logout' || req.path === '/api/user') {
      return next();
    }

    // Verificar sesión
    if (!req.session.user) {
      return res.sendStatus(401);
    }
    next();
  });
}