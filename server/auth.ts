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
    const isMatch = await bcrypt.compare(supplied, stored);
    console.log('Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

async function getUserByUsername(username: string) {
  try {
    const result = await db.select().from(users)
      .where(eq(users.username, username))
      .limit(1);
    console.log('User lookup result:', result[0] ? 'found' : 'not found');
    return result;
  } catch (error) {
    console.error('Database error in getUserByUsername:', error);
    throw error;
  }
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
        console.log('Attempting authentication for user:', username);
        const [user] = await getUserByUsername(username);

        if (!user) {
          console.log('Authentication failed: User not found');
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }

        console.log('Comparing passwords for user:', username);
        const isValidPassword = await comparePasswords(password, user.password);
        console.log('Password validation result:', isValidPassword);

        if (!isValidPassword) {
          console.log('Authentication failed: Invalid password');
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }

        console.log('Authentication successful for user:', username);
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
      console.log('Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('Deserialization failed: User not found');
        return done(null, false);
      }

      console.log('User deserialized successfully');
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt received for user:', req.body.username);

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      if (!user) {
        console.log('Authentication failed:', info?.message);
        return res.status(401).json({ error: info?.message || "Usuario o contraseña incorrectos" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ error: "Error al iniciar sesión" });
        }

        console.log('Login successful for user:', user.username);
        return res.status(200).json({
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName,
          email: user.email
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    if (req.user) {
      console.log('Logout request received for user:', (req.user as Express.User).username);
    }

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

        console.log('Logout successful');
        res.clearCookie('sid');
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('Unauthenticated user request');
      return res.sendStatus(401);
    }

    console.log('User data requested for:', (req.user as Express.User).username);
    res.json(req.user);
  });
}