import { timestamp, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { lockers } from "./lockers";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  currentLockerId: uuid("current_locker_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const usersRelations = relations(users, ({ one }) => ({
  currentLocker: one(lockers, {
    fields: [users.currentLockerId],
    references: [lockers.id],
  }),
}));

export const UserSchema = createInsertSchema(users, {
  name: z
    .string({ message: "Name is a required field " })
    .min(3, { message: "Name must be at least 3 characters" }),
  email: z
    .string({ message: "Email is a required field " })
    .email("Must be a valid email")
    .includes("srmist.edu.in", {
      message: "Email must be a SRMIST email",
    }),
  password: z.string({ message: "Password is a required field " }).min(8, {
    message: "Password must be at least 8 characters",
  }),
  registrationNumber: z
    .string({ message: "Registration number is a required field " })
    .includes("RA", {
      message: "Registration number must include 'RA'",
    })
    .length(15, { message: "Registration number must be 15 characters" }),
});

export const SignInUserSchema = UserSchema.pick({
  email: true,
  password: true,
});

export const UpdateUserSchema = UserSchema.pick({
  name: true,
  password: true,
}).partial();
