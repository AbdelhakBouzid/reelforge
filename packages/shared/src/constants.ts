export const CREDIT_COSTS = {
  image: 1,
  video: 5,
} as const;

export const PAGINATION = {
  defaultPage: 1,
  pageSize: 10,
  adminPageSize: 25,
} as const;

export const TOKEN_TTL = {
  access: "15m",
  refresh: "30d",
} as const;

export const APP_NAME = "ReelForge";