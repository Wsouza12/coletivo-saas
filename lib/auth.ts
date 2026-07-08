import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { lojista: true },
        });
        if (!user) return null;

        const senhaValida = await bcrypt.compare(password, user.password);
        if (!senhaValida) return null;

        if (user.role !== "ADMIN" && user.status !== "ACTIVE") {
          // bloqueia login de lojista PENDING ou SUSPENDED
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          lojistaId: user.lojista?.id ?? null,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // Login com Google é só para lojista — se o email já é de um ADMIN, bloqueia.
    // Se o email não existe ainda, cria conta de lojista já ativa com 3 dias de
    // teste grátis (mesma regra do cadastro normal pelo formulário).
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const existente = await prisma.user.findUnique({ where: { email: user.email } });
      if (existente) return existente.role === "LOJISTA";

      const senhaAleatoria = await bcrypt.hash(crypto.randomUUID(), 12);
      const acessoExpiraEm = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await prisma.user.create({
        data: {
          email: user.email,
          name: user.name ?? user.email,
          password: senhaAleatoria,
          role: "LOJISTA",
          status: "ACTIVE",
          lojista: { create: { storeName: user.name ?? user.email, acessoExpiraEm } },
        },
      });
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { lojista: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.lojistaId = dbUser.lojista?.id ?? null;
        }
        return token;
      }
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
});
