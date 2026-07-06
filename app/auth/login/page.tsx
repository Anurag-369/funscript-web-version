"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
const [resetLoading, setResetLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/");
    }
    setLoading(false);
  };
  const handleForgotPassword = async () => {
  if (!email) {
    setError("Please enter your email first.");
    return;
  }

  setResetLoading(true);
  setError("");
  setMessage("");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    setError(error.message);
  } else {
    setMessage("Password reset email sent! Check your inbox.");
  }

  setResetLoading(false);
};

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 rounded-2xl border border-neutral-800 p-8 flex flex-col gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-violet-400">🎬 FunScript</p>
          <p className="text-neutral-400 text-sm mt-1">
            {isSignUp ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 text-green-400 text-sm">
            {message}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500"
          />
          <div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && handleAuth()}
    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-violet-500"
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
  >
    {showPassword ? (
      // Eye Off
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 2.73 16.11 1 12c.73-1.73 1.8-3.3 3.1-4.6M9.9 4.24A11.76 11.76 0 0112 4c5 0 9.27 3.89 11 8a11.8 11.8 0 01-4.17 5.19M1 1l22 22"/>
      </svg>
    ) : (
      // Eye
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )}
  </button>
</div>
        </div>

        <button
          onClick={handleAuth}
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-500 rounded-lg py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          {loading ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
        </button>
        <div className="flex justify-end">
  <button
    type="button"
    onClick={handleForgotPassword}
    disabled={resetLoading}
    className="text-xs text-violet-400 hover:text-violet-300"
  >
    {resetLoading ? "Sending..." : "Forgot Password?"}
  </button>
</div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="text-neutral-500 text-xs">or</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>

        <button
          onClick={handleGoogle}
          className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg py-3 text-sm font-medium text-white transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-center text-neutral-500 text-sm">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp((s) => !s)}
            className="text-violet-400 hover:text-violet-300"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}