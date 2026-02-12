import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Login - NetflixRecs",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
