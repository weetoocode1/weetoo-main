import fs from "fs";
import path from "path";
import { TermsMarkdown } from "../terms/terms-markdown";

export default function PrivacyMarkdownServer() {
  const privacyPath = path.join(process.cwd(), "public", "privacy-policy.md");
  const privacy = fs.readFileSync(privacyPath, "utf-8");
  return <TermsMarkdown markdown={privacy} />;
}
