import fs from "fs";
import path from "path";
import { TermsMarkdown } from "./terms-markdown";

export default function TermsMarkdownServer() {
  const termsPath = path.join(process.cwd(), "public", "terms-of-use.md");
  const terms = fs.readFileSync(termsPath, "utf-8");
  return <TermsMarkdown markdown={terms} />;
}
