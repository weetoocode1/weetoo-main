import { Metadata } from "next";
import { FreeBoardPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Free Bulletin Board | Weetoo",
  description:
    "Explore the Free Bulletin Board on Weetoo, where you can share and discover insights on technology, finance, and more. Connect with experts and enthusiasts in a vibrant community.",
};

export default function FreeBoard() {
  return <FreeBoardPageClient />;
}
