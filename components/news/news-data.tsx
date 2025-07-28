export interface NewsArticle {
  id?: string;
  title: string;
  excerpt?: string;
  description: string;
  image?: string;
  link: string;
  pubDate: string;
  source: string;
  category?: string;
}

// Fallback data in case API fails
export const FALLBACK_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: "1",
    title:
      "Bitcoin Reaches New All-Time High as Institutional Adoption Accelerates",
    description:
      "Major financial institutions continue to embrace cryptocurrency, driving Bitcoin to unprecedented levels as regulatory clarity improves globally.",
    image:
      "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=2069&auto=format&fit=crop",
    link: "#",
    pubDate: "2 hours ago",
    source: "TokenPost",
    category: "Breaking News",
  },
  {
    id: "2",
    title: "Ethereum 2.0 Staking Rewards Hit Record High Amid Network Upgrades",
    description:
      "Ethereum validators are seeing unprecedented returns as the network continues its transition to proof-of-stake consensus mechanism.",
    image:
      "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2069&auto=format&fit=crop",
    link: "#",
    pubDate: "4 hours ago",
    source: "TokenPost",
    category: "Technology",
  },
];
