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

/** Get all audit events (most recent first). Role-based: country_rep sees only own countries. */
export const getAuditEvents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];

    let events = await ctx.db
      .query("audit_log")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    // Role-based filtering
    if (user.role === "country_rep") {
      events = events.filter((e) =>
        user.assignedCountries.includes(e.country)
      );
    } else if (user.role === "desk_incharge") {
      events = events.filter((e) =>
        user.assignedCountries.includes(e.country)
      );
    }
    // super_admin sees all

    return events;
  },
});

/** Log a new audit event. */
export const logAuditEvent = mutation({
  args: {
    action: v.string(),
    country: v.string(),
    details: v.optional(v.string()),
    changes: v.optional(v.string()),
    reportId: v.optional(v.string()),
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.callerClerkId);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("audit_log", {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: args.action,
      reportId: args.reportId,
      country: args.country,
      details: args.details,
      changes: args.changes,
      timestamp: Date.now(),
    });
  },
});

/** Clear all audit events (admin only, used in factory reset). */
export const clearAuditLog = mutation({
  args: {
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.callerClerkId);
    if (!user || user.role !== "super_admin") {
      throw new Error("Only super_admin can clear audit log");
    }

    const allEvents = await ctx.db.query("audit_log").collect();
    for (const event of allEvents) {
      await ctx.db.delete(event._id);
    }
  },
});
