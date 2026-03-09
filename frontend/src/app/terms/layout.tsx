import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - CivicPulse",
  description: "Read the terms and conditions for using CivicPulse services.",
};


export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
