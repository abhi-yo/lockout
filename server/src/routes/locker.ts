import { Hono } from "hono";
import validator from "../middlewares/validator";
import {
  AccquireLockerSchema,
  AddLockerSchema,
  lockers,
  PingLockerBodySchema,
  PingLockerParamSchema,
  VerifyLockerSchema,
} from "../schema/lockers";
import { db } from "../utils/db";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import authenticateAdmin from "../middlewares/authenticate-admin";
import authenticateUser from "../middlewares/authenticate-user";
import { users } from "../schema/users";
import { history } from "../schema/history";
import { lockerItem } from "../schema/locations";
import { payments } from "../schema/payments";

const locker = new Hono();

locker.post("/online", validator("json", AddLockerSchema), async (c) => {
  const { state, ...locker } = c.req.valid("json");

  if (state !== "online") {
    return c.json(
      {
        success: false,
        error: "Locker state must be 'online'",
      },
      400
    );
  }

  const [createdLocker] = await db
    .insert(lockers)
    .values({
      state: "available",
      ...locker,
    })
    .onConflictDoUpdate({
      target: lockers.machineId,
      set: {
        isAlive: true,
        lastPing: new Date(),
      },
    })
    .returning({
      id: lockers.id,
      state: lockers.state,
    });

  if (!createdLocker) {
    return c.json({ success: false, error: "Failed to create locker" }, 500);
  }

  if (createdLocker.state === "offline") {
    const [stateUpdateLocker] = await db
      .update(lockers)
      .set({
        state: "available",
      })
      .returning({
        id: lockers.id,
        state: lockers.state,
      });

    if (!stateUpdateLocker) {
      return c.json({
        success: false,
        error: "Failed to update locker state",
      });
    }

    return c.json({
      success: true,
      message: "Successfully updated locker state",
      data: {
        locker: stateUpdateLocker,
      },
    });
  }

  return c.json({
    success: true,
    message: "Successfully created locker",
    data: {
      locker: createdLocker,
    },
  });
});

locker.post("/verify", validator("json", VerifyLockerSchema), async (c) => {
  const { lockerId, key } = c.req.valid("json");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.currentLockerId, lockerId));

  if (!user) {
    return c.json({ success: false, error: "Locker not found" }, 404);
  }

  if (user.registrationNumber !== key) {
    return c.json({ success: false, error: "Invalid key" }, 400);
  }

  return c.json({ success: true, message: "Key is valid" });
});

locker.get("/all", authenticateAdmin, async (c) => {
  const availableLockers = await db
    .select({
      id: lockers.id,
      machineId: lockers.machineId,
      state: lockers.state,
      lastPing: lockers.lastPing,
    })
    .from(lockers)
    .where(and(eq(lockers.state, "available"), eq(lockers.isAlive, true)));

  return c.json({
    success: true,
    message: "Successfully fetched available lockers",
    data: {
      lockers: availableLockers,
    },
  });
});

locker.post(
  "/ping/:id",
  validator("param", PingLockerParamSchema),
  validator("json", PingLockerBodySchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { state } = c.req.valid("json");

    const [updatedLocker] = await db
      .update(lockers)
      .set({
        state,
        lastPing: new Date(),
      })
      .where(eq(lockers.id, id))
      .returning({
        id: lockers.id,
        state: lockers.state,
        lastPing: lockers.lastPing,
      });

    if (!updatedLocker) {
      return c.json({ success: false, error: "Locker not found" }, 404);
    }

    return c.json({
      success: true,
      message: "Successfully updated locker",
      data: {
        locker: updatedLocker,
      },
    });
  }
);

locker.post(
  "/accquire/:lockerItemId",
  authenticateUser,
  validator("param", AccquireLockerSchema),
  async (c) => {
    const { lockerItemId } = c.req.valid("param");
    const { email } = c.get("jwtPayload");
    
    const [userDetails] = await db
      .select({
        id: users.id,
        currentLockerId: users.currentLockerId,
      })
      .from(users)
      .where(eq(users.email, email));

    if (!userDetails) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    if (userDetails.currentLockerId) {
      return c.json({ success: false, error: "User already has a locker" }, 400);
    }

    const [latestPayment] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.userId, userDetails.id),
          eq(payments.status, "completed")
        )
      )
      .orderBy(sql`${payments.createdAt} DESC`)
      .limit(1);

    if (!latestPayment) {
      return c.json({
        success: false,
        error: "Payment required before acquiring locker",
        requiresPayment: true
      }, 400);
    }

    const [selectedLockerItem] = await db
      .select()
      .from(lockerItem)
      .where(eq(lockerItem.id, lockerItemId));

    if (!selectedLockerItem) {
      return c.json(
        {
          success: false,
          error: "Locker item not found",
        },
        404
      );
    }

    if (!selectedLockerItem.lockerId) {
      return c.json(
        {
          success: false,
          error: "Locker item is already connected",
        },
        400
      );
    }

    const [locker] = await db
      .select({
        id: lockers.id,
        ipAddr: lockers.ipAddr,
        state: lockers.state,
      })
      .from(lockers)
      .where(eq(lockers.id, selectedLockerItem.lockerId));

    if (!locker) {
      return c.json({ success: false, error: "Locker not found" }, 404);
    }

    if (locker.state != "available" || !locker.ipAddr) {
      return c.json({ success: false, error: "Locker is not available" }, 400);
    }

    const [user] = await db
      .select({
        id: users.id,
        currentLockerId: users.currentLockerId,
      })
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    if (user.currentLockerId) {
      return c.json({ sucess: false, error: "User already has a locker" }, 400);
    }

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(lockers)
          .set({
            state: "in_use",
          })
          .where(eq(lockers.id, locker.id))
          .returning({
            id: lockers.id,
            state: lockers.state,
          });

        await tx
          .update(users)
          .set({
            currentLockerId: locker.id,
          })
          .where(eq(users.email, email));

        await tx.insert(history).values({
          userId: user.id,
          lockerItemId: lockerItemId,
        });

        const res = (await (
          await fetch(`http://${locker.ipAddr}/accquire`, {
            method: "POST",
          })
        ).json()) as ApiResponse<never>;

        if (!res.success) {
          return c.json({ success: false, error: res.message }, 400);
        }
      });

      return c.json({
        success: true,
        message: "Successfully accquired locker",
      });
    } catch (e) {
      return c.json(
        { success: false, error: "Failed to accquire locker" },
        500
      );
    }
  }
);

locker.post("/open", authenticateUser, async (c) => {
  const { email } = c.get("jwtPayload");

  const [user] = await db
    .select({
      id: users.id,
      currentLockerId: users.currentLockerId,
    })
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  if (!user.currentLockerId) {
    return c.json(
      { success: false, error: "User does not have a locker" },
      400
    );
  }

  const [locker] = await db
    .select({
      id: lockers.id,
      ipAddr: lockers.ipAddr,
    })
    .from(lockers)
    .where(eq(lockers.id, user.currentLockerId));

  if (!locker) {
    return c.json({ success: false, error: "Locker not found" }, 404);
  }

  try {
    const res = (await (
      await fetch(`http://${locker.ipAddr}/open`, {
        method: "POST",
      })
    ).json()) as ApiResponse<never>;

    if (!res.success) {
      return c.json({ success: false, error: res.message }, 400);
    }

    return c.json({
      success: true,
      message: "Successfully opened locker",
    });
  } catch (e) {
    return c.json({ success: false, error: "Failed to open locker" }, 500);
  }
});

locker.post("/close", authenticateUser, async (c) => {
  const { email } = c.get("jwtPayload");

  const [user] = await db
    .select({
      id: users.id,
      currentLockerId: users.currentLockerId,
    })
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  if (!user.currentLockerId) {
    return c.json(
      { success: false, error: "User does not have a locker" },
      400
    );
  }

  const [locker] = await db
    .select({
      id: lockers.id,
      ipAddr: lockers.ipAddr,
    })
    .from(lockers)
    .where(eq(lockers.id, user.currentLockerId));

  if (!locker) {
    return c.json({ success: false, error: "Locker not found" }, 404);
  }

  try {
    const res = (await (
      await fetch(`http://${locker.ipAddr}/close`, {
        method: "POST",
      })
    ).json()) as ApiResponse<never>;

    if (!res.success) {
      return c.json({ success: false, error: res.message }, 400);
    }

    return c.json({
      success: true,
      message: "Successfully closed locker",
    });
  } catch (e) {
    return c.json({ success: false, error: "Failed to close locker" }, 500);
  }
});

locker.post("/release", authenticateUser, async (c) => {
  const { email } = c.get("jwtPayload");

  const [user] = await db
    .select({
      id: users.id,
      currentLockerId: users.currentLockerId,
    })
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  if (!user.currentLockerId) {
    return c.json(
      { success: false, error: "User does not have a locker" },
      400
    );
  }

  const [locker] = await db
    .select({
      id: lockers.id,
      ipAddr: lockers.ipAddr,
    })
    .from(lockers)
    .where(eq(lockers.id, user.currentLockerId));

  if (!locker) {
    return c.json({ success: false, error: "Locker not found" }, 404);
  }

  const [currentLockerItem] = await db
    .select()
    .from(lockerItem)
    .where(eq(lockerItem.lockerId, locker.id));

  if (!currentLockerItem) {
    return c.json({ success: false, error: "Locker item not found" }, 404);
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(lockers)
        .set({
          state: "available",
        })
        .where(eq(lockers.id, locker.id));
      await tx
        .update(users)
        .set({
          currentLockerId: null,
        })
        .where(eq(users.email, email));
      await tx
        .update(history)
        .set({
          endTime: new Date(),
        })
        .where(
          and(
            eq(history.userId, user.id),
            eq(history.lockerItemId, currentLockerItem.id),
            isNull(history.endTime)
          )
        );

      const res = (await (
        await fetch(`http://${locker.ipAddr}/release`, {
          method: "POST",
        })
      ).json()) as ApiResponse<never>;

      if (!res.success) {
        return c.json({ success: false, error: res.message }, 400);
      }
    });

    return c.json({
      success: true,
      message: "Successfully released locker",
    });
  } catch (e) {
    return c.json({ success: false, error: "Failed to release locker" }, 500);
  }
});

locker.post("/sync", authenticateAdmin, async (c) => {
  await db
    .update(lockers)
    .set({
      isAlive: false,
      state: "offline",
    })
    .where(
      and(
        lt(
          sql`extract (epoch from last_ping + interval '30 minutes')`,
          new Date().getTime()
        ),
        eq(lockers.isAlive, true),
        eq(lockers.state, "available")
      )
    );

  await db
    .update(lockers)
    .set({
      isAlive: false,
    })
    .where(
      and(
        lt(
          sql`extract (epoch from last_ping + interval '30 minutes')`,
          new Date().getTime()
        ),
        eq(lockers.isAlive, true)
      )
    );

  return c.json({ success: true, message: "Successfully synced lockers" });
});

export default locker;
