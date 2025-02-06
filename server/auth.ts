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

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(supplied: string, stored: string) {
  return bcrypt.compare(supplied, stored);
}

async function getUserByUsername(username: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
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
          console.log('Login failed: User not found -', username);
          return done(null, false, { message: "Credenciales inválidas" });
        }

        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          console.log('Login failed: Invalid password -', username);
          return done(null, false, { message: "Credenciales inválidas" });
        }

        console.log('User authenticated successfully:', { id: user.id, username: user.username, role: user.role });
        return done(null, user);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', { id: user.id, role: user.role });
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('User not found in deserialization:', id);
        return done(null, false);
      }

      console.log('User deserialized successfully:', { id: user.id, username: user.username, role: user.role });
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        console.log('Login attempt failed:', info?.message);
        return res.status(401).json({ error: info?.message || "Credenciales inválidas" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error('Login session error:', err);
          return res.status(500).json({ error: err.message });
        }
        // Include role in the response
        const userResponse = {
          id: user.id,
          username: user.username,
          role: user.role,
          employeeType: user.employeeType,
          fullName: user.fullName,
          email: user.email
        };
        console.log('User logged in:', userResponse);
        res.json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log('Logout requested for user:', userId);
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('sid');
        console.log('Logout completed for user:', userId);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('Current session user:', req.user);
    if (!req.isAuthenticated()) {
      console.log('User not authenticated in /api/user');
      return res.sendStatus(401);
    }

    const user = req.user;
    const userResponse = {
      id: user.id,
      username: user.username,
      role: user.role,
      employeeType: user.employeeType,
      fullName: user.fullName,
      email: user.email
    };
    res.json(userResponse);
  });
}