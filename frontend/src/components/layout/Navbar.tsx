"use client";

import Link from "next/link";
import { User } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-3 flex justify-between items-center">
      <Link href="/browse" className="text-xl font-bold text-red-600">
        NetflixRecs
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          className="text-slate-400 hover:text-white transition flex items-center gap-1 text-sm"
        >
          <User size={16} />
          <span>Profile</span>
        </Link>
        <LogoutButton />
      </div>
    </nav>
  );
}
