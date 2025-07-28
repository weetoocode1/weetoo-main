import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Competition | Weetoo",
  description: "Join the investment competition to win amazing prizes.",
  keywords: ["investment", "competition", "trading", "prizes", "leaderboard"],
  openGraph: {
    title: "Investment Competition | Weetoo",
    description: "Join the investment competition to win amazing prizes.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OngoingEvents } from "@/components/competition/ongoing-events";
import { PastEvents } from "@/components/competition/past-events";

export default function InvestmentCompetition() {
  return (
    <div className="container flex flex-col gap-4 mx-auto py-4 pb-10">
      {/* Headings */}
      <div className="relative w-full overflow-hidden rounded-none border border-border bg-gradient-to-b from-purple-50/30 to-transparent dark:from-purple-950/30 dark:to-transparent">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-50/30 to-transparent dark:from-purple-950/30 dark:to-transparent"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent dark:via-purple-800"></div>
          <div className="relative px-4 pt-24 pb-12">
            <div className="container mx-auto max-w-3xl space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">
                  Investment Competition
                </h1>
                <p className="max-w-xl mx-auto text-neutral-600 dark:text-neutral-400">
                  Test your trading skills against other investors in our
                  investment competition. Climb the leaderboard and win amazing
                  prizes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ongoing">
        <TabsList className="flex items-center justify-start gap-4 border bg-transparent rounded-none w-full h-auto p-0 flex-wrap">
          <TabsTrigger
            value="ongoing"
            className="data-[state=active]:text-primary relative h-10 rounded-none border border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:shadow-none cursor-pointer"
          >
            Ongoing Events
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="data-[state=active]:text-primary relative h-10 rounded-none border border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:shadow-none cursor-pointer"
          >
            Past Event
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ongoing" className="py-4">
          <OngoingEvents />
        </TabsContent>
        <TabsContent value="past" className="py-4">
          <PastEvents />
        </TabsContent>
      </Tabs>
    </div>
  );
}
