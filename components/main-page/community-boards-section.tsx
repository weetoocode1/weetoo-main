"use client";

import { TopPostsDisplay } from "@/components/board/top-posts-display";
import { Badge } from "@/components/ui/badge";
import { Post } from "@/types/post";
import { motion } from "motion/react";

interface CommunityBoardsSectionProps {
  boardData: {
    "free-board": Post[];
    "education-board": Post[];
    "profit-board": Post[];
  };
}

export function CommunityBoardsSection({
  boardData,
}: CommunityBoardsSectionProps) {
  // Free Board Images
  const freeBoardImages = [
    "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=400&q=80",
  ];
  // Education Board Images
  const educationBoardImages = [
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80",
  ];
  // Profit Board Images
  const profitBoardImages = [
    "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1461344577544-4e5dc9487184?auto=format&fit=crop&w=400&q=80",
  ];

  return (
    <section className="py-16 sm:py-24 md:py-32 relative bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05),transparent_50%)]"></div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 px-4 py-1.5 text-sm">
            Community Boards
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Trading Community
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4 sm:px-0">
            Join our vibrant community of traders and share your insights.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-2">
          {/* Free Board */}
          <TopPostsDisplay
            board="free-board"
            boardDisplayName="Free Board"
            badgeColor="bg-green-200 text-green-800 border border-green-300 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/25"
            badgeText="Public"
            demoImages={freeBoardImages}
            preloadedPosts={boardData["free-board"]}
          />

          {/* Education Board */}
          <TopPostsDisplay
            board="education-board"
            boardDisplayName="Education Board"
            badgeColor="bg-blue-200 text-blue-800 border border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25"
            badgeText="Learning"
            demoImages={educationBoardImages}
            preloadedPosts={boardData["education-board"]}
          />

          {/* Profit Board */}
          <TopPostsDisplay
            board="profit-board"
            boardDisplayName="Profit Board"
            badgeColor="bg-purple-200 text-purple-800 border border-purple-300 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/25"
            badgeText="Success"
            demoImages={profitBoardImages}
            preloadedPosts={boardData["profit-board"]}
          />
        </div>
      </div>
    </section>
  );
}
