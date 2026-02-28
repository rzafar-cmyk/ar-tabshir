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

/** Create or update a user record when they sign in via Clerk. */
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      // Update last login and sync name/email from Clerk
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        lastLogin: Date.now(),
      });
      return existing._id;
    }

    // New user — default role is country_rep (safest)
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      role: "country_rep",
      assignedCountries: [],
      isActive: true,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    });
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
