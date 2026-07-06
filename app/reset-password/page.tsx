"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updatePassword = async () => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated successfully!");
      setTimeout(() => router.push("/login"), 1500);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl text-white font-bold mb-6">
          Reset Password
        </h1>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-neutral-800 rounded-lg border border-neutral-700 px-4 py-3 pr-12 text-white"
          />

          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <button
          onClick={updatePassword}
          disabled={loading}
          className="w-full mt-5 bg-violet-600 hover:bg-violet-500 rounded-lg py-3 text-white"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        {message && (
          <p className="text-center text-green-400 mt-4">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}