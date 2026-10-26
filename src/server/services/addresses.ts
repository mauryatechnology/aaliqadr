import "server-only";
import { Types } from "mongoose";
import { db } from "@/server/db/connect";
import { Address, type AddressDoc } from "@/server/models/commerce";
import { stateName } from "@/config/india";
import type { AddressInput } from "@/schemas/checkout";

/** Saved addresses, shared by the account page and the admin (plan.md §5, §11). Max 10 each. */

export class AddressError extends Error {}
export const MAX_ADDRESSES = 10;

export type AddressDTO = AddressInput & { id: string; isDefault: boolean; state: string };

const toDTO = (a: AddressDoc & { _id: Types.ObjectId }): AddressDTO => ({
  id: String(a._id),
  fullName: a.fullName,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2 ?? "",
  landmark: a.landmark ?? "",
  city: a.city,
  stateCode: a.stateCode as AddressInput["stateCode"],
  pincode: a.pincode,
  isDefault: a.isDefault,
  state: stateName(a.stateCode),
});

export async function listAddresses(userId: string): Promise<AddressDTO[]> {
  await db();
  const rows = await Address.find({ userId }).sort({ isDefault: -1, updatedAt: -1 }).lean<(AddressDoc & { _id: Types.ObjectId })[]>();
  return rows.map(toDTO);
}

/** Creates (no id) or updates an address. The first one, or `makeDefault`, becomes the default. */
export async function saveAddress(userId: string, input: AddressInput, id?: string, makeDefault = false): Promise<string> {
  await db();
  if (id) {
    if (!Types.ObjectId.isValid(id)) throw new AddressError("Address not found.");
    const res = await Address.updateOne({ _id: id, userId }, { $set: input });
    if (!res.matchedCount) throw new AddressError("Address not found.");
    if (makeDefault) await setDefaultAddress(userId, id);
    return id;
  }
  const count = await Address.countDocuments({ userId });
  if (count >= MAX_ADDRESSES) throw new AddressError(`You can keep up to ${MAX_ADDRESSES} addresses. Delete one first.`);
  const doc = await Address.create({ ...input, userId, isDefault: count === 0 });
  if (makeDefault && count > 0) await setDefaultAddress(userId, String(doc._id));
  return String(doc._id);
}

export async function setDefaultAddress(userId: string, id: string) {
  await db();
  if (!Types.ObjectId.isValid(id) || !(await Address.exists({ _id: id, userId }))) throw new AddressError("Address not found.");
  await Address.updateMany({ userId, _id: { $ne: id } }, { $set: { isDefault: false } });
  await Address.updateOne({ _id: id, userId }, { $set: { isDefault: true } });
}

export async function deleteAddress(userId: string, id: string) {
  await db();
  if (!Types.ObjectId.isValid(id)) throw new AddressError("Address not found.");
  const gone = await Address.findOneAndDelete({ _id: id, userId }).lean<AddressDoc>();
  if (!gone) throw new AddressError("Address not found.");
  // Keep exactly one default while any address remains.
  if (gone.isDefault) {
    const next = await Address.findOne({ userId }).sort({ updatedAt: -1 });
    if (next) await Address.updateOne({ _id: next._id }, { $set: { isDefault: true } });
  }
}
