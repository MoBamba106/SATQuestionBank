"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBank } from "@/lib/store";

interface Command {
  id: string;
  label: string;
  description: string;
  category: string;
  action: () => void;
  icon?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { collections, getMistakes } = useBank();

  const commands: Command[] = [
    {
      id: "go-bank",
      label: "Go to Question Bank",
      description: "View all questions",
      category: "Navigation",
      icon: "📚",
      action: () => {
        router.push("/bank");
        setOpen(false);
      },
    },
    {
      id: "start-quiz",
      label: "Start Mixed Quiz",
      description: "Start a mixed practice quiz",
      category: "Quiz",
      icon: "🎯",
      action: () => {
        router.push("/quiz");
        setOpen(false);
      },
    },
    {
      id: "review-mistakes",
      label: "Review Mistakes",
      description: "Practice questions you got wrong",
      category: "Study",
      icon: "❌",
      action: () => {
        const mistakes = getMistakes();
        useBank.setState({ customQuizPool: mistakes.map((q) => q.id) });
        router.push("/quiz");
        setOpen(false);
      },
    },
    {
      id: "import-pdf",
      label: "Import PDF",
      description: "Import questions from PDF",
      category: "Data",
      icon: "📄",
      action: () => {
        router.push("/upload");
        setOpen(false);
      },
    },
    {
      id: "settings",
      label: "Settings",
      description: "App settings and preferences",
      category: "System",
      icon: "⚙️",
      action: () => {
        // TODO: Implement settings page
        alert("Settings page coming soon!");
        setOpen(false);
      },
    },
    {
      id: "analytics",
      label: "View Analytics",
      description: "See your progress and stats",
      category: "Analytics",
      icon: "📊",
      action: () => {
        router.push("/analytics");
        setOpen(false);
      },
    },
    {
      id: "bluebook",
      label: "Practice Tests (Bluebook)",
      description: "Official SAT practice tests",
      category: "Practice",
      icon: "📖",
      action: () => {
        router.push("/bluebook");
        setOpen(false);
      },
    },
  ];

  // Add dynamic collection commands
  const collectionCommands = collections.map((col) => ({
    id: `collection-${col.id}`,
    label: `Practice: ${col.name}`,
    description: `${col.questionIds.length} questions`,
    category: "Collections",
    icon: "📁",
    action: () => {
      useBank.setState({ customQuizPool: col.questionIds });
      router.push("/quiz");
      setOpen(false);
    },
  }));

  const allCommands = [...commands, ...collectionCommands];

  const filtered = allCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setSearch("");
        setSelectedIndex(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered, selectedIndex]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transform">
        <div className="rounded-lg border border-gray-700 bg-gray-900 shadow-2xl">
          {/* Input */}
          <div className="border-b border-gray-700 p-4">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full bg-transparent text-lg text-white outline-none placeholder:text-gray-500"
            />
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No commands found. Try a different search.
              </div>
            ) : (
              <div className="p-2">
                {filtered.map((cmd, idx) => (
                  <button
                    key={cmd.id}
                    onClick={() => cmd.action()}
                    className={`w-full rounded px-4 py-3 text-left transition-colors ${
                      idx === selectedIndex
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{cmd.icon}</span>
                        <div>
                          <div className="font-medium">{cmd.label}</div>
                          <div className="text-sm text-gray-400">{cmd.description}</div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{cmd.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 bg-gray-950 px-4 py-3 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="mr-4">↑↓ Navigate</span>
                <span className="mr-4">⏎ Execute</span>
                <span>Esc Close</span>
              </div>
              <div className="text-right">
                <kbd className="rounded bg-gray-800 px-2 py-1">Ctrl+K</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
