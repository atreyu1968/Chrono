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
  const store = new PostgresSessionStore({ pool, createTableIfMissing: true });
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID!,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: app.get("env") === "production",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
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

  app.post("/api/register", async (req, res, next) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      const error = fromZodError(result.error);
      return res.status(400).send(error.toString());
    }

    const [existingUser] = await getUserByUsername(result.data.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    try {
      const [user] = await db
        .insert(users)
        .values({
          ...result.data,
          password: await hashPassword(result.data.password),
        })
        .returning();

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}