import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "employee"] }).default("employee").notNull(),
  fullName: text("full_name").notNull(),
  department: text("department"),
  biometricToken: text("biometric_token"),
  pin: text("pin")
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
  locationId: integer("location_id").references(() => locations.id).notNull(),
  checkInTime: timestamp("check_in_time").notNull(),
  checkOutTime: timestamp("check_out_time"),
  status: text("status", { enum: ["present", "absent", "late"] }).notNull()
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").references(() => users.id).notNull(),
  toUserId: integer("to_user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  read: boolean("read").default(false).notNull()
});

export const userRelations = relations(users, ({ many }) => ({
  attendance: many(attendance),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" })
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

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertLocationSchema = createInsertSchema(locations);
export const selectLocationSchema = createSelectSchema(locations);
export const insertAttendanceSchema = createInsertSchema(attendance);
export const selectAttendanceSchema = createSelectSchema(attendance);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;
export type SelectLocation = typeof locations.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export type SelectAttendance = typeof attendance.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;
