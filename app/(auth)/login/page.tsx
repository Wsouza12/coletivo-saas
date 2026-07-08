"use client";

import { useState } from "react";
import { APP_NAME } from "@/lib/brand";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setError("Credenciais inválidas");
      setLoading(false);
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();

    if (session?.user?.role === "ADMIN") {
      router.push("/admin/atacado");
    } else if (session?.user?.status === "PENDING") {
      router.push("/aguardando-aprovacao");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#EBEBEB] px-4 text-[#333333]">
      <div className="absolute top-0 left-0 w-full h-[320px] bg-[#FFE600] z-0" />

      <div className="relative z-10 w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-1.5 text-xl font-extrabold text-[#2D3277]">
          <svg className="size-6 text-[#2D3277]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
          </svg>
          <span>{APP_NAME}</span>
        </Link>

        <div className="rounded-md border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="mb-6 text-center text-xl font-semibold text-[#333]">Olá! Digite seu e-mail e senha</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#333] outline-none transition focus:border-[#3483FA] focus:ring-1 focus:ring-[#3483FA]"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#333] outline-none transition focus:border-[#3483FA] focus:ring-1 focus:ring-[#3483FA]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-sm bg-[#3483FA] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2968c8] disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div className="flex items-center gap-3 text-xs text-gray-400 my-2">
              <span className="h-px flex-1 bg-gray-200" />
              ou
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex items-center justify-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-[#333] transition hover:bg-gray-50"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.67-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Entrar com Google
            </button>

            <p className="text-center text-sm text-gray-500 mt-2">
              Não tem conta?{" "}
              <Link href="/register" className="font-semibold text-[#3483FA] hover:underline">
                Criar conta
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
