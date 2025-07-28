import { Metadata } from "next";
import PrivacyMarkdownServer from "./privacy-markdown-server";

export const metadata: Metadata = {
  title: "Privacy Policy | WEETOO",
  description: "Privacy Policy for WEETOO Trading",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center py-12 px-2">
      <div className="w-full max-w-4xl mx-auto bg-card rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-8 text-center">
          개인정보취급방침 (Privacy Policy)
        </h1>
        <PrivacyMarkdownServer />
      </div>
    </div>
  );
}
