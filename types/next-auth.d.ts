import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "ADMIN" | "LOJISTA";
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    lojistaId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "LOJISTA";
      status: "PENDING" | "ACTIVE" | "SUSPENDED";
      lojistaId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "ADMIN" | "LOJISTA";
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    lojistaId: string | null;
  }
}
