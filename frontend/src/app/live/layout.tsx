import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live AI Assistant - CivicPulse",
  description: "Talk to our AI assistant in real-time for instant legal guidance and rights awareness through voice and vision.",
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
