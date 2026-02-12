"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "reset";

interface AuthFormProps {
  mode: AuthMode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/browse");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setSuccessMessage("Check your email for a confirmation link.");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
        if (error) throw error;
        setSuccessMessage("Check your email for a reset link.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "login"
      ? "Sign In"
      : mode === "signup"
        ? "Create Account"
        : "Reset Password";

  const buttonText =
    mode === "login"
      ? "Sign In"
      : mode === "signup"
        ? "Sign Up"
        : "Send Reset Link";

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md bg-slate-800 rounded-lg p-8 space-y-6"
    >
      <h2 className="text-2xl font-bold text-white text-center">{title}</h2>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded text-sm">
          {successMessage}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-slate-400 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        {mode !== "reset" && (
          <div>
            <label
              htmlFor="password"
              className="block text-sm text-slate-400 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition"
      >
        {loading ? "Loading..." : buttonText}
      </button>

      <div className="text-center text-sm text-slate-400 space-y-2">
        {mode === "login" && (
          <>
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-red-500 hover:text-red-400">
                Sign up
              </Link>
            </p>
            <p>
              <Link
                href="/reset-password"
                className="text-red-500 hover:text-red-400"
              >
                Forgot password?
              </Link>
            </p>
          </>
        )}
        {mode === "signup" && (
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-red-500 hover:text-red-400">
              Sign in
            </Link>
          </p>
        )}
        {mode === "reset" && (
          <p>
            Back to{" "}
            <Link href="/login" className="text-red-500 hover:text-red-400">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}
