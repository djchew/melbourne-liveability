"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "mel-bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [isReady, setIsReady] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        setBookmarks(new Set(ids));
      }
    } catch (e) {
      console.error("Failed to load bookmarks from localStorage", e);
    }
    setIsReady(true);
  }, []);

  // Save to localStorage whenever bookmarks change
  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookmarks]));
    } catch (e) {
      console.error("Failed to save bookmarks to localStorage", e);
    }
  }, [bookmarks, isReady]);

  const toggle = (id: number) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isBookmarked = (id: number) => bookmarks.has(id);

  return { bookmarks, toggle, isBookmarked, isReady };
}
