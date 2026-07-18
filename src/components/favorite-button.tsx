"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { apiPost, mutateKey } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Star toggle backed by Postgres — favorites now survive refreshes
 * (the old app persisted 55 MB of questions into localStorage, which blew
 * the browser quota so favorites silently vanished).
 */
export function FavoriteButton({
  questionId,
  favorite,
  onChange,
  size = "md",
  className,
}: {
  questionId: string;
  favorite: boolean;
  onChange?: (fav: boolean) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const [fav, setFav] = React.useState(favorite);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => setFav(favorite), [favorite]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    const next = !fav;
    setFav(next); // optimistic
    onChange?.(next);
    setBusy(true);
    try {
      await apiPost("/api/favorites", { questionId, favorite: next });
      mutateKey("favorites");
      mutateKey("stats");
      if (next) toast.success("Added to favorites", { description: "Find them in Collections → Favorites" });
    } catch (err) {
      setFav(!next); // roll back
      onChange?.(!next);
      toast.error("Couldn't update favorite", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      title={fav ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "rounded-lg transition-all duration-150 hover:bg-[#f2ecdd] active:scale-90",
        size === "md" ? "p-2" : "p-1.5",
        className,
      )}
    >
      <Star
        className={cn(
          "transition-all duration-200",
          size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4",
          fav ? "fill-[#f2b73c] stroke-[#d9922e] drop-shadow-[0_1px_2px_rgba(217,146,46,0.4)]" : "stroke-[#a8a294]",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
