"use client";

import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNews } from "@/hooks/use-news";
import { ArrowRight, Calendar, Search, RefreshCw } from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useMemo, useState, useEffect } from "react";
import { type NewsArticle } from "./news-data";

// Enhanced News Card with improved design and 4-column layout
const NewsCard = memo(
  ({ article, index }: { article: NewsArticle; index: number }) => {
    return (
      <div className="group">
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-background hover:border-indigo-300 dark:hover:border-indigo-600 hover:-translate-y-1 h-full">
          {/* Image Section - Minimal padding and reduced spacing */}
          <div className="p-2">
            <div className="h-48 w-full relative overflow-hidden rounded-xl">
              {article.image ? (
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-2xl mb-2">📰</div>
                    <div className="text-xs font-medium">News</div>
                  </div>
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Source Badge Overlay */}
              <div className="absolute top-4 right-4">
                <Badge className="backdrop-blur-md shadow-lg text-xs font-semibold px-3 py-1.5 rounded-full">
                  {article.source}
                </Badge>
              </div>
            </div>
          </div>

          {/* Content Section - Minimal gap between image and content */}
          <div className="px-4 pb-4 pt-1 flex flex-col justify-between flex-grow">
            <div className="space-y-2">
              {/* Title - Fixed height and overflow issues */}
              <h3 className="text-base font-bold leading-tight text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2 h-[2.75rem]">
                {article.title}
              </h3>

              {/* Excerpt */}
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed h-[4.5rem]">
                {article.description}
              </p>
            </div>

            {/* Footer with Published Date and Read More */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              {/* Published Date */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{article.pubDate}</span>
              </div>

              {/* Read More Link */}
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 group/link hover:gap-3"
              >
                Read More
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
NewsCard.displayName = "NewsCard";

// Loading skeleton component
const LoadingSkeleton = memo(() => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="animate-pulse">
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-background h-full">
          <div className="p-2">
            <div className="h-48 w-full bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
          <div className="px-4 pb-4 pt-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
));
LoadingSkeleton.displayName = "LoadingSkeleton";

// Main News List Component
const NewsList = memo(() => {
  const [searchQuery, setSearchQuery] = useState("");
  const [lastArticleCount, setLastArticleCount] = useState(0);
  const [showNewArticlesNotification, setShowNewArticlesNotification] =
    useState(false);

  // Fetch news with faster refresh
  const {
    articles: allArticles,
    loading: apiLoading,
    error,
    refetch,
  } = useNews(1, 20);

  // Auto-refresh every 30 seconds to get new articles
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  // Check for new articles and show notification
  useEffect(() => {
    if (allArticles.length > lastArticleCount && lastArticleCount > 0) {
      setShowNewArticlesNotification(true);

      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setShowNewArticlesNotification(false);
      }, 5000);
    }
    setLastArticleCount(allArticles.length);
  }, [allArticles.length, lastArticleCount]);

  // Filter articles based on search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) {
      return allArticles;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allArticles.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(query))
    );

    return filtered;
  }, [searchQuery, allArticles]);

  // Simply show all available articles - no artificial limits
  const displayedArticles = filteredArticles;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleManualRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <section className="space-y-8">
      {/* Header with dynamic count */}
      <div className="border-b pb-4 mt-2 text-center sm:text-left">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Latest News</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-0.5">
              Stay updated with the latest cryptocurrency developments
            </p>
          </div>

          {/* Dynamic Article Count */}
          {!apiLoading && displayedArticles.length > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {displayedArticles.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {displayedArticles.length === 1 ? "Article" : "Articles"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Articles Notification */}
      {showNewArticlesNotification && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 dark:text-green-300 font-medium">
              {allArticles.length - lastArticleCount} new article
              {allArticles.length - lastArticleCount > 1 ? "s" : ""} added!
            </span>
          </div>
          <button
            onClick={() => setShowNewArticlesNotification(false)}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Search and Refresh Bar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search articles, tags, or content..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-12 h-12 border-gray-300 dark:border-gray-600 rounded-xl bg-background shadow-sm focus:shadow-md transition-shadow"
          />
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={apiLoading}
          className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors duration-200"
        >
          <RefreshCw
            className={`w-4 h-4 ${apiLoading ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Loading State */}
      {apiLoading && <LoadingSkeleton />}

      {/* Error State */}
      {error && !apiLoading && (
        <div className="text-center py-8 border border-red-200 dark:border-red-800 rounded-2xl bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Error loading news: {error}
          </p>
        </div>
      )}

      {/* No Results - Only show when not loading and no articles */}
      {!apiLoading && !error && filteredArticles.length === 0 && (
        <div className="text-center py-16 border border-gray-200 dark:border-gray-800 rounded-2xl bg-background">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "No articles available at the moment"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* News Grid */}
      {!apiLoading && !error && filteredArticles.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayedArticles.map((article, index) => (
              <NewsCard
                key={`${article.id || index}-${index}`}
                article={article}
                index={index}
              />
            ))}
          </div>

          {/* Real-time Article count */}
          {displayedArticles.length > 0 && (
            <div className="text-center text-sm text-muted-foreground mt-6">
              <span className="font-medium">Live:</span> Showing{" "}
              {displayedArticles.length}{" "}
              {displayedArticles.length === 1 ? "article" : "articles"}
              {allArticles.length > lastArticleCount &&
                lastArticleCount > 0 && (
                  <span className="text-green-600 dark:text-green-400 ml-2">
                    (+{allArticles.length - lastArticleCount} new)
                  </span>
                )}
            </div>
          )}
        </>
      )}
    </section>
  );
});

NewsList.displayName = "NewsList";

export { NewsList };
