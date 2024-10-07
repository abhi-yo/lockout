import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});

export const UserSchema = createInsertSchema(users, {
  name: z
    .string({ required_error: "Name is a required field" })
    .min(3, { message: "Name must be at least 3 characters" }),
  email: z
    .string({ required_error: "Email is a required field" })
    .email("Must be a valid email")
    .includes("srmist.edu.in", {
      message: "Email must be a SRMIST email",
    }),
  password: z
    .string({ required_error: "Password is a required field" })
    .min(8, {
      message: "Password must be at least 8 characters",
    }),
  registrationNumber: z
    .string({ required_error: "Registration number is a required field" })
    .includes("RA", {
      message: "Registration number must include 'RA'",
    })
    .length(15, { message: "Registration number must be 15 characters" }),
});

export const SignInUserSchema = UserSchema.pick({
  email: true,
  password: true,
});

export const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters" })
    .optional(),
  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters",
    })
    .optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

export const DeleteUserSchema = z.object({
  password: z.string({ required_error: "Password is required for account deletion" }),
});
