import { Metadata } from "next";
import TermsMarkdownServer from "./terms-markdown-server";

export const metadata: Metadata = {
  title: "Terms of Use | WEETOO",
  description: "Terms of Service for WEETOO Trading",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center py-12 px-2">
      <div className="w-full max-w-4xl mx-auto bg-card rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-8 text-center">
          이용약관 (Terms of Use)
        </h1>
        <TermsMarkdownServer />
      </div>
    </div>
  );
}
