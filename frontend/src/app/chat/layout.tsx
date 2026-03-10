import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat with AI Advocate - CivicPulse",
  description: "Get deep legal insights and document analysis through our AI chat interface. Secure, private, and powered by advanced RAG technology.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
