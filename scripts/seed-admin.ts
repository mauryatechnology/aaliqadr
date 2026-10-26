/**
 * Creates or updates the store owner's password account, and seeds starter coupons.
 *   SEED_ADMIN_PASSWORD='…' npm run db:seed:admin      (or run it and type the password)
 *
 * The owner is ADMIN_EMAIL. The password is never stored in the repository (plan.md S3);
 * it must be 12–128 characters. Only that one user's credential account is touched.
 */
import { createInterface } from "node:readline/promises";
import mongoose from "mongoose";
import { hashPassword } from "better-auth/crypto";

async function askPassword(): Promise<string> {
  if (process.env.SEED_ADMIN_PASSWORD) return process.env.SEED_ADMIN_PASSWORD;
  if (!process.stdin.isTTY) throw new Error("Set SEED_ADMIN_PASSWORD or run this in a terminal.");
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // Hide what is typed.
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
    if (s.includes("Password")) process.stdout.write(s);
  };
  const value = await rl.question("Password for the owner account (12+ characters): ");
  rl.close();
  process.stdout.write("\n");
  return value;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in environment.");
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email.includes("@")) throw new Error("ADMIN_EMAIL is not set in environment.");
  const plainPassword = await askPassword();
  if (plainPassword.length < 12 || plainPassword.length > 128) throw new Error("The password must be 12–128 characters.");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Failed to get MongoDB database instance.");

  const users = db.collection("user");
  const accounts = db.collection("account");
  const now = new Date();
  const existing = await users.findOne({ email });
  const userId = existing?._id ?? new mongoose.Types.ObjectId();
  if (existing) {
    await users.updateOne({ _id: userId }, { $set: { role: "owner", emailVerified: true, updatedAt: now } });
    console.log(`Updated ${email}: role owner.`);
  } else {
    await users.insertOne({ _id: userId, name: "Store owner", email, emailVerified: true, role: "owner", createdAt: now, updatedAt: now });
    console.log(`Created ${email} as owner.`);
  }
  await accounts.updateOne(
    { userId, providerId: "credential" },
    { $set: { accountId: String(userId), password: await hashPassword(plainPassword), updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  // A new password ends every existing session of this user.
  await db.collection("session").deleteMany({ userId: { $in: [userId, String(userId)] } });
  console.log(`Password set for ${email}; their other sessions were signed out.`);

  // Seed starter coupons if collection is empty
  const couponCollection = db.collection("coupons");
  const couponCount = await couponCollection.countDocuments();
  if (couponCount === 0) {
    const defaultCoupons = [
      {
        code: "WELCOME10",
        description: "10% off on your first astrology fragrance purchase",
        kind: "percent",
        valueBps: 1000, // 10%
        valueP: 0,
        maxDiscountP: 100000, // max ₹1000
        minSubtotalP: 149900, // min ₹1499
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        usageLimit: 1000,
        perCustomerLimit: 1,
        usedCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "AALIQADR",
        description: "Flat ₹500 off on zodiac signature orders above ₹2499",
        kind: "flat",
        valueBps: 0,
        valueP: 50000, // ₹500
        maxDiscountP: 50000,
        minSubtotalP: 249900, // min ₹2499
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        usageLimit: 500,
        perCustomerLimit: 1,
        usedCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "FREESHIP",
        description: "Complimentary express shipping across India",
        kind: "free_shipping",
        valueBps: 0,
        valueP: 0,
        maxDiscountP: 0,
        minSubtotalP: 99900,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        usageLimit: 0,
        perCustomerLimit: 3,
        usedCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await couponCollection.insertMany(defaultCoupons);
    console.log(`Seeded ${defaultCoupons.length} default promotion coupons.`);
  }

  console.log("Admin & initial commerce seed finished successfully.");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
