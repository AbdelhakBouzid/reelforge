import {
  GenerationStatus,
  GenerationType,
  PaymentStatus,
  Role,
  SubscriptionStatus,
  type CreditPack,
  type Generation,
  type Payment,
  type Plan,
  type Subscription,
  type User,
} from "@prisma/client";

export function roleToWire(role: Role): "user" | "admin" {
  return role === Role.ADMIN ? "admin" : "user";
}

export function wireGenerationTypeToDb(type: "image" | "video"): GenerationType {
  return type === "video" ? GenerationType.VIDEO : GenerationType.IMAGE;
}

export function dbGenerationTypeToWire(type: GenerationType): "image" | "video" {
  return type === GenerationType.VIDEO ? "video" : "image";
}

export function wireGenerationStatusToDb(status: "queued" | "processing" | "succeeded" | "failed") {
  switch (status) {
    case "queued":
      return GenerationStatus.QUEUED;
    case "processing":
      return GenerationStatus.PROCESSING;
    case "succeeded":
      return GenerationStatus.SUCCEEDED;
    case "failed":
      return GenerationStatus.FAILED;
  }
}

export function dbGenerationStatusToWire(status: GenerationStatus): "queued" | "processing" | "succeeded" | "failed" {
  switch (status) {
    case GenerationStatus.QUEUED:
      return "queued";
    case GenerationStatus.PROCESSING:
      return "processing";
    case GenerationStatus.SUCCEEDED:
      return "succeeded";
    case GenerationStatus.FAILED:
      return "failed";
  }
}

export function billingSubStatusToDb(status: string): SubscriptionStatus {
  const normalized = status.toLowerCase();

  switch (normalized) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "canceled":
    case "cancelled":
      return SubscriptionStatus.CANCELED;
    case "incomplete":
    case "approval_pending":
      return SubscriptionStatus.INCOMPLETE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "unpaid":
    case "suspended":
    case "expired":
      return SubscriptionStatus.UNPAID;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

export function dbSubStatusToWire(status: SubscriptionStatus): string {
  return status.toLowerCase();
}

export function dbPaymentStatusToWire(status: PaymentStatus): string {
  return status.toLowerCase();
}

export function serializeUser(user: Pick<User, "id" | "email" | "name" | "role" | "createdAt">) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: roleToWire(user.role),
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeGeneration(generation: Generation) {
  return {
    id: generation.id,
    userId: generation.userId,
    type: dbGenerationTypeToWire(generation.type),
    prompt: generation.prompt,
    optionsJson:
      generation.optionsJson && typeof generation.optionsJson === "object"
        ? (generation.optionsJson as Record<string, unknown>)
        : null,
    status: dbGenerationStatusToWire(generation.status),
    costCredits: generation.costCredits,
    assetUrl: generation.assetUrl,
    thumbUrl: generation.thumbUrl,
    providerJobId: generation.providerJobId,
    errorMessage: generation.errorMessage,
    createdAt: generation.createdAt.toISOString(),
    updatedAt: generation.updatedAt.toISOString(),
  };
}

export function serializePlan(plan: Plan) {
  return {
    id: plan.id,
    name: plan.name,
    stripePriceId: plan.stripePriceId,
    monthlyCredits: plan.monthlyCredits,
    isActive: plan.isActive,
    createdAt: plan.createdAt.toISOString(),
  };
}

export function serializePack(pack: CreditPack) {
  return {
    id: pack.id,
    name: pack.name,
    credits: pack.credits,
    price: pack.price,
    stripePriceId: pack.stripePriceId,
    isActive: pack.isActive,
    createdAt: pack.createdAt.toISOString(),
  };
}

export function serializeSubscription(subscription: Subscription) {
  return {
    id: subscription.id,
    userId: subscription.userId,
    planId: subscription.planId,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubId: subscription.stripeSubId,
    status: dbSubStatusToWire(subscription.status),
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    createdAt: subscription.createdAt.toISOString(),
  };
}

export function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    userId: payment.userId,
    stripePaymentIntentId: payment.stripePaymentIntentId,
    stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
    amount: payment.amount,
    currency: payment.currency,
    status: dbPaymentStatusToWire(payment.status),
    createdAt: payment.createdAt.toISOString(),
  };
}
