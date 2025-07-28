export interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string | string[];
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
  };
  category:
    | "Strategy"
    | "Analysis"
    | "News"
    | "Discussion"
    | "Tips"
    | "Security";
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isHot?: boolean;
}

const freeBoardPosts: Post[] = [
  {
    id: "1",
    title: "Is Bitcoin Still a Good Investment in 2024?",
    excerpt:
      "Community discussion: Is Bitcoin still a safe bet or are there better opportunities?",
    content: `
<h2>Open Discussion</h2>
<p>What are your thoughts on Bitcoin's future? Is it still the king of crypto or are altcoins taking over?</p>
<ul>
  <li>Share your predictions for 2024</li>
  <li>What are the biggest risks?</li>
  <li>Are you holding, selling, or buying?</li>
</ul>
<p>Let's hear from everyone!</p>
`,
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    author: {
      id: "user11",
      name: "Priya Patel",
      username: "@priya_p",
      avatar: "https://randomuser.me/api/portraits/women/81.jpg",
      verified: false,
    },
    category: "Discussion",
    tags: ["Bitcoin", "Investment", "Community"],
    views: 12000,
    likes: 210,
    comments: 45,
    createdAt: "1 hour ago",
    updatedAt: "1 hour ago",
    isPinned: false,
    isHot: true,
  },
  {
    id: "2",
    title: "The Ultimate Guide to Yield Farming",
    excerpt:
      "Everything you need to know about providing liquidity to earn crypto rewards.",
    content: `
<h2>Yield Farming</h2>
<p>Yield farming is a strategy used in DeFi to earn rewards by providing liquidity to a liquidity pool.</p>
<ul>
  <li>Liquidity pools are created by smart contracts</li>
  <li>You provide liquidity by depositing tokens</li>
  <li>You earn rewards based on the pool's performance</li>
</ul>
<p>Let's dive deeper into yield farming!</p>
`,
    image: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80",
    ],
    author: {
      id: "user12",
      name: "Laura Smith",
      username: "@laura_s",
      avatar: "https://randomuser.me/api/portraits/women/34.jpg",
      verified: false,
    },
    category: "Tips",
    tags: ["Yield Farming", "Liquidity", "Crypto Rewards"],
    views: 8900,
    likes: 134,
    comments: 22,
    createdAt: "3 hours ago",
    updatedAt: "3 hours ago",
  },
  {
    id: "3",
    title: "Crypto Memes: Share Your Funniest Finds!",
    excerpt:
      "Lighten up the day with your favorite crypto memes. Laughter is the best medicine!",
    content: `
<h2>Crypto Meme Thread</h2>
<p>Share your funniest crypto memes with the community!</p>
<p>Let's see what everyone finds funny!</p>
`,
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    author: {
      id: "user13",
      name: "Sofia Rossi",
      username: "@sofia_r",
      avatar: "https://randomuser.me/api/portraits/women/81.jpg",
      verified: false,
    },
    category: "Discussion",
    tags: ["Memes", "Fun", "Community"],
    views: 6700,
    likes: 320,
    comments: 60,
    createdAt: "5 hours ago",
    updatedAt: "5 hours ago",
    isPinned: false,
    isHot: true,
  },
  {
    id: "4",
    title: "What Altcoins Are You Watching This Month?",
    excerpt: "Let's crowdsource the best altcoin picks for May 2024.",
    content: `
<h2>Altcoin Watchlist</h2>
<p>With the crypto market evolving rapidly, May 2024 is shaping up to be an exciting month for altcoin enthusiasts. Whether you're a seasoned trader or just starting out, keeping an eye on emerging projects and established coins alike can help you stay ahead of the curve.</p>

<p>Here are some key questions to consider as you build your watchlist:</p>
<ul>
  <li><strong>Which altcoins have shown strong momentum in Q1 and Q2?</strong></li>
  <li><strong>Are there any upcoming mainnet launches, partnerships, or major updates?</strong></li>
  <li><strong>What narratives are driving the market (AI, DeFi, Layer 2, Gaming, etc.)?</strong></li>
  <li><strong>How is the overall sentiment on Crypto Twitter and in major communities?</strong></li>
</ul>

<p>Some of the coins our community is buzzing about:</p>
<ul>
  <li><strong>Solana (SOL):</strong> With its blazing-fast transactions and growing DeFi ecosystem, Solana continues to attract both developers and investors.</li>
  <li><strong>Arbitrum (ARB):</strong> As Layer 2 solutions gain traction, Arbitrum's ecosystem is expanding with new dApps and liquidity incentives.</li>
  <li><strong>Injective (INJ):</strong> A favorite among DeFi traders, Injective is making waves with its cross-chain capabilities and innovative derivatives platform.</li>
  <li><strong>Pepe (PEPE):</strong> Meme coins are still alive and well! PEPE has captured the attention of risk-tolerant traders looking for the next big pump.</li>
  <li><strong>Render (RNDR):</strong> As AI and GPU computing become more important, Render's decentralized rendering network is gaining real-world adoption.</li>
</ul>

<p>Tips for building your own watchlist:</p>
<ol>
  <li>Look for coins with active development and transparent teams.</li>
  <li>Check for upcoming catalysts like exchange listings, protocol upgrades, or major partnerships.</li>
  <li>Balance your portfolio between high-conviction plays and speculative bets.</li>
  <li>Always do your own research (DYOR) and manage your risk!</li>
</ol>

<p>Community Question: <strong>What altcoins are you most excited about this month, and why?</strong> Share your picks, your reasoning, and any resources or charts you find helpful. Let's help each other discover hidden gems and avoid potential pitfalls!</p>

<p>Remember, the crypto market moves fast and volatility is the norm. Stay informed, stay safe, and happy trading!</p>
`,
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    author: {
      id: "user14",
      name: "Ahmed Zaki",
      username: "@ahmed_z",
      avatar: "https://randomuser.me/api/portraits/men/81.jpg",
      verified: false,
    },
    category: "Discussion",
    tags: ["Altcoins", "Watchlist", "Community"],
    views: 7400,
    likes: 180,
    comments: 33,
    createdAt: "7 hours ago",
    updatedAt: "7 hours ago",
    isPinned: false,
    isHot: false,
  },
  {
    id: "5",
    title: "How Do You Manage Crypto Taxes?",
    excerpt:
      "Tips and tools for tracking and reporting your crypto gains and losses.",
    content: `
<h2>Crypto Tax Tips</h2>
<p>What are your favorite tools and strategies for managing crypto taxes?</p>
<p>Let's share our best tips!</p>
`,
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    author: {
      id: "user15",
      name: "Emily Chen",
      username: "@emily_c",
      avatar: "https://randomuser.me/api/portraits/women/81.jpg",
      verified: true,
    },
    category: "Tips",
    tags: ["Taxes", "Compliance", "Tools"],
    views: 5300,
    likes: 99,
    comments: 12,
    createdAt: "10 hours ago",
    updatedAt: "10 hours ago",
    isPinned: false,
    isHot: false,
  },
  {
    id: "6",
    title: "How to Spot and Avoid Crypto Scams",
    excerpt:
      "Learn the red flags of common crypto scams to protect your assets.",
    content: `
<h2>Crypto Scam Red Flags</h2>
<p>What are the key red flags to look out for when dealing with crypto scams?</p>
<p>Let's learn together!</p>
`,
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    author: {
      id: "user16",
      name: "Mark Johnson",
      username: "@mark_j",
      avatar: "https://randomuser.me/api/portraits/men/81.jpg",
      verified: true,
    },
    category: "Security",
    tags: ["Scams", "Security", "DYOR"],
    views: 9200,
    likes: 250,
    comments: 45,
    createdAt: "1 day ago",
    updatedAt: "1 day ago",
    isPinned: false,
    isHot: true,
  },
  {
    id: "7",
    title: "What are your favorite crypto podcasts?",
    excerpt:
      "Looking for recommendations for the best crypto podcasts to follow.",
    content: `
<h2>Podcast Recommendations</h2>
<p>What are your favorite crypto podcasts?</p>
<p>Let's share our recommendations!</p>
`,
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    author: {
      id: "user17",
      name: "Chloe Dubois",
      username: "@chloe_d",
      avatar: "https://randomuser.me/api/portraits/women/81.jpg",
      verified: false,
    },
    category: "Discussion",
    tags: ["Podcast", "Learning", "Community"],
    views: 4100,
    likes: 88,
    comments: 19,
    createdAt: "2 days ago",
    updatedAt: "2 days ago",
    isPinned: false,
    isHot: false,
  },
];

const profitBoardPosts: Post[] = [
  {
    id: "1",
    title: "How I Turned $1,000 into $10,000 in 6 Months",
    excerpt:
      "A real profit journey: my strategy, mistakes, and what I learned.",
    content: `
<h2>Profit Story</h2>
<p>I started with $1,000 and focused on swing trading Ethereum and Solana. Here's my approach:</p>
<ul>
  <li>Used technical analysis for entries</li>
  <li>Kept a strict stop-loss</li>
  <li>Reinvested profits into high-conviction trades</li>
</ul>
<p>Biggest lesson: Don't let emotions drive your trades!</p>
`,
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
    author: {
      id: "user21",
      name: "Carlos Rivera",
      username: "@carlos_r",
      avatar: "https://randomuser.me/api/portraits/men/45.jpg",
      verified: true,
    },
    category: "Strategy",
    tags: ["Profit", "Journey", "Swing Trading"],
    views: 21000,
    likes: 540,
    comments: 120,
    createdAt: "2 hours ago",
    updatedAt: "2 hours ago",
    isPinned: true,
    isHot: true,
  },
  {
    id: "2",
    title: "From $1,000 to $50,000: My Crypto Journey",
    excerpt:
      "A detailed account of the strategies and trades that led to a 50x return.",
    content: `
<h2>The Beginning</h2>
<p>I started with $1,000 and focused on swing trading Ethereum and Solana. Here's my approach:</p>
<ul>
  <li>Used technical analysis for entries</li>
  <li>Kept a strict stop-loss</li>
  <li>Reinvested profits into high-conviction trades</li>
</ul>
<p>Biggest lesson: Don't let emotions drive your trades!</p>
`,
    image: [
      "https://images.unsplash.com/photo-1639152201335-a690967395d8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1639754391623-61f65d634960?auto=format&fit=crop&w=800&q=80",
    ],
    author: {
      id: "user22",
      name: "David Chen",
      username: "@david_c",
      avatar: "https://randomuser.me/api/portraits/men/33.jpg",
      verified: false,
    },
    category: "Analysis",
    tags: ["Profit", "Journey", "Altcoins"],
    views: 18000,
    likes: 410,
    comments: 80,
    createdAt: "4 hours ago",
    updatedAt: "4 hours ago",
  },
  // ... all other profit board posts
];

const educationBoardPosts: Post[] = [
  {
    id: "1",
    title: "Crypto 101: What is Blockchain?",
    excerpt:
      "A beginner-friendly guide to understanding blockchain technology.",
    content: `
<h2>What is Blockchain?</h2>
<p>Blockchain is a distributed ledger technology that underpins cryptocurrencies. It's secure, transparent, and decentralized.</p>
<ul>
  <li>Blocks store data</li>
  <li>Each block links to the previous one</li>
  <li>Network consensus keeps it secure</li>
</ul>
`,
    image:
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80",
    author: {
      id: "user31",
      name: "Mia Lee",
      username: "@mia_l",
      avatar: "https://randomuser.me/api/portraits/women/24.jpg",
      verified: true,
    },
    category: "Strategy",
    tags: ["Blockchain", "Beginner", "Guide"],
    views: 8000,
    likes: 190,
    comments: 30,
    createdAt: "2 hours ago",
    updatedAt: "2 hours ago",
    isPinned: true,
    isHot: true,
  },
  {
    id: "2",
    title: "How to Set Up a Crypto Wallet (Step-by-Step)",
    excerpt: "A simple tutorial for creating your first crypto wallet.",
    content: `
<h2>Wallet Setup Guide</h2>
<p>Setting up a crypto wallet is a crucial step in your crypto journey. Here's a step-by-step guide:</p>
<ol>
  <li>Choose a wallet provider</li>
  <li>Download and install the wallet app</li>
  <li>Create a new wallet</li>
  <li>Backup your wallet</li>
</ol>
<p>Let's get started!</p>
`,
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    author: {
      id: "user32",
      name: "David Kim",
      username: "@david_k",
      avatar: "https://randomuser.me/api/portraits/men/36.jpg",
      verified: false,
    },
    category: "Tips",
    tags: ["Wallet", "Tutorial", "Security"],
    views: 6700,
    likes: 120,
    comments: 18,
    createdAt: "4 hours ago",
    updatedAt: "4 hours ago",
  },
  // ... all other education board posts
];

export const BOARD_POSTS: Record<string, Post[]> = {
  "free-board": freeBoardPosts,
  "profit-board": profitBoardPosts,
  "education-board": educationBoardPosts,
};

freeBoardPosts.push(
  ...[
    {
      id: "8",
      title: "Best Crypto Exchanges in 2024?",
      excerpt: "Which exchanges do you trust for trading and why?",
      content: `<h2>Exchange Recommendations</h2><p>Share your favorite exchanges and what makes them stand out.</p>`,
      image:
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      author: {
        id: "user18",
        name: "Lucas Meyer",
        username: "@lucas_m",
        avatar: "https://randomuser.me/api/portraits/men/34.jpg",
        verified: false,
      },
      category: "Discussion" as const,
      tags: ["Exchanges", "Trading", "Security"],
      views: 5400,
      likes: 120,
      comments: 18,
      createdAt: "3 days ago",
      updatedAt: "3 days ago",
    },
    {
      id: "9",
      title: "Crypto FOMO Stories",
      excerpt: "Share your biggest FOMO moments in crypto!",
      content: `<h2>FOMO Moments</h2><p>We all have them. What was your biggest FOMO buy or sell?</p>`,
      image: [
        "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80",
      ],
      author: {
        id: "user19",
        name: "Anna Müller",
        username: "@anna_m",
        avatar: "https://randomuser.me/api/portraits/women/33.jpg",
        verified: false,
      },
      category: "Discussion" as const,
      tags: ["FOMO", "Stories", "Community"],
      views: 6200,
      likes: 140,
      comments: 25,
      createdAt: "4 days ago",
      updatedAt: "4 days ago",
    },
    {
      id: "10",
      title: "Favorite Crypto YouTubers?",
      excerpt: "Who do you watch for crypto news and analysis?",
      content: `<h2>YouTube Channels</h2><p>Drop your favorite crypto YouTubers and why you like them.</p>`,
      image:
        "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80",
      author: {
        id: "user20",
        name: "John Doe",
        username: "@john_d",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        verified: false,
      },
      category: "Tips" as const,
      tags: ["YouTube", "Learning", "News"],
      views: 4800,
      likes: 110,
      comments: 14,
      createdAt: "5 days ago",
      updatedAt: "5 days ago",
    },
    // ...add more posts up to id: "20" for demo, using only allowed category values
  ]
);

profitBoardPosts.push(
  ...[
    {
      id: "8",
      title: "Biggest Profit in a Single Day?",
      excerpt: "Share your best one-day profit story!",
      content: `<h2>One-Day Profits</h2><p>What was your biggest single-day gain and how did you do it?</p>`,
      image:
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80",
      author: {
        id: "user28",
        name: "Maria Lopez",
        username: "@maria_l",
        avatar: "https://randomuser.me/api/portraits/women/28.jpg",
        verified: true,
      },
      category: "News" as const,
      tags: ["Profit", "Day Trading", "Success"],
      views: 15500,
      likes: 410,
      comments: 90,
      createdAt: "3 days ago",
      updatedAt: "3 days ago",
    },
    {
      id: "9",
      title: "Worst Losses and Lessons Learned",
      excerpt:
        "Sometimes you win, sometimes you learn. Share your biggest lessons.",
      content: `<h2>Losses & Lessons</h2><p>What was your worst loss and what did you learn from it?</p>`,
      image: [
        "https://images.unsplash.com/photo-1465101178521-c1a9136a3b43?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80",
      ],
      author: {
        id: "user29",
        name: "Paul Smith",
        username: "@paul_s",
        avatar: "https://randomuser.me/api/portraits/men/29.jpg",
        verified: false,
      },
      category: "Discussion" as const,
      tags: ["Loss", "Lessons", "Trading"],
      views: 9900,
      likes: 210,
      comments: 40,
      createdAt: "4 days ago",
      updatedAt: "4 days ago",
    },
    {
      id: "10",
      title: "Best Altcoin for 2024?",
      excerpt: "Which altcoin do you think will outperform this year?",
      content: `<h2>Altcoin Picks</h2><p>Share your top altcoin for 2024 and why you believe in it.</p>`,
      image:
        "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80",
      author: {
        id: "user30",
        name: "Samantha Green",
        username: "@sam_g",
        avatar: "https://randomuser.me/api/portraits/women/30.jpg",
        verified: false,
      },
      category: "Analysis" as const,
      tags: ["Altcoin", "2024", "Analysis"],
      views: 8700,
      likes: 180,
      comments: 22,
      createdAt: "5 days ago",
      updatedAt: "5 days ago",
    },
    // ...add more posts up to id: "20" for demo, using only allowed category values
  ]
);

educationBoardPosts.push(
  ...[
    {
      id: "8",
      title: "What is Proof of Stake?",
      excerpt: "A simple explanation of PoS and how it works.",
      content: `<h2>Proof of Stake</h2><p>Learn how PoS secures blockchains and why it's important.</p>`,
      image:
        "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80",
      author: {
        id: "user38",
        name: "Olivia White",
        username: "@olivia_w",
        avatar: "https://randomuser.me/api/portraits/women/38.jpg",
        verified: false,
      },
      category: "Strategy" as const,
      tags: ["PoS", "Blockchain", "Education"],
      views: 7200,
      likes: 160,
      comments: 28,
      createdAt: "3 days ago",
      updatedAt: "3 days ago",
    },
    {
      id: "9",
      title: "Crypto Wallet Security Tips",
      excerpt: "How to keep your crypto safe from hackers.",
      content: `<h2>Wallet Security</h2><p>Best practices for keeping your crypto wallets secure.</p>`,
      image: [
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80",
      ],
      author: {
        id: "user39",
        name: "Ethan Brown",
        username: "@ethan_b",
        avatar: "https://randomuser.me/api/portraits/men/39.jpg",
        verified: true,
      },
      category: "Tips" as const,
      tags: ["Wallet", "Security", "Tips"],
      views: 6100,
      likes: 130,
      comments: 17,
      createdAt: "4 days ago",
      updatedAt: "4 days ago",
    },
    {
      id: "10",
      title: "What is a DAO?",
      excerpt: "A beginner's guide to Decentralized Autonomous Organizations.",
      content: `<h2>DAO Basics</h2><p>Learn what DAOs are and how they work in the crypto ecosystem.</p>`,
      image:
        "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80",
      author: {
        id: "user40",
        name: "Grace Lee",
        username: "@grace_l",
        avatar: "https://randomuser.me/api/portraits/women/40.jpg",
        verified: false,
      },
      category: "Discussion" as const,
      tags: ["DAO", "Beginner", "Guide"],
      views: 4800,
      likes: 110,
      comments: 14,
      createdAt: "5 days ago",
      updatedAt: "5 days ago",
    },
    // ...add more posts up to id: "20" for demo, using only allowed category values
  ]
);

// For every post in freeBoardPosts, profitBoardPosts, and educationBoardPosts, ensure all image and image[] values are valid Unsplash URLs.
freeBoardPosts.forEach((post) => {
  if (typeof post.image === "string" && !post.image.includes("unsplash.com")) {
    post.image =
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
  } else if (Array.isArray(post.image)) {
    post.image = post.image.map((img, idx) =>
      img.includes("unsplash.com")
        ? img
        : `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80&sig=${idx}`
    );
  }
});
profitBoardPosts.forEach((post) => {
  if (typeof post.image === "string" && !post.image.includes("unsplash.com")) {
    post.image =
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80";
  } else if (Array.isArray(post.image)) {
    post.image = post.image.map((img, idx) =>
      img.includes("unsplash.com")
        ? img
        : `https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80&sig=${idx}`
    );
  }
});
educationBoardPosts.forEach((post) => {
  if (typeof post.image === "string" && !post.image.includes("unsplash.com")) {
    post.image =
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80";
  } else if (Array.isArray(post.image)) {
    post.image = post.image.map((img, idx) =>
      img.includes("unsplash.com")
        ? img
        : `https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80&sig=${idx}`
    );
  }
});
