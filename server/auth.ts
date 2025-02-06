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
    console.log('Comparing passwords:');
    console.log('- Supplied password:', supplied);
    console.log('- Stored hash:', stored);

    if (!stored || !supplied) {
      console.error('Invalid password data:', { supplied: !!supplied, stored: !!stored });
      return false;
    }

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
    console.log('Looking up user:', username);
    const [user] = await db.select().from(users)
      .where(eq(users.username, username))
      .limit(1);

    console.log('User lookup result:', user ? 'found' : 'not found');
    if (user) {
      console.log('User data:', { id: user.id, username: user.username, role: user.role });
    }
    return user;
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
        console.log('LocalStrategy: Attempting authentication for user:', username);
        const user = await getUserByUsername(username);

        if (!user) {
          console.log('LocalStrategy: User not found');
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }

        console.log('LocalStrategy: User found, comparing passwords');
        const isValidPassword = await comparePasswords(password, user.password);

        if (!isValidPassword) {
          console.log('LocalStrategy: Invalid password');
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }

        console.log('LocalStrategy: Authentication successful');
        return done(null, user);
      } catch (error) {
        console.error('LocalStrategy: Authentication error:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log('serializeUser:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('deserializeUser:', id);
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
        .then(rows => rows[0]);

      if (!user) {
        console.log('deserializeUser: User not found');
        return done(null, false);
      }

      console.log('deserializeUser: Success');
      done(null, user);
    } catch (error) {
      console.error('deserializeUser: Error:', error);
      done(error);
    }
  });

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    console.log('Login request:', { username: req.body.username });

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      if (!user) {
        console.log('Login failed:', info?.message);
        return res.status(401).json({ error: info?.message || "Usuario o contraseña incorrectos" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ error: "Error al iniciar sesión" });
        }

        console.log('Login successful:', user.username);
        return res.json({
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
      console.log('Logout request:', (req.user as Express.User).username);
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
    console.log('User request:', req.isAuthenticated() ? 'authenticated' : 'not authenticated');

    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const user = req.user as Express.User;
    console.log('Returning user data:', user.username);
    res.json(user);
  });
}