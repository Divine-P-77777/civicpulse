import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Civic History - CivicPulse",
  description: "Review your past legal consultations, analyses, and saved documents.",
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
