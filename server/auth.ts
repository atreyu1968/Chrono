import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db, pool } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const PostgresSessionStore = connectPg(session);

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePasswords(supplied: string, stored: string) {
  return bcrypt.compare(supplied, stored);
}

async function getUserByUsername(username: string) {
  const result = await db.select().from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result;
}

export function setupAuth(app: Express) {
  const store = new PostgresSessionStore({ 
    pool, 
    createTableIfMissing: true,
    tableName: 'session'
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID!,
    resave: false,
    saveUninitialized: false,
    store,
    name: 'sid',
    cookie: {
      secure: app.get("env") === "production",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    if (sessionSettings.cookie) {
      sessionSettings.cookie.secure = true;
    }
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Credenciales inválidas" });
        }

        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Credenciales inválidas" });
        }

        console.log('Usuario autenticado correctamente:', { id: user.id, username: user.username, role: user.role });
        return done(null, user);
      } catch (error) {
        console.error('Error en autenticación:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log('Serializando usuario:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('Usuario no encontrado en deserialización:', id);
        return done(null, false);
      }
      console.log('Usuario deserializado:', { id: user.id, username: user.username, role: user.role });
      done(null, user);
    } catch (error) {
      console.error('Error en deserialización:', error);
      done(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        console.log('Intento de login fallido:', info?.message);
        return res.status(401).json({ error: info?.message || "Credenciales inválidas" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error('Error en login session:', err);
          return res.status(500).json({ error: err.message });
        }
        console.log('Usuario autenticado:', { id: user.id, username: user.username, role: user.role });
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log('Logout solicitado para usuario:', userId);
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('sid');
        console.log('Logout completado para usuario:', userId);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('Sesión actual:', req.user);
    if (!req.isAuthenticated()) {
      console.log('Usuario no autenticado en /api/user');
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}