import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { username, admin } from "better-auth/plugins";
import db from "@repo/database";
import * as schema from "@repo/database/schema";
import { ensureBaseCurrency } from "@repo/services/currency";
import { linkContactsForNewUser } from "@repo/services/contacts";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.BETTER_AUTH_URL!, "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    // sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
    //   console.log(`[EMAIL VERIFICATION] User: ${user.email} → ${url}`);
    // },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [username(), admin({ defaultRole: "user", adminRoles: ["admin"] })],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          console.log(`User ${user.email} has been created`);
          try {
            // Bootstrap reference data first: USD must exist before any
            // transaction can reference it. Idempotent, so this is safe on every signup.
            await ensureBaseCurrency();

            // §15 — friends who joined: if existing users added this person
            // as a contact (by email/phone) before they signed up, link those
            // contacts to the real account now. Best-effort by design.
            const linked = await linkContactsForNewUser({
              newUserId: user.id,
              email: user.email ?? undefined,
              phoneE164:
                (user as { phoneNumber?: string | null }).phoneNumber ?? undefined,
            });
            if (linked > 0) {
              console.log(
                `Linked ${linked} contact(s) to new user ${user.email}`,
              );
            }
          } catch (err) {
            console.error(`Failed to bootstrap user ${user.email}:`, err);
          }
        },
      },
    },
  },
  advanced: {
    disableOriginCheck: true,
    disableCSRFCheck: true,
    trustedOrigins: ["http://localhost:3000", "http://localhost:8000"],
  },
});

export type Session = typeof auth.$Infer.Session;
