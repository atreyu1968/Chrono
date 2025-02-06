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
    // Logging para debug
    console.log('Comparing passwords:');
    console.log('- Supplied password length:', supplied?.length);
    console.log('- Stored hash length:', stored?.length);

    // Validación de entrada
    if (!stored || !supplied) {
      console.error('Invalid password data:', { supplied: !!supplied, stored: !!stored });
      return false;
    }

    // Comparación
    const isMatch = await bcrypt.compare(supplied, stored);
    console.log('Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Configuración de sesión
  const store = new PostgresSessionStore({ 
    pool,
    createTableIfMissing: true,
    tableName: 'session'
  });

  app.use(session({
    store,
    secret: process.env.REPL_ID || 'desarrollo-secreto',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  }));

  // Rutas de autenticación
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log('Login attempt:', username);
      console.log('Request body:', req.body);

      // Buscar usuario
      const [user] = await db.select().from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        console.log('User not found:', username);
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      console.log('User found:', { id: user.id, username: user.username });

      // Verificar contraseña
      const validPassword = await comparePasswords(password, user.password);
      if (!validPassword) {
        console.log('Invalid password for user:', username);
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      // Establecer sesión
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email
      };

      console.log('Login successful:', username);
      console.log('Session:', req.session);

      res.json(req.session.user);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.session.user) {
      return res.sendStatus(401);
    }
    res.json(req.session.user);
  });
}