import { Hono } from "hono";
import Razorpay from "razorpay";
import validator from "../middlewares/validator";
import { CreateOrderSchema, VerifyPaymentSchema, payments } from "../schema/payments";
import { db } from "../utils/db";
import authenticateUser from "../middlewares/authenticate-user";
import { users } from "../schema/users";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const payment = new Hono();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_SECRET!,
});

payment.post("/create-order", authenticateUser, validator("json", CreateOrderSchema), async (c) => {
    try {
      const { amount } = c.req.valid("json");
      const { email } = c.get("jwtPayload");
  
      const [user] = await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, email));
  
      if (!user) {
        return c.json({ success: false, error: "User not found" }, 404);
      }
  
      const order = await razorpay.orders.create({
        amount: parseInt(amount) * 100,
        currency: "INR",
        receipt: `order_${Date.now()}`
      });
  
      console.log('Razorpay Order:', order);
  
      await db.insert(payments).values({
        userId: user.id,
        razorpayOrderId: order.id,
        amount,
        status: "pending",
      });
  
      return c.json({
        success: true,
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      });
    } catch (error) {
      console.error('Razorpay Error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  });

payment.post("/verify", authenticateUser, validator("json", VerifyPaymentSchema), async (c) => {
  const { orderId, paymentId, signature } = c.req.valid("json");
  const { email } = c.get("jwtPayload");

  const [user] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET!);
  shasum.update(`${orderId}|${paymentId}`);
  const digest = shasum.digest("hex");

  if (digest !== signature) {
    return c.json({ success: false, error: "Invalid signature" }, 400);
  }

  await db
    .update(payments)
    .set({
      status: "completed",
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    })
    .where(eq(payments.razorpayOrderId, orderId));

  return c.json({
    success: true,
    message: "Payment verified successfully",
  });
});

export default payment;