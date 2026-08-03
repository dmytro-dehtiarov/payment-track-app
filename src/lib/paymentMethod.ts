export const PAYMENT_METHODS = ["cash", "card", "bank_account"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
