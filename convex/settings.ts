import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Get all settings as key-value pairs. */
export const getAllSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db.query("settings").collect();
  },
});

/** Get a single setting by key. */
export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

/** Set a setting value (create or update). */
export const setSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Only super_admin can change settings
    if (user.role !== "super_admin") {
      throw new Error("Only super_admin can change settings");
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedBy: user.name,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        updatedBy: user.name,
        updatedAt: Date.now(),
      });
    }
  },
});

/** Delete a setting by key. */
export const deleteSetting = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user || user.role !== "super_admin") {
      throw new Error("Only super_admin can delete settings");
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
