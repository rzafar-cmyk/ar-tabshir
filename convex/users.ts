import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Look up a user by their Clerk ID. */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

/** Get all users (for admin user management page). */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

/** Try to link a Clerk sign-in to an existing Convex user.
 *  Returns the user ID if found (by clerkId or email), or null if not authorized.
 *  Does NOT create new users — only admin can pre-create users. */
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Already linked by Clerk ID
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        lastLogin: Date.now(),
      });
      return existing._id;
    }

    // 2. Pre-created by admin — match by email (case-insensitive)
    const emailLower = args.email.toLowerCase();
    // Try exact index match first
    let preCreated = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();
    // If no exact match, scan for case-insensitive match (small table)
    if (!preCreated) {
      preCreated = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
    }
    if (!preCreated) {
      const allUsers = await ctx.db.query("users").collect();
      preCreated = allUsers.find(
        (u) => u.email.toLowerCase() === emailLower
      ) ?? null;
    }

    if (preCreated) {
      // Link the Clerk ID to the pre-created user
      await ctx.db.patch(preCreated._id, {
        clerkId: args.clerkId,
        name: args.name,
        email: emailLower, // normalize stored email
        lastLogin: Date.now(),
      });
      return preCreated._id;
    }

    // 3. No match — user is NOT pre-registered. Do NOT create a record.
    return null;
  },
});

/** Seed super admin if none exists. */
export const seedSuperAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if any super_admin exists
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "super_admin"))
      .collect();

    if (admins.length > 0) return null;

    // No admin exists — create one
    return await ctx.db.insert("users", {
      clerkId: "",
      name: "Rashid Ahmad",
      email: "rasheed.zafar@gmail.com",
      role: "super_admin",
      assignedCountries: [],
      isActive: true,
      createdAt: Date.now(),
      lastLogin: 0,
    });
  },
});

/** Update a user's role (super_admin only). */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("super_admin"),
      v.literal("desk_incharge"),
      v.literal("country_rep")
    ),
    callerClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify caller is super_admin
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.callerClerkId))
      .first();
    if (!caller || caller.role !== "super_admin") {
      throw new Error("Only super_admin can change roles.");
    }

    // Prevent self-escalation
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");
    if (target.clerkId === args.callerClerkId && args.role !== caller.role) {
      throw new Error("You cannot change your own role.");
    }

    await ctx.db.patch(args.userId, { role: args.role });
  },
});

/** Update user details (super_admin only). */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    callerClerkId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("super_admin"),
        v.literal("desk_incharge"),
        v.literal("country_rep")
      )
    ),
    assignedCountries: v.optional(v.array(v.string())),
    assignedDesk: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify caller is super_admin
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.callerClerkId))
      .first();
    if (!caller || caller.role !== "super_admin") {
      throw new Error("Only super_admin can edit users.");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");

    // Prevent self role-change
    if (
      args.role &&
      target.clerkId === args.callerClerkId &&
      args.role !== caller.role
    ) {
      throw new Error("You cannot change your own role.");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.role !== undefined) updates.role = args.role;
    if (args.assignedCountries !== undefined)
      updates.assignedCountries = args.assignedCountries;
    if (args.assignedDesk !== undefined) updates.assignedDesk = args.assignedDesk;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.userId, updates);
  },
});

/** Manually create a user (super_admin only).
 *  Used when admin wants to pre-create a user before they sign in via Clerk.
 *  When the user later signs in, createOrUpdateUser will match by email and link the Clerk ID. */
export const createUser = mutation({
  args: {
    callerClerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("desk_incharge"),
      v.literal("country_rep")
    ),
    assignedCountries: v.optional(v.array(v.string())),
    assignedDesk: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify caller is super_admin
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.callerClerkId))
      .first();
    if (!caller || caller.role !== "super_admin") {
      throw new Error("Only super_admin can create users.");
    }

    // Check if email already exists (case-insensitive)
    const emailLower = args.email.toLowerCase();
    const allUsers = await ctx.db.query("users").collect();
    const existing = allUsers.find(
      (u) => u.email.toLowerCase() === emailLower
    );
    if (existing) {
      throw new Error("A user with this email already exists.");
    }

    return await ctx.db.insert("users", {
      clerkId: "",
      name: args.name,
      email: emailLower,
      role: args.role,
      assignedCountries: args.assignedCountries ?? [],
      assignedDesk: args.assignedDesk,
      isActive: true,
      createdAt: Date.now(),
      lastLogin: 0,
    });
  },
});

/** Assign countries to a user (super_admin or desk_incharge). */
export const assignCountriesToUser = mutation({
  args: {
    userId: v.id("users"),
    callerClerkId: v.string(),
    assignedCountries: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.callerClerkId))
      .first();
    if (!caller || (caller.role !== "super_admin" && caller.role !== "desk_incharge")) {
      throw new Error("Only super_admin or desk_incharge can assign countries.");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");

    await ctx.db.patch(args.userId, {
      assignedCountries: args.assignedCountries,
    });
  },
});

/** Merge duplicate users by email. Keeps the admin-created one (with role/country),
 *  copies the clerkId from the auto-created one, then deletes the duplicate. */
export const cleanupDuplicateUsers = mutation({
  args: { callerClerkId: v.string() },
  handler: async (ctx, args) => {
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.callerClerkId))
      .first();
    if (!caller || caller.role !== "super_admin") {
      throw new Error("Only super_admin can clean up duplicates.");
    }

    const allUsers = await ctx.db.query("users").collect();
    // Group by lowercase email
    const byEmail: Record<string, typeof allUsers> = {};
    for (const u of allUsers) {
      const key = u.email.toLowerCase();
      if (!byEmail[key]) byEmail[key] = [];
      byEmail[key].push(u);
    }

    let cleaned = 0;
    for (const [, group] of Object.entries(byEmail)) {
      if (group.length <= 1) continue;
      // Prefer the one that has a non-empty role assignment (admin-created)
      // and copy clerkId from the one that has it
      const withClerk = group.find((u) => u.clerkId !== "");
      const adminCreated = group.find(
        (u) => u.assignedCountries.length > 0 || u.role !== "country_rep"
      );
      const keep = adminCreated ?? group[0];
      // If the kept record has no clerkId but another does, copy it
      if (keep.clerkId === "" && withClerk) {
        await ctx.db.patch(keep._id, {
          clerkId: withClerk.clerkId,
          lastLogin: Math.max(keep.lastLogin, withClerk.lastLogin),
          email: keep.email.toLowerCase(),
        });
      }
      // Delete all others
      for (const u of group) {
        if (u._id !== keep._id) {
          await ctx.db.delete(u._id);
          cleaned++;
        }
      }
    }
    return { cleaned };
  },
});

/** One-time migration: clean up duplicate Rashid Ahmad and add missing users.
 *  Safe to run multiple times — skips users that already exist. */
export const migrateFixUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const log: string[] = [];

    // --- Fix duplicate "Rashid Ahmad" ---
    const rashidUsers = allUsers.filter(
      (u) => u.email.toLowerCase() === "rasheed.zafar@gmail.com"
    );
    if (rashidUsers.length > 1) {
      // Keep the one with a real clerkId; if both have one, keep the first linked
      const withClerk = rashidUsers.find((u) => u.clerkId !== "");
      const keep = withClerk ?? rashidUsers[0];
      for (const u of rashidUsers) {
        if (u._id !== keep._id) {
          // Copy clerkId if the kept one doesn't have it
          if (keep.clerkId === "" && u.clerkId !== "") {
            await ctx.db.patch(keep._id, { clerkId: u.clerkId });
          }
          await ctx.db.delete(u._id);
          log.push(`Deleted duplicate Rashid Ahmad (${u._id})`);
        }
      }
      log.push(`Kept Rashid Ahmad (${keep._id}, clerkId: ${keep.clerkId || "empty"})`);
    } else if (rashidUsers.length === 1) {
      log.push("Rashid Ahmad: no duplicates found, OK");
    }

    // --- Ensure Rashid Ahmad exists ---
    const rashidEmail = "rasheed.zafar@gmail.com";
    // Re-read after potential deletion above
    const currentUsers = await ctx.db.query("users").collect();
    const rashidExists = currentUsers.find(
      (u) => u.email.toLowerCase() === rashidEmail.toLowerCase()
    );
    if (!rashidExists) {
      await ctx.db.insert("users", {
        clerkId: "",
        name: "Rashid Ahmad",
        email: rashidEmail,
        role: "super_admin",
        assignedCountries: [],
        isActive: true,
        createdAt: Date.now(),
        lastLogin: 0,
      });
      log.push("Added Rashid Ahmad (super_admin)");
    } else {
      log.push("Rashid Ahmad already exists, skipped");
    }

    // --- Add missing user: Aziz Ahmed ---
    const azizEmail = "bilal.azizahmad@gmail.com";
    const azizExists = allUsers.find(
      (u) => u.email.toLowerCase() === azizEmail.toLowerCase()
    );
    if (!azizExists) {
      await ctx.db.insert("users", {
        clerkId: "", // will be linked on first Clerk sign-in
        name: "Aziz Ahmed",
        email: azizEmail,
        role: "super_admin",
        assignedCountries: [],
        isActive: true,
        createdAt: Date.now(),
        lastLogin: 0,
      });
      log.push("Added Aziz Ahmed (super_admin)");
    } else {
      log.push("Aziz Ahmed already exists, skipped");
    }

    // --- Add missing user: t.khan ---
    const tkhanEmail = "ibnezafar@outlook.com";
    const tkhanExists = allUsers.find(
      (u) => u.email.toLowerCase() === tkhanEmail.toLowerCase()
    );
    if (!tkhanExists) {
      await ctx.db.insert("users", {
        clerkId: "", // user hasn't signed up via Clerk yet
        name: "t.khan",
        email: tkhanEmail,
        role: "desk_incharge",
        assignedCountries: ["Ghana", "Nigeria"],
        assignedDesk: "Africa Desk",
        isActive: true,
        createdAt: Date.now(),
        lastLogin: 0,
      });
      log.push("Added t.khan (desk_incharge, Ghana/Nigeria)");
    } else {
      log.push("t.khan already exists, skipped");
    }

    return { log };
  },
});

/** Delete a user (super_admin only). */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    callerClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.callerClerkId))
      .first();
    if (!caller || caller.role !== "super_admin") {
      throw new Error("Only super_admin can delete users.");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");
    if (target.clerkId === args.callerClerkId) {
      throw new Error("You cannot delete your own account.");
    }

    await ctx.db.delete(args.userId);
  },
});
