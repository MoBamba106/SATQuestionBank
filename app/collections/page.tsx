"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBank } from "@/lib/store";
import Link from "next/link";

export default function CollectionsPage() {
  const router = useRouter();
  const { collections, addCollection, removeCollection, setCustomQuizPool } = useBank();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    addCollection(newCollectionName, newCollectionDesc);
    setNewCollectionName("");
    setNewCollectionDesc("");
    setShowCreateModal(false);
  };

  const startPractice = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (collection && collection.questionIds.length > 0) {
      setCustomQuizPool(collection.questionIds);
      router.push("/quiz");
    }
  };

  // Preset collections
  const presetCollections = [
    {
      id: "favorites",
      name: "⭐ Favorites",
      description: "Your favorite questions",
      icon: "⭐",
    },
    {
      id: "mistakes",
      name: "❌ Mistakes",
      description: "Questions you got wrong",
      icon: "❌",
    },
    {
      id: "hard-geometry",
      name: "📐 Hard Geometry",
      description: "Challenging geometry problems",
      icon: "📐",
    },
    {
      id: "teacher-review",
      name: "👨‍🏫 Teacher Review",
      description: "Questions for teacher review",
      icon: "👨‍🏫",
    },
    {
      id: "need-help",
      name: "🆘 Need Help",
      description: "Questions you need help with",
      icon: "🆘",
    },
    {
      id: "missed-twice",
      name: "🔄 Missed Twice",
      description: "Questions you missed twice",
      icon: "🔄",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">
            ← Back
          </Link>
          <h1 className="text-4xl font-bold text-white">Collections</h1>
          <p className="mt-2 text-gray-400">
            Organize your questions into custom collections
          </p>
        </div>

        {/* Create Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            + New Collection
          </button>
        </div>

        {/* User Collections */}
        {collections.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-bold text-white">Your Collections</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="group rounded-lg border border-gray-700 bg-gray-800/50 p-6 transition-all hover:border-blue-500 hover:bg-gray-800"
                >
                  <h3 className="text-lg font-semibold text-white">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p className="mt-2 text-sm text-gray-400">
                      {collection.description}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-gray-500">
                    📚 {collection.questionIds.length} questions
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => startPractice(collection.id)}
                      className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Practice
                    </button>
                    <button
                      onClick={() => removeCollection(collection.id)}
                      className="rounded bg-red-900/50 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preset Collections */}
        <div>
          <h2 className="mb-4 text-2xl font-bold text-white">Suggested Collections</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {presetCollections.map((preset) => (
              <div
                key={preset.id}
                className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 opacity-60 transition-all hover:opacity-100"
              >
                <div className="mb-3 text-3xl">{preset.icon}</div>
                <h3 className="text-lg font-semibold text-white">{preset.name}</h3>
                <p className="mt-2 text-sm text-gray-400">{preset.description}</p>
                <p className="mt-3 text-xs text-gray-500">Create to get started</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-white">Create Collection</h3>
            <input
              type="text"
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <textarea
              placeholder="Description (optional)"
              value={newCollectionDesc}
              onChange={(e) => setNewCollectionDesc(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreateCollection}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2 font-medium text-gray-300 transition-colors hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
