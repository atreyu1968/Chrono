import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { users, type SelectUser } from "@db/schema";
import { db, pool } from "@db";
import { eq } from "drizzle-orm";

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

export function setupAuth(app: Express) {
  const store = new PostgresSessionStore({ 
    pool, 
    createTableIfMissing: true,
    tableName: 'session'
  });

  app.use(session({
    secret: process.env.REPL_ID!,
    resave: false,
    saveUninitialized: false,
    store,
    name: 'sid',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: app.get("env") === "production",
      sameSite: "lax"
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      console.log('Login attempt for user:', username); 
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      console.log('Found user:', user); 

      if (!user || !(await comparePasswords(password, user.password))) {
        console.log('Invalid credentials for user:', username); 
        return done(null, false, { message: "Invalid credentials" });
      }

      console.log('Successful login for user:', username, 'with role:', user.role); 
      return done(null, user);
    } catch (error) {
      console.error('Error during authentication:', error); 
      return done(error);
    }
  }));

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id, user.role); 
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

      console.log('Deserialized user:', user); 
      done(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error); 
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || "Invalid credentials" });

      req.login(user, (err) => {
        if (err) return next(err);
        console.log('Sending user response:', user); 
        res.json({
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName,
          email: user.email
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log('Current user session:', req.user); 
    res.json(req.user);
  });
}