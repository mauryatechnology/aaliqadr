import mongoose from "mongoose";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in environment.");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Failed to get MongoDB database instance.");

  const email = "kuldeepmaurya4296@gmail.com".toLowerCase();
  const plainPassword = "Kuldeep@143";
  const hashedPassword = await hashPassword(plainPassword);

  const userCollection = db.collection("user");
  const accountCollection = db.collection("account");

  // Remove previous invalid record if any
  await userCollection.deleteMany({ email });
  await accountCollection.deleteMany({ accountId: { $exists: true }, providerId: "credential" });

  const userObjectId = new mongoose.Types.ObjectId();
  const accountObjectId = new mongoose.Types.ObjectId();

  await userCollection.insertOne({
    _id: userObjectId,
    name: "Kuldeep Maurya",
    email,
    emailVerified: true,
    role: "owner",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`Created admin user: ${email} (ID: ${userObjectId.toString()}) with role 'owner'`);

  await accountCollection.insertOne({
    _id: accountObjectId,
    userId: userObjectId,
    accountId: userObjectId.toString(),
    providerId: "credential",
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`Created credential account for ${email}`);

  // 3. Seed starter coupons if collection is empty
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
