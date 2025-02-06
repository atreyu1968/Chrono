import { pgTable, text, serial, integer, boolean, timestamp, real, time, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "employee"] }).default("employee").notNull(),
  employeeType: text("employee_type", { 
    enum: ["profesor", "pas"] 
  }).default("pas").notNull(),
  medusaUser: text("medusa_user").unique(),
  fullName: text("full_name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone"),
  departmentId: integer("department_id").references(() => departments.id),
  avatar: text("avatar_url"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  biometricToken: text("biometric_token"),
  pin: text("pin")
}, (table) => ({
  departmentIdIdx: index("user_department_id_idx").on(table.departmentId),
  usernameIdx: index("user_username_idx").on(table.username),
  emailIdx: index("user_email_idx").on(table.email)
}));

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radius: integer("radius").default(500).notNull()
});

export const attendanceStatus = pgTable("attendance_status", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code", { enum: ["present", "absent", "late"] }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id),
  statusId: integer("status_id").references(() => attendanceStatus.id).notNull(),
  checkInTime: timestamp("check_in_time").notNull(),
  checkOutTime: timestamp("check_out_time"),
  isManualEntry: boolean("is_manual_entry").default(false),
  incidenceType: text("incidence_type", { 
    enum: ["forgotten_check_in", "forgotten_check_out", "other"] 
  }),
  incidenceDescription: text("incidence_description"),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("attendance_user_id_idx").on(table.userId),
  locationIdIdx: index("attendance_location_id_idx").on(table.locationId),
  statusIdIdx: index("attendance_status_id_idx").on(table.statusId),
  checkInTimeIdx: index("attendance_check_in_time_idx").on(table.checkInTime),
  userLocationIdx: index("attendance_user_location_idx").on(table.userId, table.locationId)
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").references(() => users.id).notNull(),
  toUserId: integer("to_user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  read: boolean("read").default(false).notNull()
}, (table) => ({
  fromUserIdIdx: index("message_from_user_id_idx").on(table.fromUserId),
  toUserIdIdx: index("message_to_user_id_idx").on(table.toUserId),
  sentAtIdx: index("message_sent_at_idx").on(table.sentAt)
}));

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  theme: text("theme", { enum: ["blue", "green", "purple", "orange"] }).default("blue").notNull(),
  appearance: text("appearance", { enum: ["light", "dark", "system"] }).default("light").notNull(),
  animationsEnabled: boolean("animations_enabled").default(true).notNull(),
  animationSpeed: real("animation_speed").default(1).notNull(),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false).notNull(),
  compactMode: boolean("compact_mode").default(false),
  singleCheckInPerDay: boolean("single_check_in_per_day").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("user_settings_user_id_idx").on(table.userId)
}));

export const userSchedules = pgTable("user_schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  weekday: integer("weekday").notNull(), // 0-6, donde 0 es domingo
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["nacional", "regional", "local"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const departmentRelations = relations(departments, ({ many }) => ({
  users: many(users)
}));

export const userScheduleRelations = relations(userSchedules, ({ one }) => ({
  user: one(users, {
    fields: [userSchedules.userId],
    references: [users.id]
  })
}));

export const userRelations = relations(users, ({ many, one }) => ({
  attendance: many(attendance),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  schedules: many(userSchedules)
}));

export const locationRelations = relations(locations, ({ many }) => ({
  attendance: many(attendance)
}));

export const attendanceStatusRelations = relations(attendanceStatus, ({ many }) => ({
  records: many(attendance)
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(users, {
    fields: [attendance.userId],
    references: [users.id]
  }),
  location: one(locations, {
    fields: [attendance.locationId],
    references: [locations.id]
  }),
  status: one(attendanceStatus, {
    fields: [attendance.statusId],
    references: [attendanceStatus.id]
  })
}));

export const messageRelations = relations(messages, ({ one }) => ({
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id]
  }),
  toUser: one(users, {
    fields: [messages.toUserId],
    references: [users.id]
  })
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id]
  })
}));

export const holidayRelations = relations(holidays, ({ one }) => ({
    createdBy: one(users, {
      fields: [holidays.id],
      references: [users.id]
    })
  }));

export const insertDepartmentSchema = createInsertSchema(departments);
export const selectDepartmentSchema = createSelectSchema(departments);

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
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const selectUserSettingsSchema = createSelectSchema(userSettings);
export const insertUserScheduleSchema = createInsertSchema(userSchedules);
export const selectUserScheduleSchema = createSelectSchema(userSchedules);
export const insertHolidaySchema = createInsertSchema(holidays);
export const selectHolidaySchema = createSelectSchema(holidays);
export const insertAttendanceStatusSchema = createInsertSchema(attendanceStatus);
export const selectAttendanceStatusSchema = createSelectSchema(attendanceStatus);

export type InsertDepartment = typeof departments.$inferInsert;
export type SelectDepartment = typeof departments.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;
export type SelectLocation = typeof locations.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export type SelectAttendance = typeof attendance.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
export type SelectUserSettings = typeof userSettings.$inferSelect;
export type InsertUserSchedule = typeof userSchedules.$inferInsert;
export type SelectUserSchedule = typeof userSchedules.$inferSelect;
export type InsertHoliday = typeof holidays.$inferInsert;
export type SelectHoliday = typeof holidays.$inferSelect;
export type InsertAttendanceStatus = typeof attendanceStatus.$inferInsert;
export type SelectAttendanceStatus = typeof attendanceStatus.$inferSelect;