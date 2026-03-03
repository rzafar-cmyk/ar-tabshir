import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

// ── Auth helper ─────────────────────────────────────────────
// Tries JWT identity first; falls back to callerClerkId parameter.
async function getAuthUser(ctx: QueryCtx | MutationCtx, callerClerkId?: string) {
  // 1. Try JWT identity (works when Clerk JWT template is configured)
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (user) return user;
  }

  // 2. Fallback: look up by callerClerkId passed from frontend
  if (callerClerkId) {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", callerClerkId))
      .first();
  }

  return null;
}

async function requireAuth(ctx: MutationCtx, callerClerkId?: string) {
  const user = await getAuthUser(ctx, callerClerkId);
  if (!user) throw new Error("Not authenticated");
  return user;
}

// ── QUERIES ─────────────────────────────────────────────────

/** Get all reports the current user is authorized to see (active + archived). */
export const getAllReports = query({
  args: { callerClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.callerClerkId);
    if (!user) return [];

    let reports = await ctx.db.query("reports").collect();

    // Role-based filtering (server-side security)
    if (user.role !== "super_admin") {
      reports = reports.filter((r) =>
        user.assignedCountries.includes(r.country)
      );
    }

    return reports;
  },
});

/** Get reports for a specific country (all years). */
export const getReportsByCountry = query({
  args: { country: v.string(), callerClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.callerClerkId);
    if (!user) return [];

    // Verify access
    if (
      user.role !== "super_admin" &&
      !user.assignedCountries.includes(args.country)
    ) {
      return [];
    }

    return await ctx.db
      .query("reports")
      .withIndex("by_country", (q) => q.eq("country", args.country))
      .collect();
  },
});

/** Get report stats for dashboard (counts by status for a given year). */
export const getReportStats = query({
  args: { year: v.optional(v.number()), callerClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.callerClerkId);
    if (!user) return { total: 0, draft: 0, submitted: 0, approved: 0, revisionRequested: 0 };

    let reports = await ctx.db.query("reports").collect();
    reports = reports.filter((r) => !r.archived);

    if (user.role !== "super_admin") {
      reports = reports.filter((r) =>
        user.assignedCountries.includes(r.country)
      );
    }

    if (args.year !== undefined) {
      reports = reports.filter((r) => r.year === args.year);
    }

    return {
      total: reports.length,
      draft: reports.filter((r) => r.status === "draft").length,
      submitted: reports.filter(
        (r) => r.status === "submitted" || r.status === "update_requested"
      ).length,
      approved: reports.filter((r) => r.status === "approved").length,
      revisionRequested: reports.filter(
        (r) =>
          r.status === "revision_requested" ||
          r.status === "update_in_progress"
      ).length,
    };
  },
});

// ── MUTATIONS ───────────────────────────────────────────────

/** Create or update a report (upsert by country + year). */
export const saveReport = mutation({
  args: {
    country: v.string(),
    countryCode: v.optional(v.string()),
    flag: v.optional(v.string()),
    continent: v.optional(v.string()),
    year: v.number(),
    status: v.string(),
    progress: v.number(),
    data: v.any(),
    submittedBy: v.optional(v.string()),
    submittedByUserId: v.optional(v.string()),
    submittedAt: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    revisionFlags: v.optional(v.any()),
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.callerClerkId);
    const now = new Date().toISOString();

    // Security: country_rep can only save for their assigned countries
    if (
      user.role === "country_rep" &&
      !user.assignedCountries.includes(args.country)
    ) {
      throw new Error("Cannot save report for unassigned country");
    }
    if (
      user.role === "desk_incharge" &&
      !user.assignedCountries.includes(args.country)
    ) {
      throw new Error("Cannot save report for unassigned country");
    }

    // Find existing non-archived report for this country+year
    const existingReports = await ctx.db
      .query("reports")
      .withIndex("by_country_year", (q) =>
        q.eq("country", args.country).eq("year", args.year)
      )
      .collect();
    const existing = existingReports.find((r) => !r.archived);

    const reportData = {
      country: args.country,
      countryCode: args.countryCode ?? "",
      flag: args.flag ?? "",
      continent: args.continent ?? "",
      year: args.year,
      status: args.status,
      progress: args.progress,
      data: args.data,
      lastUpdated: now,
      submittedBy: args.submittedBy ?? user.name,
      submittedByUserId: args.submittedByUserId ?? user._id,
      submittedAt: args.submittedAt,
      approvedBy: args.approvedBy,
      approvedAt: args.approvedAt,
      revisionFlags: args.revisionFlags,
    };

    if (existing) {
      await ctx.db.patch(existing._id, reportData);
      return existing._id;
    } else {
      return await ctx.db.insert("reports", reportData);
    }
  },
});

/** Update report status with optional extra fields (approve, revision, etc.). */
export const updateReportStatus = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.string(),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    updateDeniedReason: v.optional(v.string()),
    updateRequestReason: v.optional(v.string()),
    updateRequestedAt: v.optional(v.string()),
    revisionFlags: v.optional(v.any()),
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.callerClerkId);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    // Security: role-based status transitions
    if (user.role === "country_rep") {
      // Can: submit (draft/revision_requested → submitted), request update (approved → update_requested)
      if (
        !user.assignedCountries.includes(report.country)
      ) {
        throw new Error("Not authorized for this country");
      }
      const allowed = ["submitted", "update_requested"];
      if (!allowed.includes(args.status)) {
        throw new Error("Country rep cannot set this status");
      }
    } else if (user.role === "desk_incharge") {
      if (!user.assignedCountries.includes(report.country)) {
        throw new Error("Not authorized for this country");
      }
      const allowed = [
        "approved",
        "revision_requested",
        "update_in_progress",
      ];
      if (!allowed.includes(args.status)) {
        throw new Error("Desk in-charge cannot set this status");
      }
    }
    // super_admin can set any status

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: args.status,
      lastUpdated: now,
    };

    if (args.approvedBy !== undefined) updates.approvedBy = args.approvedBy;
    if (args.approvedAt !== undefined) updates.approvedAt = args.approvedAt;
    if (args.updateDeniedReason !== undefined)
      updates.updateDeniedReason = args.updateDeniedReason;
    if (args.updateRequestReason !== undefined)
      updates.updateRequestReason = args.updateRequestReason;
    if (args.updateRequestedAt !== undefined)
      updates.updateRequestedAt = args.updateRequestedAt;
    if (args.revisionFlags !== undefined)
      updates.revisionFlags = args.revisionFlags;

    await ctx.db.patch(args.reportId, updates);

    // Log audit event
    await ctx.db.insert("audit_log", {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: args.status === "approved" ? "approved" : args.status,
      reportId: args.reportId,
      country: report.country,
      details: `Status changed to ${args.status} for ${report.country} (${report.year})`,
      timestamp: Date.now(),
    });
  },
});

/** Soft-delete a report (archive). */
export const archiveReport = mutation({
  args: {
    reportId: v.id("reports"),
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.callerClerkId);
    if (user.role !== "super_admin") {
      throw new Error("Only super_admin can archive reports");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      archived: true,
      archivedAt: new Date().toISOString(),
      archivedBy: user.name,
      lastUpdated: new Date().toISOString(),
    });

    await ctx.db.insert("audit_log", {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: "report_archived",
      reportId: args.reportId,
      country: report.country,
      details: `Report archived for ${report.country} (${report.year})`,
      timestamp: Date.now(),
    });
  },
});

/** Restore an archived report. */
export const restoreReport = mutation({
  args: {
    reportId: v.id("reports"),
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.callerClerkId);
    if (user.role !== "super_admin") {
      throw new Error("Only super_admin can restore reports");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      archived: undefined,
      archivedAt: undefined,
      archivedBy: undefined,
      lastUpdated: new Date().toISOString(),
    });

    await ctx.db.insert("audit_log", {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: "report_restored",
      reportId: args.reportId,
      country: report.country,
      details: `Report restored for ${report.country} (${report.year})`,
      timestamp: Date.now(),
    });
  },
});

/** Permanently delete a report. */
export const deleteReport = mutation({
  args: {
    reportId: v.id("reports"),
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.callerClerkId);
    if (user.role !== "super_admin") {
      throw new Error("Only super_admin can permanently delete reports");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.delete(args.reportId);

    await ctx.db.insert("audit_log", {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: "report_deleted",
      reportId: args.reportId,
      country: report.country,
      details: `Report permanently deleted for ${report.country} (${report.year})`,
      timestamp: Date.now(),
    });
  },
});

/** Bulk import reports (super_admin only). */
export const importReports = mutation({
  args: {
    reports: v.array(
      v.object({
        country: v.string(),
        countryCode: v.optional(v.string()),
        flag: v.optional(v.string()),
        continent: v.optional(v.string()),
        year: v.number(),
        status: v.string(),
        progress: v.number(),
        data: v.any(),
        submittedBy: v.optional(v.string()),
        submittedByUserId: v.optional(v.string()),
        submittedAt: v.optional(v.string()),
        approvedBy: v.optional(v.string()),
        approvedAt: v.optional(v.string()),
        lastUpdated: v.optional(v.string()),
      })
    ),
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.callerClerkId);
    if (user.role !== "super_admin") {
      throw new Error("Only super_admin can import reports");
    }

    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;

    for (const report of args.reports) {
      // Check for existing report
      const existingReports = await ctx.db
        .query("reports")
        .withIndex("by_country_year", (q) =>
          q.eq("country", report.country).eq("year", report.year)
        )
        .collect();
      const existing = existingReports.find((r) => !r.archived);

      const reportData = {
        country: report.country,
        countryCode: report.countryCode ?? "",
        flag: report.flag ?? "",
        continent: report.continent ?? "",
        year: report.year,
        status: report.status,
        progress: report.progress,
        data: report.data,
        lastUpdated: report.lastUpdated ?? now,
        submittedBy: report.submittedBy ?? user.name,
        submittedByUserId: report.submittedByUserId,
        submittedAt: report.submittedAt,
        approvedBy: report.approvedBy,
        approvedAt: report.approvedAt,
      };

      if (existing) {
        // Merge data
        const mergedData = { ...(existing.data || {}), ...(report.data || {}) };
        await ctx.db.patch(existing._id, { ...reportData, data: mergedData });
        updated++;
      } else {
        await ctx.db.insert("reports", reportData);
        created++;
      }
    }

    await ctx.db.insert("audit_log", {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: "import",
      country: "all",
      details: `Imported ${created} new, ${updated} updated reports`,
      timestamp: Date.now(),
    });

    return { created, updated };
  },
});

/** Factory reset — delete all reports (super_admin only). */
export const factoryResetReports = mutation({
  args: {
    callerClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.callerClerkId);
    if (user.role !== "super_admin") {
      throw new Error("Only super_admin can factory reset");
    }

    const allReports = await ctx.db.query("reports").collect();
    for (const report of allReports) {
      await ctx.db.delete(report._id);
    }

    // Clear audit log
    const allAudit = await ctx.db.query("audit_log").collect();
    for (const entry of allAudit) {
      await ctx.db.delete(entry._id);
    }

    // Clear settings
    const allSettings = await ctx.db.query("settings").collect();
    for (const setting of allSettings) {
      await ctx.db.delete(setting._id);
    }
  },
});
