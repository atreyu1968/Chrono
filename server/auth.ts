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
  // Initialize session store
  const store = new PostgresSessionStore({ 
    pool,
    createTableIfMissing: true,
    tableName: 'session'
  });

  // Get domain configuration
  const isProduction = process.env.REPL_SLUG ? true : false;
  const domain = process.env.REPL_SLUG ? `.${process.env.REPL_SLUG}.repl.co` : undefined;

  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || 'development-secret',
    resave: false,
    saveUninitialized: false,
    store,
    proxy: true,
    name: 'sid',
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain
    }
  };

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
        const [user] = await getUserByUsername(username);

        if (!user) {
          return done(null, false, { message: "Credenciales inválidas" });
        }

        const isValidPassword = await comparePasswords(password, user.password);

        if (!isValidPassword) {
          return done(null, false, { message: "Credenciales inválidas" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
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
        return done(null, false);
      }

      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      if (!user) {
        return res.status(401).json({ error: info?.message || "Credenciales inválidas" });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Error al crear la sesión" });
        }

        res.json({
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }

      req.session.destroy((err) => {
        if (err) {
          return next(err);
        }

        res.clearCookie('sid');
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    res.json(req.user);
  });
}