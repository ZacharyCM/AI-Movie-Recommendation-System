"use client";

import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-3 flex justify-between items-center">
      <Link href="/browse" className="text-xl font-bold text-red-600">
        NetflixRecs
      </Link>
      <LogoutButton />
    </nav>
  );
}
