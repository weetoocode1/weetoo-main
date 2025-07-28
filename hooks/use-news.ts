import { useState, useEffect, useRef, useCallback } from "react";
import {
  NewsArticle,
  FALLBACK_NEWS_ARTICLES,
} from "@/components/news/news-data";

interface NewsResponse {
  articles: NewsArticle[];
}

// Cache for storing fetched articles
const newsCache = new Map<
  string,
  { articles: NewsArticle[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Persistent storage for all articles across sessions
const PERSISTENT_CACHE_KEY = "weetoo-news-articles";

export function useNews(page: number = 1, limit: number = 100) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Load persistent articles from localStorage
  const loadPersistentArticles = (): NewsArticle[] => {
    // Temporarily disabled to test
    return [];
  };

  // Save articles to localStorage
  const savePersistentArticles = (newArticles: NewsArticle[]) => {
    // Temporarily disabled to test
    return;
  };

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const response = await fetch(`/api/news?page=${page}&limit=${limit}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: NewsResponse = await response.json();

      if (!isMountedRef.current) return; // Exit if component unmounted

      if (data.articles && data.articles.length > 0) {
        // For now, just use the API articles directly
        const uniqueArticles = data.articles;

        // Cache the successful response
        const cacheKey = `${page}-${limit}`;
        const now = Date.now();
        newsCache.set(cacheKey, { articles: uniqueArticles, timestamp: now });

        if (isMountedRef.current) {
          setArticles(uniqueArticles);
        }
      } else {
        // Use fallback data if API returns empty
        if (isMountedRef.current) {
          setArticles(FALLBACK_NEWS_ARTICLES);
        }
      }
    } catch (err) {
      // Only handle errors if component is still mounted
      if (!isMountedRef.current) return;

      console.error("Error fetching news:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch news");

      // Use fallback data on error
      setArticles(FALLBACK_NEWS_ARTICLES);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [page, limit]);

  useEffect(() => {
    // Reset mounted ref on mount
    isMountedRef.current = true;

    const cacheKey = `${page}-${limit}`;
    const cached = newsCache.get(cacheKey);
    const now = Date.now();

    // Check if we have valid cached data
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      if (isMountedRef.current) {
        setArticles(cached.articles);
        setLoading(false);
        setError(null);
      }
      return;
    }

    // Use the refetch function for initial load
    refetch();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [page, limit, refetch]);

  return { articles, loading, error, refetch };
}
