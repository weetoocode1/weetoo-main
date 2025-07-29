"use client";

import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";

export function RankingsSection() {
  return (
    <section className="py-12 sm:py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-blue-50 to-blue-100 dark:from-black dark:to-gray-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05),transparent_50%)]"></div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 px-4 py-1.5 text-sm">
            Top Performers
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Community Leaderboards
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4 sm:px-0">
            See who&apos;s leading the pack in different categories and get
            inspired to climb the ranks.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-slate-700/50">
            {/* Return Rate */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                    Return Rate
                  </h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">
                    Weekly Performance
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    rank: 1,
                    name: "Alex Chen",
                    value: "+95.0%",
                    change: "(+2.1%)",
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    rank: 2,
                    name: "Sarah Kim",
                    value: "+90.0%",
                    change: "(+1.8%)",
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    rank: 3,
                    name: "Mike Ross",
                    value: "+85.0%",
                    change: "(+1.5%)",
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    rank: 4,
                    name: "Emma Liu",
                    value: "+80.0%",
                    change: "(+1.2%)",
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    rank: 5,
                    name: "John Doe",
                    value: "+75.0%",
                    change: "(+0.9%)",
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                ].map((trader) => (
                  <div key={trader.rank} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        trader.rank === 1
                          ? "bg-yellow-500 text-black"
                          : trader.rank === 2
                          ? "bg-gray-400 text-black"
                          : trader.rank === 3
                          ? "bg-orange-500 text-black"
                          : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                      }`}
                    >
                      {trader.rank}
                    </div>
                    <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                        {trader.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-semibold text-sm ${trader.color}`}
                        >
                          {trader.value}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 text-xs">
                          {trader.change}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Virtual Money */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                    Virtual Money
                  </h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">
                    Total Holdings
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    rank: 1,
                    name: "David Park",
                    value: "$900K",
                    change: "(+$50K)",
                    color: "text-blue-600 dark:text-blue-400",
                  },
                  {
                    rank: 2,
                    name: "Lisa Wang",
                    value: "$800K",
                    change: "(+$40K)",
                    color: "text-blue-600 dark:text-blue-400",
                  },
                  {
                    rank: 3,
                    name: "Tom Smith",
                    value: "$700K",
                    change: "(+$35K)",
                    color: "text-blue-600 dark:text-blue-400",
                  },
                  {
                    rank: 4,
                    name: "Anna Lee",
                    value: "$600K",
                    change: "(+$30K)",
                    color: "text-blue-600 dark:text-blue-400",
                  },
                  {
                    rank: 5,
                    name: "Chris Wu",
                    value: "$500K",
                    change: "(+$25K)",
                    color: "text-blue-600 dark:text-blue-400",
                  },
                ].map((trader) => (
                  <div key={trader.rank} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        trader.rank === 1
                          ? "bg-yellow-500 text-black"
                          : trader.rank === 2
                          ? "bg-gray-400 text-black"
                          : trader.rank === 3
                          ? "bg-orange-500 text-black"
                          : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                      }`}
                    >
                      {trader.rank}
                    </div>
                    <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                        {trader.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-semibold text-sm ${trader.color}`}
                        >
                          {trader.value}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 text-xs">
                          {trader.change}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity XP */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                    Activity (XP)
                  </h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">
                    Monthly Points
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    rank: 1,
                    name: "Ryan Kim",
                    value: "9000 XP",
                    change: "(+500 XP)",
                    color: "text-purple-600 dark:text-purple-400",
                  },
                  {
                    rank: 2,
                    name: "Maya Patel",
                    value: "8000 XP",
                    change: "(+450 XP)",
                    color: "text-purple-600 dark:text-purple-400",
                  },
                  {
                    rank: 3,
                    name: "Jake Wilson",
                    value: "7000 XP",
                    change: "(+400 XP)",
                    color: "text-purple-600 dark:text-purple-400",
                  },
                  {
                    rank: 4,
                    name: "Zoe Chen",
                    value: "6000 XP",
                    change: "(+350 XP)",
                    color: "text-purple-600 dark:text-purple-400",
                  },
                  {
                    rank: 5,
                    name: "Alex Brown",
                    value: "5000 XP",
                    change: "(+300 XP)",
                    color: "text-purple-600 dark:text-purple-400",
                  },
                ].map((trader) => (
                  <div key={trader.rank} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        trader.rank === 1
                          ? "bg-yellow-500 text-black"
                          : trader.rank === 2
                          ? "bg-gray-400 text-black"
                          : trader.rank === 3
                          ? "bg-orange-500 text-black"
                          : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                      }`}
                    >
                      {trader.rank}
                    </div>
                    <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                        {trader.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-semibold text-sm ${trader.color}`}
                        >
                          {trader.value}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 text-xs">
                          {trader.change}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sponsored */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                    Sponsored
                  </h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">
                    Kor Coins
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    rank: 1,
                    name: "Kevin Lee",
                    value: "4500 coins",
                    change: "(++250)",
                    color: "text-orange-600 dark:text-orange-400",
                  },
                  {
                    rank: 2,
                    name: "Sophie Zhang",
                    value: "4000 coins",
                    change: "(++200)",
                    color: "text-orange-600 dark:text-orange-400",
                  },
                  {
                    rank: 3,
                    name: "Marcus Johnson",
                    value: "3500 coins",
                    change: "(++175)",
                    color: "text-orange-600 dark:text-orange-400",
                  },
                  {
                    rank: 4,
                    name: "Nina Rodriguez",
                    value: "3000 coins",
                    change: "(++150)",
                    color: "text-orange-600 dark:text-orange-400",
                  },
                  {
                    rank: 5,
                    name: "Oliver Kim",
                    value: "2500 coins",
                    change: "(++125)",
                    color: "text-orange-600 dark:text-orange-400",
                  },
                ].map((trader) => (
                  <div key={trader.rank} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        trader.rank === 1
                          ? "bg-yellow-500 text-black"
                          : trader.rank === 2
                          ? "bg-gray-400 text-black"
                          : trader.rank === 3
                          ? "bg-orange-500 text-black"
                          : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                      }`}
                    >
                      {trader.rank}
                    </div>
                    <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                        {trader.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-semibold text-sm ${trader.color}`}
                        >
                          {trader.value}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 text-xs">
                          {trader.change}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Followed */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
                <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                    Most Followed
                  </h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">
                    Social Ranking
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    rank: 1,
                    name: "Isabella Garcia",
                    value: "9K followers",
                    change: "(++500)",
                    color: "text-pink-600 dark:text-pink-400",
                  },
                  {
                    rank: 2,
                    name: "James Wilson",
                    value: "8K followers",
                    change: "(++450)",
                    color: "text-pink-600 dark:text-pink-400",
                  },
                  {
                    rank: 3,
                    name: "Aria Patel",
                    value: "7K followers",
                    change: "(++400)",
                    color: "text-pink-600 dark:text-pink-400",
                  },
                  {
                    rank: 4,
                    name: "Lucas Chen",
                    value: "6K followers",
                    change: "(++350)",
                    color: "text-pink-600 dark:text-pink-400",
                  },
                  {
                    rank: 5,
                    name: "Mia Thompson",
                    value: "5K followers",
                    change: "(++300)",
                    color: "text-pink-600 dark:text-pink-400",
                  },
                ].map((trader) => (
                  <div key={trader.rank} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        trader.rank === 1
                          ? "bg-yellow-500 text-black"
                          : trader.rank === 2
                          ? "bg-gray-400 text-black"
                          : trader.rank === 3
                          ? "bg-orange-500 text-black"
                          : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white"
                      }`}
                    >
                      {trader.rank}
                    </div>
                    <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                        {trader.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-semibold text-sm ${trader.color}`}
                        >
                          {trader.value}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 text-xs">
                          {trader.change}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
