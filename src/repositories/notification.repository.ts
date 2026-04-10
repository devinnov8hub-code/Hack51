import { supabase } from "../config/supabase.js";
import { InternalError } from "../exceptions/errors.js";

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function createNotification(input: {
  user_id: string;
  title: string;
  body: string;
  type?: string;
  metadata?: Record<string, unknown>;
}): Promise<NotificationRow> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: input.user_id,
      title: input.title,
      body: input.body,
      type: input.type ?? "info",
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw new InternalError(`Failed to create notification: ${error.message}`);
  return data as NotificationRow;
}

export async function getUserNotifications(
  userId: string,
  limit = 20,
  onlyUnread = false
): Promise<NotificationRow[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (onlyUnread) query = query.eq("is_read", false);
  const { data, error } = await query;
  if (error) throw new InternalError(`Failed to fetch notifications: ${error.message}`);
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  let query = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId);
  if (ids?.length) query = query.in("id", ids);
  const { error } = await query;
  if (error) throw new InternalError(`Failed to mark notifications: ${error.message}`);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw new InternalError(`Failed to count notifications: ${error.message}`);
  return count ?? 0;
}
