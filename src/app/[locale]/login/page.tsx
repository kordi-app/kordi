import type { Metadata } from "next";
import { LoginPage } from "@/views/login";

export const metadata: Metadata = {
  title: "Login | Kordi",
};

export default function Page() {
  return <LoginPage />;
}
