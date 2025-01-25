import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const payments = pgTable("payments", {
 id: uuid("id").primaryKey().defaultRandom(),
 userId: uuid("user_id").references(() => users.id),
 razorpayOrderId: text("razorpay_order_id").notNull(),
 razorpayPaymentId: text("razorpay_payment_id"),
 razorpaySignature: text("razorpay_signature"), 
 amount: text("amount").notNull(),
 status: text("status").notNull().default("pending"),
 createdAt: timestamp("created_at").notNull().defaultNow(),
 updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
});

export const PaymentSchema = createInsertSchema(payments);

export const CreateOrderSchema = z.object({
 amount: z.string({ message: "Amount is required" })
   .regex(/^\d+$/, { message: "Amount must be a number" })
});

export const VerifyPaymentSchema = z.object({
 orderId: z.string({ message: "Order ID is required" }),
 paymentId: z.string({ message: "Payment ID is required" }),
 signature: z.string({ message: "Signature is required" })
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;