"use client";

import { useEffect, useState } from "react";
import { Achievement } from "@/lib/types";

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export function AchievementNotification({
  achievement,
  onDismiss,
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  if (!achievement || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-lg border border-yellow-600 bg-gradient-to-r from-yellow-900 to-yellow-800 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{achievement.icon || "🏆"}</div>
          <div>
            <h3 className="font-bold text-yellow-100">{achievement.title}</h3>
            <p className="text-sm text-yellow-200">{achievement.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
