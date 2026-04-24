/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Hack51 — Centralized pricing & feature flags.
 *
 * Change pricing in ONE place. The constants are read at request time
 * (not module-load) so they pick up env overrides for staging tests.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Fixed admin setup fee charged on every published request.
 * Backend default: ₦800,000. Override with env ADMIN_FEE_NGN.
 */
export function getAdminFeeNgn(): number {
  const raw = process.env.ADMIN_FEE_NGN;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 800_000;
}

/**
 * Per-submission verification cost. Multiplied by `challenge_cap`
 * to compute the deposit at draft time.
 *
 * Backend default: ₦180,000. Override with env UNIT_PRICE_NGN.
 *
 * NOTE: The Figma shows ₦64,000 in one place and ~₦200,000 in another.
 *       Confirm with product before changing the default.
 */
export function getUnitPriceNgn(): number {
  const raw = process.env.UNIT_PRICE_NGN;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 180_000;
}

/**
 * Cost to unlock the full talent list (beyond the top-N shortlist).
 * Figma screen 14 shows ₦240,000.
 */
export function getFullListUnlockNgn(): number {
  const raw = process.env.FULL_LIST_UNLOCK_NGN;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 240_000;
}

/**
 * Compute the deposit for a draft request:
 *   admin_fee + cap × unit_price
 */
export function computeDeposit(challengeCap: number): {
  admin_fee: number;
  unit_price: number;
  deposit_amount: number;
} {
  const admin_fee = getAdminFeeNgn();
  const unit_price = getUnitPriceNgn();
  return {
    admin_fee,
    unit_price,
    deposit_amount: admin_fee + Math.max(0, challengeCap) * unit_price,
  };
}

// ─── Feature flags ───────────────────────────────────────────────────────────

/**
 * When true, the publish endpoint skips Paystack entirely and moves the
 * request straight to `published`. Use for QA / frontend integration testing.
 *
 * Default: ON in non-production environments. Force OFF by setting
 * SKIP_PAYMENT=false explicitly.
 */
export function isPaymentSkipped(): boolean {
  const flag = process.env.SKIP_PAYMENT;
  if (flag === "false") return false;     // explicit opt-out
  if (flag === "true") return true;       // explicit opt-in
  // default: skip in non-prod, enforce in prod
  return process.env.NODE_ENV !== "production";
}

/**
 * When true, registration responses include the OTP in the response body
 * AND a dev-only endpoint exists to fetch the latest OTP for an email.
 *
 * NEVER true in production. Forced OFF when NODE_ENV === "production".
 */
export function isDevMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const flag = process.env.DEV_MODE;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return process.env.NODE_ENV !== "production";  // default ON in non-prod
}
