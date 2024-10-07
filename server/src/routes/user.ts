import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import authenticateUser from "../middlewares/authenticate-user";
import { DeleteUserSchema, SignInUserSchema, UpdateUserSchema, users, UserSchema } from "../schema/users";
import { JWT_SECRET } from "../utils/config";
import { db } from "../utils/db";

const user = new Hono();

user.post(
  "/create",
  zValidator("json", UserSchema, (res, c) => {
    if (!res.success) {
      return c.json(
        { success: false, error: res.error.issues[0].message },
        400
      );
    }
  }),
  async (c) => {
    const user = c.req.valid("json");
    const [createdUser] = await db
      .insert(users)
      .values({
        ...user,
        password: Bun.password.hashSync(user.password),
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        registrationNumber: users.registrationNumber,
      });
    if (!createdUser) {
      return c.json({ success: false, error: "Failed to create user" }, 500);
    }
    const token = await sign(
      {
        email: createdUser.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
      JWT_SECRET
    );
    return c.json({
      success: true,
      message: "Successfully created user",
      data: {
        user: createdUser,
        token,
      },
    });
  }
);

user.post(
  "/sign-in",
  zValidator("json", SignInUserSchema, (res, c) => {
    if (!res.success) {
      return c.json(
        { success: false, error: res.error.issues[0].message },
        400
      );
    }
  }),
  async (c) => {
    const { email, password } = c.req.valid("json");
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        registrationNumber: users.registrationNumber,
        password: users.password,
      })
      .from(users)
      .where(eq(users.email, email));
    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }
    const { password: passwordFromDb, ...details } = user;
    if (!Bun.password.verifySync(password, passwordFromDb)) {
      return c.json({ success: false, error: "Invalid password" }, 401);
    }
    const token = await sign(
      {
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
      JWT_SECRET
    );
    return c.json({
      success: true,
      message: "Successfully signed in",
      data: {
        user: details,
        token,
      },
    });
  }
);

user.get("/me", authenticateUser, async (c) => {
  const { email } = c.get("jwtPayload");
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      registrationNumber: users.registrationNumber,
    })
    .from(users)
    .where(eq(users.email, email));
  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }
  return c.json({ success: true, data: { user } });
});

user.patch("/", authenticateUser, zValidator("json", UpdateUserSchema), async (c) => {
  const { email: currentEmail } = c.get("jwtPayload");
  const updateData = c.req.valid("json");

  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.email, currentEmail))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        registrationNumber: users.registrationNumber,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    return c.json({
      success: true,
      message: "User updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Update error:", error);
    return c.json({ success: false, error: "Failed to update user", details: error.message }, 500);
  }
});

user.delete("/", authenticateUser, zValidator("json", DeleteUserSchema), async (c) => {
  const { email } = c.get("jwtPayload");
  const { password } = c.req.valid("json");
  const [user] = await db
    .select({ password: users.password })
    .from(users)
    .where(eq(users.email, email));

  if (!user || !Bun.password.verifySync(password, user.password)) {
    return c.json({ success: false, error: "Invalid password" }, 401);
  }

  const [deletedUser] = await db
    .delete(users)
    .where(eq(users.email, email))
    .returning({ id: users.id });

  if (!deletedUser) {
    return c.json({ success: false, error: "Failed to delete user" }, 500);
  }

  return c.json({
    success: true,
    message: "Successfully deleted user",
  });
});


export default user;
