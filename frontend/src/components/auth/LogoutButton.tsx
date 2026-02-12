"use client";

import { useAuth } from "@/hooks/useAuth";

export default function LogoutButton() {
  const { signOut } = useAuth();

  return (
    <button
      onClick={signOut}
      className="text-sm text-slate-400 hover:text-white transition"
    >
      Sign Out
    </button>
  );
}
