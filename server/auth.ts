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

  // Updated session configuration with more permissive settings for development
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || 'development-secret',
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to create session for all requests
    store,
    name: 'sid',
    cookie: {
      secure: false, // Set to false for development
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
      domain: process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.repl.co` : undefined
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

  // Updated LocalStrategy implementation
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await getUserByUsername(username);
        if (!user) {
          console.log('Authentication failed: User not found');
          return done(null, false, { message: "Credenciales inválidas" });
        }

        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          console.log('Authentication failed: Invalid password');
          return done(null, false, { message: "Credenciales inválidas" });
        }

        console.log('User authenticated successfully:', {
          id: user.id,
          username: user.username,
          role: user.role
        });
        return done(null, user);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
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
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }

      console.log('User deserialized:', {
        id: user.id,
        username: user.username,
        role: user.role
      });
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Updated login route with better error handling and logging
  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt for username:', req.body.username);

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      if (!user) {
        console.log('Login failed:', info?.message);
        return res.status(401).json({ error: info?.message || "Credenciales inválidas" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ error: "Error al crear la sesión" });
        }

        console.log('Login successful:', {
          id: user.id,
          username: user.username,
          role: user.role
        });
        res.json(user);
      });
    })(req, res, next);
  });

  // Updated logout route with better error handling
  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log('Logout requested for user:', userId);

    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return next(err);
        }

        res.clearCookie('sid');
        console.log('Logout completed for user:', userId);
        res.sendStatus(200);
      });
    });
  });

  // Updated user info route with better error handling
  app.get("/api/user", (req, res) => {
    console.log('User info requested. Authenticated:', req.isAuthenticated());
    console.log('Current session user:', req.user);

    if (!req.isAuthenticated()) {
      console.log('Unauthorized access attempt to /api/user');
      return res.sendStatus(401);
    }

    res.json(req.user);
  });
}