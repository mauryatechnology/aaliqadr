import { describe, expect, it } from "vitest";
import { stateFromPincode } from "@/lib/pincode";

describe("stateFromPincode", () => {
  it.each([
    ["110001", "07"], // Delhi
    ["462001", "23"], // Bhopal
    ["400001", "27"], // Mumbai
    ["403001", "30"], // Panaji
    ["560001", "29"], // Bengaluru
    ["600001", "33"], // Chennai
    ["700001", "19"], // Kolkata
    ["160017", "04"], // Chandigarh
    ["248001", "05"], // Dehradun
    ["834001", "20"], // Ranchi
    ["492001", "22"], // Raipur
    ["781001", "18"], // Guwahati
    ["500001", "36"], // Hyderabad
  ])("%s → %s", (pin, code) => expect(stateFromPincode(pin)).toBe(code));

  it("ignores invalid input", () => {
    expect(stateFromPincode("012345")).toBeUndefined();
    expect(stateFromPincode("12345")).toBeUndefined();
  });
});
