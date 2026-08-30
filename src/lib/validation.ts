import { z } from "zod";

export const clientTypeSchema = z.enum(["person", "kindergarten", "school"]);

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1),
  type: clientTypeSchema,
  contactInfo: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});

export const clientUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: clientTypeSchema.optional(),
  contactInfo: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional(),
});

export const invoiceCreateSchema = z.object({
  date: z.coerce.date(),
  amountMinor: z.number().int().positive(),
  description: z.string().trim().min(1).optional(),
});

export const invoiceUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  amountMinor: z.number().int().positive().optional(),
  description: z.string().trim().min(1).nullable().optional(),
});

export const paymentMethodSchema = z.enum(["cash", "card", "bank_account"]);

export const paymentCreateSchema = z.object({
  date: z.coerce.date(),
  amountMinor: z.number().int().positive(),
  description: z.string().trim().min(1).optional(),
  method: paymentMethodSchema,
  methodDetail: z.string().trim().min(1).optional(),
});

export const paymentUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  amountMinor: z.number().int().positive().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  method: paymentMethodSchema.optional(),
  methodDetail: z.string().trim().min(1).nullable().optional(),
});

export const turnoverQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  clientId: z.string().min(1).optional(),
});

export const settingsUpdateSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  currencySymbol: z.string().trim().min(1).optional(),
  language: z.enum(["ru", "en"]).optional(),
});
