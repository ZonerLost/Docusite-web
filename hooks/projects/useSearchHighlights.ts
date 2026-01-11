"use client";

import { useCallback, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import type { DocumentViewerHandle } from "@/types/documentViewer";

type SearchResults = { count: number; currentIndex: number };

export function useSearchHighlights(
  exportRef: RefObject<DocumentViewerHandle>
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults>({
    count: 0,
    currentIndex: 0,
  });

  const highlightSearchResults = useCallback(
    (query: string) => {
      const domRef = exportRef.current?.domRef;
      if (!domRef || !query.trim()) {
        const highlights = domRef?.querySelectorAll(".search-highlight");
        highlights?.forEach((highlight) => {
          const parent = highlight.parentNode;
          if (parent) {
            parent.replaceChild(
              document.createTextNode(highlight.textContent || ""),
              highlight
            );
            parent.normalize();
          }
        });
        setSearchResults({ count: 0, currentIndex: 0 });
        return;
      }

      const element = domRef;
      const textContent = element.textContent || "";
      const regex = new RegExp(
        `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi"
      );
      const matches = textContent.match(regex);

      if (!matches) {
        setSearchResults({ count: 0, currentIndex: 0 });
        return;
      }

      const existingHighlights = element.querySelectorAll(".search-highlight");
      existingHighlights.forEach((highlight) => {
        const parent = highlight.parentNode;
        if (parent) {
          parent.replaceChild(
            document.createTextNode(highlight.textContent || ""),
            highlight
          );
          parent.normalize();
        }
      });

      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
      }

      textNodes.forEach((textNode) => {
        const text = textNode.textContent || "";
        if (regex.test(text)) {
          const parent = textNode.parentNode;
          if (
            parent &&
            parent.nodeName !== "SCRIPT" &&
            parent.nodeName !== "STYLE"
          ) {
            const highlightedHTML = text.replace(
              regex,
              '<span class="search-highlight">$1</span>'
            );
            const wrapper = document.createElement("div");
            wrapper.innerHTML = highlightedHTML;

            while (wrapper.firstChild) {
              parent.insertBefore(wrapper.firstChild, textNode);
            }
            parent.removeChild(textNode);
          }
        }
      });

      setSearchResults({ count: matches.length, currentIndex: 1 });
    },
    [exportRef]
  );

  const onSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      highlightSearchResults(query);
    },
    [highlightSearchResults]
  );

  const navigate = useCallback(
    (direction: "next" | "prev") => {
      if (searchResults.count === 0) return;

      const highlights =
        exportRef.current?.domRef?.querySelectorAll(".search-highlight");
      if (!highlights) return;

      highlights.forEach((highlight) =>
        highlight.classList.remove("search-highlight-active")
      );

      let newIndex = searchResults.currentIndex;
      if (direction === "next") {
        newIndex = newIndex >= searchResults.count ? 1 : newIndex + 1;
      } else {
        newIndex = newIndex <= 1 ? searchResults.count : newIndex - 1;
      }

      if (highlights[newIndex - 1]) {
        highlights[newIndex - 1].classList.add(
          "search-highlight-active"
        );
        highlights[newIndex - 1].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      setSearchResults((prev) => ({ ...prev, currentIndex: newIndex }));
    },
    [exportRef, searchResults.count, searchResults.currentIndex]
  );

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    onSearchChange,
    navigate,
  };
}
