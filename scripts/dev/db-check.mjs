// Connectivity check: never prints the connection string.
import mongoose from "mongoose";
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const admin = mongoose.connection.db.admin();
  const hello = await admin.command({ hello: 1 });
  console.log("db:", mongoose.connection.db.databaseName, "| replicaSet:", hello.setName ?? "NONE (standalone)", "| version:", (await admin.serverInfo()).version);
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log("collections:", cols.map((c) => c.name).sort().join(", ") || "(none)");
} catch (e) {
  console.log("ERROR:", String(e.message).replace(/mongodb(\+srv)?:\/\/[^@\s]+@/g, "mongodb://***@"));
}
await mongoose.disconnect();
