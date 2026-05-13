import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";

import { connectToDatabase } from "@/lib/db";
import { isAppRole } from "@/lib/roles";
import { User } from "@/lib/models/User";

const sessionMaxAge = Number(process.env.SESSION_MAX_AGE_SECONDS ?? 28800);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: sessionMaxAge,
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
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

        const user = await User.findOne({ username, active: true }).lean();
        if (!user) return null;

        if (!isAppRole(user.role)) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
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

