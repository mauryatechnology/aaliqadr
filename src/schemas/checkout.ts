import { z } from "zod";
import { STATE_CODES } from "@/config/india";
import { PAYMENT_METHODS } from "@/lib/order-status";
import { SKU_RE } from "@/lib/sku";

/** Checkout input, shared by the form and the server actions (docs/05 §4). */

export const pincode = z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode");

/** Accepts 10 digits with optional +91 / 0 prefix and spaces; stores +91XXXXXXXXXX. */
export const phoneIN = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"))
  .transform((v) => `+91${v}`);

export const sku = z.string().regex(SKU_RE);

const cartLine = z.object({ sku, qty: z.number().int().min(1).max(5) }).strict();
/** A bag being viewed (may be empty). */
export const bagLines = z.array(cartLine).max(20);
/** A bag being checked out. */
export const cartLines = bagLines.min(1);

export const addressInput = z
  .object({
    fullName: z.string().trim().min(2, "Enter the recipient's name").max(80),
    phone: phoneIN,
    line1: z.string().trim().min(5, "Enter house / flat and street").max(120),
    line2: z.string().trim().max(120).optional().default(""),
    landmark: z.string().trim().max(80).optional().default(""),
    city: z.string().trim().min(2, "Enter the city").max(60),
    stateCode: z.enum(STATE_CODES, { message: "Choose a state" }),
    pincode,
  })
  .strict();

export const contactInput = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.email("Enter a valid email").trim().toLowerCase(),
    phone: phoneIN,
  })
  .strict();

export const quoteInput = z
  .object({
    lines: cartLines,
    method: z.enum(PAYMENT_METHODS),
    giftWrap: z.boolean(),
    stateCode: z.enum(STATE_CODES),
    couponCode: z.string().trim().max(32).optional(),
    email: z.string().trim().max(254).optional(),
  })
  .strict();

export const placeOrderInput = z
  .object({
    lines: cartLines,
    method: z.enum(PAYMENT_METHODS),
    giftWrap: z.boolean(),
    giftMessage: z
      .string()
      .trim()
      .max(200)
      .regex(/^[^<>]*$/, "No angle brackets, please")
      .optional()
      .default(""),
    hidePrice: z.boolean(),
    couponCode: z.string().trim().max(32).optional(),
    contact: contactInput,
    address: addressInput,
    expectedTotalP: z.number().int().nonnegative(),
    idempotencyKey: z.uuid(),
    saveAddress: z.boolean(),
  })
  .strict();

export const verifyPaymentInput = z
  .object({
    orderId: z.string().regex(/^AQ-\d{6,}$/),
    accessKey: z.string().min(10).max(64),
    razorpay_order_id: z.string().min(5).max(64),
    razorpay_payment_id: z.string().min(5).max(64),
    razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type AddressInput = z.infer<typeof addressInput>;
export type ContactInput = z.infer<typeof contactInput>;
