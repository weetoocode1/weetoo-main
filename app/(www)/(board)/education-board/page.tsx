import { Metadata } from "next";
import { EducationBoardPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Education Board | Weetoo",
  description:
    "Explore the Education Board on Weetoo, where you can share and discover insights on education. Connect with experts and enthusiasts in a vibrant community.",
};

export default function EducationBoard() {
  return <EducationBoardPageClient />;
}
