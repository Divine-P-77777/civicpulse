import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Draft Creation - CivicPulse",
  description: "Create professional legal drafts and contracts tailored to your needs with the help of AI.",
};

export default function DraftLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
