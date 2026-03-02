import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reports: defineTable({
    country: v.string(),
    countryCode: v.optional(v.string()),
    flag: v.optional(v.string()),
    continent: v.optional(v.string()),
    year: v.number(),
    status: v.string(),
    progress: v.number(),
    lastUpdated: v.string(),
    submittedBy: v.string(),
    submittedByUserId: v.optional(v.string()),
    submittedAt: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    data: v.any(),
    revisionFlags: v.optional(v.any()),
    updateRequestReason: v.optional(v.string()),
    updateRequestedAt: v.optional(v.string()),
    updateDeniedReason: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.string()),
    archivedBy: v.optional(v.string()),
  })
    .index("by_country", ["country"])
    .index("by_year", ["year"])
    .index("by_country_year", ["country", "year"])
    .index("by_status", ["status"]),

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
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  audit_log: defineTable({
    userId: v.string(),
    userName: v.string(),
    userRole: v.string(),
    action: v.string(),
    reportId: v.optional(v.string()),
    country: v.string(),
    changes: v.optional(v.string()),
    details: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
