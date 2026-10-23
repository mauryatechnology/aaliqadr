"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/** Browser auth client (same origin, so no baseURL is needed). */
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
