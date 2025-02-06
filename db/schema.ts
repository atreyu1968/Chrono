import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "employee"] }).default("employee").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").unique().notNull(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radius: integer("radius").default(500).notNull()
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id),
  checkInTime: timestamp("check_in_time").notNull(),
  checkOutTime: timestamp("check_out_time"),
  isManualEntry: boolean("is_manual_entry").default(false),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  attendance: many(attendance)
}));

export const locationRelations = relations(locations, ({ many }) => ({
  attendance: many(attendance)
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(users, {
    fields: [attendance.userId],
    references: [users.id]
  }),
  location: one(locations, {
    fields: [attendance.locationId],
    references: [locations.id]
  })
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  username: z.string().min(1, "El nombre de usuario es requerido"),
  email: z.string().email("El email debe ser válido"),
  fullName: z.string().min(1, "El nombre completo es requerido"),
});

export const selectUserSchema = createSelectSchema(users);
export const insertLocationSchema = createInsertSchema(locations);
export const selectLocationSchema = createSelectSchema(locations);
export const insertAttendanceSchema = createInsertSchema(attendance);
export const selectAttendanceSchema = createSelectSchema(attendance);


// Types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;
export type SelectLocation = typeof locations.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export type SelectAttendance = typeof attendance.$inferSelect;