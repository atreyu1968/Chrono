import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { users } from "@db/schema";
import { db, pool } from "@db";
import { eq } from "drizzle-orm";

declare module 'express-session' {
  interface SessionData {
    passport: {
      user: number; // user.id
    }
  }
}

const PostgresSessionStore = connectPg(session);

export function setupAuth(app: Express) {
  // Session configuration
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
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport Local Strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      // Find user
      const [user] = await db.select().from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return done(null, false, { message: 'Usuario o contraseña incorrectos' });
      }

      // Validate password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Usuario o contraseña incorrectos' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // Serialize user for the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Error en autenticación:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (!user) {
        return res.status(401).json({ error: info?.message || 'Usuario o contraseña incorrectos' });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('Error en login:', err);
          return res.status(500).json({ error: 'Error al iniciar sesión' });
        }

        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Error en logout:', err);
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      res.sendStatus(200);
    });
  });

  app.get('/api/user', (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  // Helper middleware for protected routes
  app.use('/api/*', (req, res, next) => {
    if (req.path === '/api/login' || req.path === '/api/logout' || req.path === '/api/user') {
      return next();
    }

    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    next();
  });
}