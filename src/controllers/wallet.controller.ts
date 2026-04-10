import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import * as walletRepo from "../repositories/wallet.repository.js";

export const WalletController = {
  async adminWallet(c: Context) {
    const filter = c.req.query("filter") as "oldest" | "latest" | "successful" | "failed" | undefined;
    const [summary, transactions] = await Promise.all([
      walletRepo.getAdminWalletSummary(),
      walletRepo.getAdminTransactions(filter),
    ]);
    return c.json(successResponse("Wallet overview retrieved.", { ...summary, transactions }));
  },
};
