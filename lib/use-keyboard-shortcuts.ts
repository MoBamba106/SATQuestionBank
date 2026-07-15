import { useEffect } from "react";

export type KeyboardShortcutHandler = () => void;

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyboardShortcutHandler;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
};

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: "/",
    description: "Search",
    handler: () => {
      const event = new CustomEvent("openSearch");
      window.dispatchEvent(event);
    },
  },
  {
    key: "n",
    description: "Next Question",
    handler: () => {
      const event = new CustomEvent("nextQuestion");
      window.dispatchEvent(event);
    },
  },
  {
    key: "p",
    description: "Previous Question",
    handler: () => {
      const event = new CustomEvent("previousQuestion");
      window.dispatchEvent(event);
    },
  },
  {
    key: "f",
    description: "Flag/Favorite Question",
    handler: () => {
      const event = new CustomEvent("toggleFavorite");
      window.dispatchEvent(event);
    },
  },
  {
    key: " ",
    description: "Check Answer",
    handler: () => {
      const event = new CustomEvent("checkAnswer");
      window.dispatchEvent(event);
    },
  },
  {
    key: "a",
    description: "Select Answer A",
    handler: () => {
      const event = new CustomEvent("selectAnswer", { detail: "A" });
      window.dispatchEvent(event);
    },
  },
  {
    key: "b",
    description: "Select Answer B",
    handler: () => {
      const event = new CustomEvent("selectAnswer", { detail: "B" });
      window.dispatchEvent(event);
    },
  },
  {
    key: "c",
    description: "Select Answer C",
    handler: () => {
      const event = new CustomEvent("selectAnswer", { detail: "C" });
      window.dispatchEvent(event);
    },
  },
  {
    key: "d",
    description: "Select Answer D",
    handler: () => {
      const event = new CustomEvent("selectAnswer", { detail: "D" });
      window.dispatchEvent(event);
    },
  },
  {
    key: "k",
    ctrl: true,
    description: "Command Palette",
    handler: () => {
      const event = new CustomEvent("openCommandPalette");
      window.dispatchEvent(event);
    },
  },
];
