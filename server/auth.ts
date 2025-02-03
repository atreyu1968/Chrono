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
  console.log('[Auth] Looking up user:', username);
  const result = await db.select().from(users)
    .where(eq(users.username, username))
    .limit(1);
  console.log('[Auth] User lookup result:', result[0] ? { 
    id: result[0].id, 
    username: result[0].username,
    role: result[0].role 
  } : 'Not found');
  return result;
}

export function setupAuth(app: Express) {
  console.log('[Auth] Setting up authentication...');

  // Initialize session store
  const store = new PostgresSessionStore({ 
    pool,
    createTableIfMissing: true,
    tableName: 'session'
  });

  // Get domain configuration
  const isProduction = app.get("env") === "production";
  const domain = process.env.REPL_SLUG ? `.${process.env.REPL_SLUG}.repl.co` : undefined;

  console.log('[Auth] Environment config:', {
    isProduction,
    domain,
    replSlug: process.env.REPL_SLUG
  });

  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || 'development-secret',
    resave: true,
    saveUninitialized: true,
    store,
    proxy: true, // Trust proxy
    name: 'sid',
    cookie: {
      secure: isProduction, // Only use secure in production
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
      domain: domain
    }
  };

  // Debug middleware for session
  app.use((req, res, next) => {
    console.log('[Auth] Request debug:', {
      url: req.url,
      method: req.method,
      cookies: req.cookies,
      sessionID: req.sessionID,
      session: req.session
    });
    next();
  });

  // Set trust proxy if in production
  if (isProduction) {
    app.set("trust proxy", 1);
  }

  // Initialize session middleware
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('[Auth] Login attempt:', username);
        const [user] = await getUserByUsername(username);

        if (!user) {
          console.log('[Auth] User not found:', username);
          return done(null, false, { message: "Credenciales inválidas" });
        }

        const isValidPassword = await comparePasswords(password, user.password);
        console.log('[Auth] Password validation:', { isValid: isValidPassword });

        if (!isValidPassword) {
          console.log('[Auth] Invalid password for user:', username);
          return done(null, false, { message: "Credenciales inválidas" });
        }

        console.log('[Auth] Successful authentication:', {
          id: user.id,
          username: user.username,
          role: user.role
        });

        return done(null, user);
      } catch (error) {
        console.error('[Auth] Authentication error:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log('[Auth] Serializing user:', { id: user.id, username: user.username });
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('[Auth] Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('[Auth] User not found during deserialization:', id);
        return done(null, false);
      }

      console.log('[Auth] Successfully deserialized user:', {
        id: user.id,
        username: user.username,
        role: user.role
      });

      done(null, user);
    } catch (error) {
      console.error('[Auth] Deserialization error:', error);
      done(error);
    }
  });

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    console.log('[Auth] Login request:', {
      username: req.body.username,
      session: req.sessionID,
      headers: req.headers
    });

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      if (!user) {
        console.log('[Auth] Login failed:', info?.message);
        return res.status(401).json({ error: info?.message || "Credenciales inválidas" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('[Auth] Session creation error:', err);
          return res.status(500).json({ error: "Error al crear la sesión" });
        }

        console.log('[Auth] Login successful:', {
          id: user.id,
          username: user.username,
          role: user.role,
          session: req.sessionID
        });

        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log('[Auth] Logout requested:', {
      userId,
      session: req.sessionID
    });

    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return next(err);
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('[Auth] Session destruction error:', err);
          return next(err);
        }

        res.clearCookie('sid');
        console.log('[Auth] Logout completed:', {
          userId,
          session: req.sessionID
        });

        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('[Auth] User info requested:', {
      authenticated: req.isAuthenticated(),
      session: req.sessionID,
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      } : null,
      headers: req.headers
    });

    if (!req.isAuthenticated()) {
      console.log('[Auth] Unauthorized access to /api/user');
      return res.sendStatus(401);
    }

    res.json(req.user);
  });

  console.log('[Auth] Authentication setup completed');
}