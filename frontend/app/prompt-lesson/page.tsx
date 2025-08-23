"use client";

import RenderContent from "../components/RenderContent";
import { getFromDB, saveToDB } from "../helper/indexDB";
import { motion, AnimatePresence } from "framer-motion";
import { X, History, Search, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import MermaidDiagram from "../helper/MermaidContentViewer";

function PromptLesson() {
  const [prompt, setPrompt] = useState("");
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [subtopicContent, setSubtopicContent] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const cachedNodesContent = useRef<Record<string, string>>({});
  // const [mermaidCode, setMermaidCode] = useState<string>("");

  const mermaidCode = `
    graph TD
      A[Start: Introduction to Integers] --> B{What are Integers?};
      B --> C[Definition & Real-World Examples];
      C --> D[Representing Integers on a Number Line];
      D --> E[Comparing & Ordering Integers];
      D --> F[Absolute Value];
      D --> G[Operations with Integers];
      G --> H[Addition of Integers];
      H --> H1[Adding with Same Signs];
      H --> H2[Adding with Different Signs];
      H --> I[Subtraction of Integers];
      I --> I1["Add the Opposite" Method];
      G --> J[Multiplication of Integers];
      J --> J1[Sign Rules: Plus Plus, Minus Minus, Plus Minus, Minus Plus];
      G --> K[Division of Integers];
      K --> K1[Sign Rules: Same as Multiplication];
      E --> L[Solving Real-World Problems];
      F --> L;
      I --> L;
      J --> L;
      K --> L;
      style A fill:#ADD8E6,stroke:#333,stroke-width:2px;
      style L fill:#90EE90,stroke:#333,stroke-width:2px;
  `;

  // Load search history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  const addToHistory = (searchTerm: string) => {
    if (searchTerm.trim() && !searchHistory.includes(searchTerm.trim())) {
      const newHistory = [searchTerm.trim(), ...searchHistory].slice(0, 10); // Keep only last 10 searches
      setSearchHistory(newHistory);
    }
  };

  const handleHistoryClick = (historyItem: string) => {
    setPrompt(historyItem);
  };

  const clearHistory = () => {
    setSearchHistory([]);
  };

  const handleNodeClick = async (id: string, label: string) => {
    setSelectedNode({ id, label });

    if (cachedNodesContent.current[label]) {
      setSubtopicContent(cachedNodesContent.current[label]);
      return;
    }

    const cacheKey = `subtopic-${id}-${label}`;
    const cachedData = await getFromDB(cacheKey);

    if (cachedData && cachedData.content.content) {
      const isCacheValid =
        Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000;
      if (isCacheValid) {
        setSubtopicContent(cachedData.content.content);
        cachedNodesContent.current[label] = cachedData.content.content;
        return;
      }
    }

    try {
      setLoadingContent(true);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/Integers/${label}`
      );
      setSubtopicContent(res.data.subtopic_content);

      cachedNodesContent.current[label] = res.data.subtopic_content;
      await saveToDB(cacheKey, {
        content: res.data.subtopic_content,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error fetching node details:", error);
      setSubtopicContent("⚠️ Failed to load content. Please try again.");
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 320 : 60 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-white shadow-2xl border-r border-gray-200 flex flex-col relative z-10"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <History className="text-blue-600" size={20} />
              <h2 className="font-semibold text-gray-800">Search History</h2>
            </motion.div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            {sidebarOpen ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>

        {/* Sidebar Content */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto p-4"
          >
            {searchHistory.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-600">Recent searches</span>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {searchHistory.map((item, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleHistoryClick(item)}
                      className="w-full p-3 text-left bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors border border-gray-100 hover:border-blue-200"
                    >
                      <div className="text-sm text-gray-700 truncate">
                        {item}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                <History size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No search history yet</p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 py-3">
          <div className="max-w-4xl text-center mx-auto">
            <h1 className="text-4xl bg-gradient-to-b from-blue-400 to-blue-700 bg-clip-text font-black tracking-tighter text-transparent mb-2 ">
              Interactive Learning Dashboard
            </h1>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (prompt.trim()) {
                  addToHistory(prompt);
                  try {
                    setLoading(true);
                    const res = await axios.post(
                      `${process.env.NEXT_PUBLIC_API_URL}/lesson/${prompt}`
                    );
                    if (res.data && res.data.mermaid_code) {
                      // setMermaidCode(res.data.mermaid_code);
                    }
                  } catch (error) {
                    console.error("Error:", error);
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="flex items-center gap-4"
            >
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Enter the lesson you want for quick revision..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || !prompt.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Explore"}
              </motion.button>
            </form>
          </div>
        </div>

        {/* Diagram Section */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-9xl mx-auto">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-64"
              >
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">
                    Loading your learning diagram...
                  </p>
                </div>
              </motion.div>
            ) : mermaidCode.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8"
              >
                <div className="mb-6">
                  <p className="text-gray-600">
                    Click on any node to explore detailed content and examples
                  </p>
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                  <MermaidDiagram
                    code={mermaidCode}
                    onNodeClick={handleNodeClick}
                  />
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-gray-500 mt-16">
                <p className="text-lg">
                  Start by entering a lesson topic above to generate an
                  interactive diagram.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-gray-200 p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <h2 className="text-2xl font-bold">{selectedNode.label}</h2>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-white hover:text-red-200 transition-colors p-1"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {loadingContent ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-32"
                  >
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-3"></div>
                      <p className="text-gray-600">Loading content...</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <RenderContent subtopicContent={subtopicContent} />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PromptLesson;
