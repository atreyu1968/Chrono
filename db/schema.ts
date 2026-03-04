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
  phone: text("phone"),
  avatar: text("avatar"),
  employeeType: text("employee_type", { enum: ["profesor", "pas"] }),
  department: text("department"),
  medusaUser: text("medusa_user"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
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

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).unique().notNull(),
  theme: text("theme").default("blue").notNull(),
  appearance: text("appearance", { enum: ["light", "dark", "system"] }).default("light").notNull(),
  animationsEnabled: boolean("animations_enabled").default(true).notNull(),
  animationSpeed: real("animation_speed").default(1).notNull(),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false).notNull(),
  autoCheckIn: boolean("auto_check_in").default(false).notNull(),
  autoCheckOut: boolean("auto_check_out").default(false).notNull(),
  singleCheckInPerDay: boolean("single_check_in_per_day").default(false).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").references(() => users.id).notNull(),
  toUserId: integer("to_user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
});

export const userRelations = relations(users, ({ many, one }) => ({
  attendance: many(attendance),
  settings: one(userSettings),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const departmentRelations = relations(departments, () => ({}));

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

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id]
  })
}));

export const messageRelations = relations(messages, ({ one }) => ({
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  toUser: one(users, {
    fields: [messages.toUserId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

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
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const selectUserSettingsSchema = createSelectSchema(userSettings);
export const insertDepartmentSchema = createInsertSchema(departments);
export const selectDepartmentSchema = createSelectSchema(departments);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;
export type SelectLocation = typeof locations.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export type SelectAttendance = typeof attendance.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
export type SelectUserSettings = typeof userSettings.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;
export type SelectDepartment = typeof departments.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;
