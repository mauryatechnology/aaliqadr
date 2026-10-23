import "server-only";
import { getSessionUser, hasRole, type Role, type SessionUser } from "@/server/auth";

/**
 * Page-level admin check. The layout's gate shows sign-in / no-access screens; every admin page
 * and query still checks for itself (defence in depth, docs/06 §3.2), returning null to deny.
 */
export async function adminUser(min: Role = "staff"): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return hasRole(user, min) ? user : null;
}
