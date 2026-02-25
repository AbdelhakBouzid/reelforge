import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[A-Z]/, "Password must include an uppercase character")
  .regex(/[a-z]/, "Password must include a lowercase character")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(2).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const generationTypeSchema = z.enum(["image", "video"]);
export const generationStatusSchema = z.enum([
  "queued",
  "processing",
  "succeeded",
  "failed",
]);

export const generationRequestSchema = z.object({
  prompt: z.string().min(3).max(500),
  options: z.record(z.string(), z.unknown()).optional().default({}),
});

export const generationListQuerySchema = z.object({
  type: generationTypeSchema.optional(),
  status: generationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const checkoutRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("subscription"),
    planId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("pack"),
    packId: z.string().min(1),
  }),
]);

export const updatePlanSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    monthlyCredits: z.coerce.number().int().min(1).max(100000).optional(),
    stripePriceId: z.string().min(3).max(255).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const updatePackSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    credits: z.coerce.number().int().min(1).max(100000).optional(),
    price: z.coerce.number().int().min(1).max(100000000).optional(),
    stripePriceId: z.string().min(3).max(255).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const accountProfileSchema = z.object({
  name: z.string().min(2).max(80),
});

export const accountPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type GenerationRequestInput = z.infer<typeof generationRequestSchema>;
export type GenerationListQueryInput = z.infer<typeof generationListQuerySchema>;
export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type UpdatePackInput = z.infer<typeof updatePackSchema>;