import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

// Auth helper: JWT first, then callerClerkId fallback
async function getAuthUser(ctx: QueryCtx | MutationCtx, callerClerkId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (user) return user;
  }
  if (callerClerkId) {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", callerClerkId))
      .first();
  }
  return null;
}

/** Get all settings as key-value pairs. */
export const getAllSettings = query({
  args: { callerClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.callerClerkId);
    if (!user) return [];
    return await ctx.db.query("settings").collect();
  },
});

/** Get a single setting by key. */
export const getSetting = query({
  args: { key: v.string(), callerClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.callerClerkId);
    if (!user) return null;

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
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.callerClerkId);
    if (!user) throw new Error("Not authenticated");

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
  args: {
    key: v.string(),
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.callerClerkId);
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
