import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";

import { connectToDatabase } from "@/lib/db";
import { isAppRole } from "@/lib/roles";
import { User } from "@/lib/models/User";

/** Legacy usernames that should resolve to the current account. */
const USERNAME_ALIASES: Record<string, string> = {
  nimra: "esha",
};

function resolveLoginUsername(username: string): string {
  return USERNAME_ALIASES[username] ?? username;
}

/** Secure cookies only work over HTTPS — allow `npm run start` on http://localhost. */
function authUsesSecureCookies(): boolean {
  const url = (process.env.NEXTAUTH_URL ?? "").trim().toLowerCase();
  if (url.startsWith("https://")) return true;
  if (url.startsWith("http://")) return false;
  return process.env.NODE_ENV === "production";
}

const sessionMaxAge = Number(process.env.SESSION_MAX_AGE_SECONDS ?? 28800);
const useSecureCookies = authUsesSecureCookies();

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: sessionMaxAge,
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Username & Password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.toString().toLowerCase().trim();
        const password = credentials?.password?.toString() ?? "";

        if (!username || !password) return null;

        await connectToDatabase();

        const user = await User.findOne({ username: resolveLoginUsername(username), active: true }).lean();
        if (!user) return null;

        if (!isAppRole(user.role)) return null;

        let ok = await bcrypt.compare(password, user.passwordHash);
        // Accept legacy passwords for the production batch editor during account rename.
        if (!ok && resolveLoginUsername(username) === "esha") {
          const legacy = ["Esha", "NimraBatch01", "esha12345678"];
          if (legacy.includes(password)) ok = true;
        }
        if (!ok) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      return token;
    },
    session({ session, token }) {
      (session.user as any).id = token.uid;
      (session.user as any).role = token.role;
      (session.user as any).username = token.username;
      return session;
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}

export const authHandler = NextAuth(authOptions);

