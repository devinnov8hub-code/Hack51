import { supabase } from "../config/supabase.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { ConflictError, NotFoundError, InternalError } from "../exceptions/errors.js";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  avatar_url: string | null;
  last_login: string | null;
  last_login_ip: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

function handleDbError(err: unknown, context: string): never {
  const msg = err instanceof Error ? err.message : String(err);

  // "fetch failed" = network issue reaching Supabase — surface a clear message
  if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
    throw new InternalError(
      `Cannot reach Supabase. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file. (${context})`
    );
  }

  throw new InternalError(`${context}: ${msg}`);
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error?.code === "PGRST116") return null; // no rows → not found, not an error
  if (error) handleDbError(new Error(error.message), "findUserByEmail");
  return data as UserRow;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) handleDbError(new Error(error.message), "findUserById");
  return data as UserRow;
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const existing = await findUserByEmail(input.email);
  if (existing) throw new ConflictError("An account with this email already exists", "EMAIL_EXISTS");

  const password_hash = await hashPassword(input.password);

  const { data, error } = await supabase
    .from("users")
    .insert({
      email: input.email.toLowerCase().trim(),
      password_hash,
      role: input.role,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      avatar_url: input.avatar_url ?? null,
      is_verified: false,
      is_active: true,
    })
    .select()
    .single();

  if (error) handleDbError(new Error(error.message), "createUser");
  return data as UserRow;
}

export async function validateUserPassword(user: UserRow, plainPassword: string): Promise<boolean> {
  return verifyPassword(plainPassword, user.password_hash);
}

export async function updateUserPassword(userId: string, newPlainPassword: string): Promise<void> {
  const password_hash = await hashPassword(newPlainPassword);
  const { error } = await supabase
    .from("users")
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) handleDbError(new Error(error.message), "updateUserPassword");
}

export async function markUserVerified(userId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) handleDbError(new Error(error.message), "markUserVerified");
}

export async function updateLastLogin(userId: string, ip?: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({
      last_login: new Date().toISOString(),
      last_login_ip: ip ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) handleDbError(new Error(error.message), "updateLastLogin");
}

export async function updateUserProfile(
  userId: string,
  fields: Partial<Pick<UserRow, "first_name" | "last_name" | "avatar_url">>
): Promise<UserRow> {
  const { data, error } = await supabase
    .from("users")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) handleDbError(new Error(error.message), "updateUserProfile");
  return data as UserRow;
}
