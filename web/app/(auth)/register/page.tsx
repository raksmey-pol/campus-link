"use client";

import Link from "next/link";
import { Apple, ArrowRightToLine, Chrome, Eye, EyeOff, Facebook, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	return (
		<main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-300/70 via-sky-100/70 to-white px-4 py-10">
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.95),rgba(255,255,255,0))]" />
			<div className="pointer-events-none absolute left-1/2 top-[66%] h-72 w-[140%] -translate-x-1/2 rounded-[100%] border border-white/50" />
			<div className="pointer-events-none absolute left-1/2 top-[72%] h-80 w-[160%] -translate-x-1/2 rounded-[100%] border border-white/40" />

			<section className="relative mx-auto mt-20 w-full max-w-[22rem] rounded-[18px] border border-white/65 bg-white/70 p-5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.25)] backdrop-blur-lg">
				<div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
					<ArrowRightToLine className="h-4 w-4" />
				</div>

				<header className="text-center">
					<h1 className="text-[1.1rem] font-semibold text-slate-900">Create account</h1>
					<p className="mt-1 text-[11px] leading-relaxed text-slate-500">Start collaborating in CampusLink in seconds.</p>
				</header>

				<form className="mt-4 space-y-2.5">
					<label className="relative block">
						<Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
						<Input type="email" placeholder="Email" className="h-9 rounded-lg border-slate-200 bg-white/85 pl-9 text-xs" />
					</label>

					<label className="relative block">
						<Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
						<Input
							type={showPassword ? "text" : "password"}
							placeholder="Password"
							className="h-9 rounded-lg border-slate-200 bg-white/85 pl-9 pr-10 text-xs"
						/>
						<button
							type="button"
							onClick={() => setShowPassword((prev) => !prev)}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
							aria-label="Toggle password visibility"
						>
							{showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
						</button>
					</label>

					<label className="relative block">
						<Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
						<Input
							type={showConfirmPassword ? "text" : "password"}
							placeholder="Confirm password"
							className="h-9 rounded-lg border-slate-200 bg-white/85 pl-9 pr-10 text-xs"
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword((prev) => !prev)}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
							aria-label="Toggle confirm password visibility"
						>
							{showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
						</button>
					</label>

					<Button className="h-9 w-full rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800">
						Create Account
					</Button>
				</form>

				<p className="mt-3 text-center text-[10px] text-slate-400">or continue with</p>

				<div className="mt-2 flex items-center justify-center gap-3">
					<button type="button" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Continue with Google">
						<Chrome className="h-3.5 w-3.5" />
					</button>
					<button type="button" className="rounded-full p-1.5 text-sky-600 hover:bg-sky-50" aria-label="Continue with Facebook">
						<Facebook className="h-3.5 w-3.5" />
					</button>
					<button type="button" className="rounded-full p-1.5 text-slate-800 hover:bg-slate-100" aria-label="Continue with Apple">
						<Apple className="h-3.5 w-3.5" />
					</button>
				</div>

				<p className="mt-3 text-center text-[10px] text-slate-500">
					Already have an account?{" "}
					<Link href="/login" className="font-semibold text-slate-800 hover:underline">
						Sign in
					</Link>
				</p>
			</section>
		</main>
	);
}

