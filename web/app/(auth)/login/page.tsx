"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Manrope } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const errorCode = new URLSearchParams(window.location.search).get("error");

    if (!errorCode) {
      return;
    }

    const oauthErrorByCode: Record<string, string> = {
      google_oauth_denied: "Google sign in was canceled. Please try again.",
      google_oauth_state_invalid:
        "Google sign in could not be verified. Please try again.",
      google_oauth_not_configured:
        "Google sign in is not configured on this environment.",
      google_token_exchange_failed:
        "Unable to complete Google sign in. Please try again.",
      google_backend_login_failed:
        "Google account verified, but app login failed.",
      google_oauth_callback_error:
        "Google sign in failed due to an unexpected error.",
    };

    setErrorMessage(
      oauthErrorByCode[errorCode] ??
        "Unable to sign in with Google right now. Please try again.",
    );
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setErrorMessage("");
    setIsSubmitting(true);

    if (!email || !password) {
      setErrorMessage("Email and password are required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            message?: string;
            redirectPath?: string;
            user?: { role?: string };
          }
        | null;

      if (!response.ok || !payload?.success) {
        setErrorMessage(payload?.message ?? "Invalid email or password");
        return;
      }

      router.push(payload?.redirectPath ?? "/");
      router.refresh();
    } catch {
      setErrorMessage("Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className={`${manrope.className} h-screen w-full bg-[#f9f9f9] bg-[radial-gradient(#e2e2e2_1px,transparent_1px)] bg-[size:20px_20px] px-4 py-10`}
    >
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
        <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
          <div className="px-8 py-12 sm:px-12">
            <header className="mb-10 text-center">
              <Image src="/logo/main-logo.png" alt="CampusLink Logo" width={196} height={196} className="mx-auto mb-4" />
              {/* <h1 className="relative inline-block text-5xl font-extrabold tracking-tight text-[#003087]">
                CampusLink
                <span className="absolute -bottom-2 left-1/4 h-1 w-1/2 rounded-full bg-[#e6c364]" />
              </h1>
              <p className="mt-4 text-sm text-[#444652]">Academic Sovereign Gateway</p> */}
              <h1 className="text-2xl font-bold">Login</h1>
            </header>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#444652]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#747683]" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="student@aupp.edu.kh"
                    autoComplete="email"
                    required
                    className="h-12 rounded-lg border-transparent bg-[#f3f3f3] pl-12 pr-4 text-sm placeholder:text-[#c4c6d4] focus-visible:border-[#003087] focus-visible:ring-1 focus-visible:ring-[#003087] focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#444652]">
                    Password
                  </label>
                  <Link href="#" className="text-xs font-semibold text-[#003087] hover:text-[#755b00]">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#747683]" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="h-12 rounded-lg border-transparent bg-[#f3f3f3] pl-12 pr-11 text-sm placeholder:text-[#c4c6d4] focus-visible:border-[#003087] focus-visible:ring-1 focus-visible:ring-[#003087] focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#747683] transition-colors hover:text-[#1a1c1c]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-lg bg-[#003087] text-base font-semibold text-white shadow-[0_4px_14px_rgba(0,48,135,0.15)] transition-all hover:bg-[#001d59]"
                >
                  <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center py-1">
                <div className="h-px flex-1 bg-[#e2e2e2]" />
                <span className="mx-4 text-[10px] uppercase tracking-[0.16em] text-[#c4c6d4]">Or</span>
                <div className="h-px flex-1 bg-[#e2e2e2]" />
              </div>

              <Button
                asChild
                type="button"
                variant="outline"
                className="h-12 w-full rounded-lg border-[#c4c6d4] bg-white text-sm font-semibold text-[#1a1c1c] hover:bg-[#f3f3f3]"
              >
                <a href="/api/auth/google/start">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Sign in with Google</span>
                </a>
              </Button>

              <p className="text-center text-sm text-[#444652]">
                <span>Don&apos;t have an account? </span>
                <Link href="/register" className="font-semibold ml-1 text-[#003087] transition-colors hover:text-[#001d59]">
                  Create one
                </Link>
              </p>
            </form>
          </div>

          <footer className="flex items-center justify-center gap-6 border-t border-slate-200/70 bg-[#f3f3f3] px-8 py-5">
            <Link href="#" className="text-[10px] uppercase tracking-wider text-[#747683] transition-colors hover:text-[#1a1c1c]">
              Privacy Policy
            </Link>
            <Link href="#" className="text-[10px] uppercase tracking-wider text-[#747683] transition-colors hover:text-[#1a1c1c]">
              Terms of Service
            </Link>
            <Link href="#" className="text-[10px] uppercase tracking-wider text-[#747683] transition-colors hover:text-[#1a1c1c]">
              Support
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
