import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import { supabase } from "../config/supabase.js";
import { InternalError } from "../exceptions/errors.js";
import * as notificationRepo from "../repositories/notification.repository.js";

// ═══════════════════════════════════════════════════════════════════════════
// CANDIDATE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export const CandidateDashboard = {
  async overview(c: Context) {
    const userId = c.get("userId");

    const [submissionsRes, shortlistsRes, unreadCount, profileRes] = await Promise.all([
      supabase
        .from("submissions")
        .select("id, status, submitted_at, job_requests(title, role_type, deadline)")
        .eq("candidate_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(5),
      supabase
        .from("shortlists")
        .select("id, rank, total_score, confirmed_at, job_requests(title, role_type)")
        .eq("candidate_id", userId)
        .order("confirmed_at", { ascending: false }),
      notificationRepo.countUnreadNotifications(userId),
      supabase.from("candidate_profiles").select("skills, experience_years, location").eq("user_id", userId).maybeSingle(),
    ]);

    if (submissionsRes.error) throw new InternalError(submissionsRes.error.message);
    if (shortlistsRes.error) throw new InternalError(shortlistsRes.error.message);

    const subs = submissionsRes.data ?? [];
    const byStatus = subs.reduce((acc: Record<string, number>, s: any) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {});

    return c.json(successResponse("Candidate dashboard loaded.", {
      summary: {
        total_submissions: subs.length,
        total_shortlisted: (shortlistsRes.data ?? []).length,
        unread_notifications: unreadCount,
        by_status: byStatus,
      },
      recent_submissions: subs.slice(0, 5),
      shortlists: shortlistsRes.data ?? [],
      profile: profileRes.data ?? null,
    }));
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export const EmployerDashboard = {
  async overview(c: Context) {
    const userId = c.get("userId");

    // FIX (C5): original code did `(await supabase...)` INSIDE a `.in(...)`
    // filter that itself was inside a Promise.all. That breaks parallelism
    // and fires N+1 queries. Fix: fetch requests first, then fan out submissions
    // + shortlists + notifications in a single Promise.all using the request ids.
    const requestsRes = await supabase
      .from("job_requests")
      .select("id, title, status, challenge_cap, shortlist_size, deadline, published_at, created_at")
      .eq("employer_id", userId)
      .order("created_at", { ascending: false });
    if (requestsRes.error) throw new InternalError(requestsRes.error.message);

    const requests = requestsRes.data ?? [];
    const requestIds = requests.map((r: any) => r.id);

    const [submissionsRes, shortlistsRes, unreadCount] = await Promise.all([
      requestIds.length
        ? supabase.from("submissions").select("id, status, job_request_id").in("job_request_id", requestIds)
        : Promise.resolve({ data: [], error: null }),
      requestIds.length
        ? supabase.from("shortlists").select("id, job_request_id, delivered_at").in("job_request_id", requestIds)
        : Promise.resolve({ data: [], error: null }),
      notificationRepo.countUnreadNotifications(userId),
    ]);

    const submissions = (submissionsRes.data as any[]) ?? [];
    const shortlists  = (shortlistsRes.data as any[]) ?? [];

    const byStatus = requests.reduce((acc: Record<string, number>, r: any) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    return c.json(successResponse("Employer dashboard loaded.", {
      summary: {
        total_requests: requests.length,
        total_submissions: submissions.length,
        total_evaluations: submissions.filter((s: any) => ["scored", "shortlisted"].includes(s.status)).length,
        total_shortlists_delivered: shortlists.filter((s: any) => s.delivered_at).length,
        unread_notifications: unreadCount,
        by_status: byStatus,
      },
      active_requests: requests.filter((r: any) => r.status === "published").slice(0, 5),
      recent_requests: requests.slice(0, 5),
    }));
  },

  async myRequests(c: Context) {
    const userId = c.get("userId");
    const { data, error } = await supabase
      .from("job_requests")
      .select(`
        id, title, role_type, role_level, status, challenge_cap,
        shortlist_size, deadline, deposit_amount, final_charge,
        published_at, created_at, updated_at,
        challenges(id, title)
      `)
      .eq("employer_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new InternalError(error.message);
    return c.json(successResponse("Job requests retrieved.", data ?? []));
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD (unchanged — original already uses parallel fetches correctly)
// ═══════════════════════════════════════════════════════════════════════════

export const AdminDashboard = {
  async overview(c: Context) {
    const [usersRes, requestsRes, submissionsRes, shortlistsRes, paymentsRes] = await Promise.all([
      supabase.from("users").select("id, role, is_verified, is_active, created_at"),
      supabase.from("job_requests").select("id, status, created_at"),
      supabase.from("submissions").select("id, status, triage_decision, submitted_at"),
      supabase.from("shortlists").select("id, delivered_at"),
      supabase.from("payments").select("id, status, amount, created_at"),
    ]);

    const users       = usersRes.data       ?? [];
    const requests    = requestsRes.data    ?? [];
    const submissions = submissionsRes.data ?? [];
    const shortlists  = shortlistsRes.data  ?? [];
    const payments    = paymentsRes.data    ?? [];

    const byRole = users.reduce((acc: Record<string, number>, u: any) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    }, {});

    const requestsByStatus = requests.reduce((acc: Record<string, number>, r: any) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    const totalRevenue = payments
      .filter((p: any) => p.status === "success")
      .reduce((s: number, p: any) => s + Number(p.amount), 0);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const evaluationsPerDay: Record<string, number> = {};
    days.forEach(d => (evaluationsPerDay[d] = 0));
    submissions
      .filter((s: any) => s.status === "scored" && s.submitted_at && new Date(s.submitted_at) >= sevenDaysAgo)
      .forEach((s: any) => {
        const d = new Date(s.submitted_at).getDay();
        const day = days[d === 0 ? 6 : d - 1];
        evaluationsPerDay[day] = (evaluationsPerDay[day] ?? 0) + 1;
      });

    return c.json(successResponse("Admin dashboard loaded.", {
      stats: {
        submissions_received: submissions.length,
        invalid_submissions: submissions.filter((s: any) => s.triage_decision === "invalid").length,
        evaluated_submissions: submissions.filter((s: any) => s.status === "scored").length,
        shortlists_delivered: shortlists.filter((s: any) => s.delivered_at).length,
      },
      users: {
        total: users.length,
        verified: users.filter((u: any) => u.is_verified).length,
        active: users.filter((u: any) => u.is_active).length,
        by_role: byRole,
      },
      requests: {
        total: requests.length,
        by_status: requestsByStatus,
      },
      payments: {
        total_revenue_ngn: totalRevenue,
        total_transactions: payments.length,
      },
      charts: {
        evaluations_per_day: days.map(d => ({ day: d, count: evaluationsPerDay[d] })),
        requests_overview: [
          { label: "Requests Closed", value: requestsByStatus["closed"] ?? 0 },
          { label: "Currently Open", value: requestsByStatus["published"] ?? 0 },
          { label: "In Evaluation", value: requestsByStatus["evaluating"] ?? 0 },
          { label: "Shortlisted", value: requestsByStatus["shortlisted"] ?? 0 },
        ],
      },
    }));
  },

  async listUsers(c: Context) {
    const role   = c.req.query("role");
    const search = c.req.query("search");
    let q = supabase
      .from("users")
      .select("id, email, role, first_name, last_name, is_verified, is_active, created_at, last_login")
      .order("created_at", { ascending: false });
    if (role)   q = q.eq("role", role);
    if (search) q = q.ilike("email", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new InternalError(error.message);
    return c.json(successResponse("Users retrieved.", data ?? []));
  },

  async toggleUserActive(c: Context) {
    const { userId } = c.req.param() as { userId: string };
    const { data: user, error: fetchError } = await supabase
      .from("users").select("id, is_active, email, role").eq("id", userId).maybeSingle();
    if (fetchError) throw new InternalError(fetchError.message);
    if (!user) throw new InternalError("User not found");

    if ((user as any).role === "system_admin") {
      throw new InternalError("Cannot deactivate a system admin account");
    }

    const { data, error } = await supabase
      .from("users")
      .update({ is_active: !(user as any).is_active, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("id, email, role, is_active").single();
    if (error) throw new InternalError(error.message);

    return c.json(successResponse(
      `User ${(data as any).is_active ? "activated" : "deactivated"} successfully.`,
      data,
    ));
  },

  async listAllRequests(c: Context) {
    const status = c.req.query("status");
    const search = c.req.query("search");
    let q = supabase.from("job_requests").select(`
      id, title, role_type, role_level, status, challenge_cap,
      shortlist_size, deadline, deposit_amount, published_at, created_at,
      users!employer_id(email, first_name, last_name),
      workspaces(company_name)
    `).order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    else q = q.neq("status", "draft");
    if (search) q = q.ilike("title", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new InternalError(error.message);
    return c.json(successResponse("All job requests retrieved.", data ?? []));
  },

  async listAllSubmissions(c: Context) {
    const status = c.req.query("status");
    let q = supabase.from("submissions").select(`
      id, status, triage_decision, total_score, submitted_at, scored_at,
      users!candidate_id(email, first_name, last_name),
      job_requests!job_request_id(title, role_type)
    `).order("submitted_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new InternalError(error.message);
    return c.json(successResponse("All submissions retrieved.", data ?? []));
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SHARED NOTIFICATIONS (unchanged)
// ═══════════════════════════════════════════════════════════════════════════

export const NotificationController = {
  async list(c: Context) {
    const userId = c.get("userId");
    const onlyUnread = c.req.query("unread") === "true";
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 100);
    const notifications = await notificationRepo.getUserNotifications(userId, limit, onlyUnread);
    return c.json(successResponse("Notifications retrieved.", {
      notifications,
      unread_count: notifications.filter((n: any) => !n.is_read).length,
    }));
  },

  async markRead(c: Context) {
    const userId = c.get("userId");
    const body = await c.req.json().catch(() => ({})) as any;
    const ids: string[] | undefined = body?.ids;
    await notificationRepo.markNotificationsRead(userId, ids);
    return c.json(successResponse(
      ids?.length ? `${ids.length} notification(s) marked as read.` : "All notifications marked as read.",
      null,
    ));
  },
};
