import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reports: defineTable({
    country: v.string(),
    year: v.string(),
    status: v.string(),
    data: v.any(),
    completionPercentage: v.number(),
    submittedBy: v.string(),
    submittedAt: v.number(),
    updatedAt: v.number(),
    isArchived: v.boolean(),
  }),

  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("desk_incharge"),
      v.literal("country_rep")
    ),
    assignedCountries: v.array(v.string()),
    assignedDesk: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    lastLogin: v.number(),
  }).index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  audit_log: defineTable({
    userId: v.string(),
    userName: v.string(),
    userRole: v.string(),
    action: v.string(),
    reportId: v.string(),
    country: v.string(),
    changes: v.string(),
    timestamp: v.number(),
  }),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }),
});
