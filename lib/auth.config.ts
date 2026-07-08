import type { NextAuthConfig } from "next-auth";

// Config compatível com Edge Runtime — sem Prisma/bcrypt, usada pelo middleware.
// lib/auth.ts estende isso adicionando o provider real (que precisa de Node.js).
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 }, // 1h — refresh fica no cookie httpOnly do NextAuth
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.status = user.status;
        token.lojistaId = user.lojistaId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role as "ADMIN" | "LOJISTA";
      session.user.status = token.status as "PENDING" | "ACTIVE" | "SUSPENDED";
      session.user.lojistaId = token.lojistaId as string | null;
      return session;
    },
  },
};
