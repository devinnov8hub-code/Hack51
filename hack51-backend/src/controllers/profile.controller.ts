import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import * as userRepo from "../repositories/user.repository.js";
import { verifyPassword } from "../utils/hash.js";
import { BadRequestError } from "../exceptions/errors.js";
import type { UpdateProfileInput } from "../dto/request.dto.js";

export const ProfileController = {
  async getProfile(c: Context) {
    const userId = c.get("userId");
    const user = await userRepo.findUserById(userId);
    if (!user) throw new BadRequestError("User not found");
    const { password_hash, ...safe } = user;
    return c.json(successResponse("Profile retrieved.", safe));
  },

  async updateProfile(c: Context) {
    const userId = c.get("userId");
    const body = getBody<UpdateProfileInput>(c);

    const user = await userRepo.findUserById(userId);
    if (!user) throw new BadRequestError("User not found");

    // Handle password change if provided
    if (body.new_password) {
      if (!body.old_password) {
        throw new BadRequestError("Current password is required to set a new password.", "OLD_PASSWORD_REQUIRED");
      }
      const valid = await verifyPassword(body.old_password, user.password_hash);
      if (!valid) throw new BadRequestError("Current password is incorrect.", "WRONG_PASSWORD");
      await userRepo.updateUserPassword(userId, body.new_password);
    }

    // Update profile fields
    const { old_password, new_password, ...profileFields } = body;
    if (Object.keys(profileFields).length > 0) {
      await userRepo.updateUserProfile(userId, profileFields);
    }

    const updated = await userRepo.findUserById(userId);
    const { password_hash, ...safe } = updated!;
    return c.json(successResponse("Profile updated.", safe));
  },
};
