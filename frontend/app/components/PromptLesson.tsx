"use client";

import RenderContent from "../components/RenderContent";
import { getFromDB, saveToDB } from "../helper/indexDB";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  LogOut,
} from "lucide-react";
import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import MermaidDiagram from "../helper/MermaidContentViewer";
import "../globals.css";
import { useRouter, useSearchParams } from "next/navigation";
import { playfair } from "../helper/fonts";

const enum MODEL {
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_OSS_20B_FREE = "gpt-oss-20b:free",
}

interface HistoryItem {
  _id: string;
  title: string;
  timestamp: number;
  mermaidDiagram: string;
  model_used: string;
  subtopics: string[];
}

function PromptLesson() {
  const [prompt, setPrompt] = useState("");
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [subtopicContent, setSubtopicContent] = useState("");
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const cachedNodesContent = useRef<Record<string, string>>({});
  const [mermaidCode, setMermaidCode] = useState("");
  const [model, setModel] = useState<MODEL | "">("");

  const searchParams = useSearchParams();
  const user_id = searchParams.get("user_id");
  const token = searchParams.get("token");
  const name = searchParams.get("name");
  const router = useRouter();

  const fetchSearchHistory = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/lessons?user_id=${user_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSearchHistory(response.data);
      setPrompt(response.data[response.data.length - 1]?.title || "");
      setMermaidCode(
        response.data[response.data.length - 1]?.mermaidDiagram || ""
      );
      setModel(response.data[response.data.length - 1]?.model_used || "");
    } catch (error) {
      console.error("Error fetching search history:", error);
    }
  };

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const handleHistoryClick = async (historyId: string) => {
    try {
      setLoading(true);

      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/lesson/${historyId}`
      );

      // Restore lesson title in the input
      if (data.title) setPrompt(data.title);

      // Restore diagram
      if (data.mermaidDiagram) {
        setMermaidCode(data.mermaidDiagram);
        setModel(data.model_used);
      } else {
        console.warn("No mermaidDiagram found in response:", data);
      }
    } catch (error) {
      console.error("Error fetching lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear the search history?")) {
      axios
        .delete(
          `${process.env.NEXT_PUBLIC_API_URL}/clear_history?user_id=${user_id}`
        )
        .then(() => {
          setSearchHistory([]);
        })
        .catch((error) => {
          console.error("Error clearing history:", error);
        });
    }
  };

  const handleDeleteHistory = (historyId: string) => {
    if (confirm("Are you sure you want to delete this search history?")) {
      axios
        .delete(
          `${process.env.NEXT_PUBLIC_API_URL}/clear/${historyId}?user_id=${user_id}`
        )
        .then(() => {
          setSearchHistory((prev) =>
            prev.filter((item) => item._id !== historyId)
          );
          setMermaidCode("");
        })
        .catch((error) => {
          console.error("Error deleting history:", error);
        });
    }
  };

  const handleNewChat = () => {
    setPrompt("");
    setMermaidCode("");
    setSubtopicContent("");
    setSelectedNode(null);
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
        `${process.env.NEXT_PUBLIC_API_URL}/subtopic`,
        {
          lesson_name: prompt,
          subtopic_name: label,
          model: model || "gpt-4o-mini",
        },
        { withCredentials: true }
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

  const handleLogout = async () => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/logout`,
        {},
        { withCredentials: true }
      );

      if (res.status === 200) {
        router.push("/");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="flex h-screen bg-black">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 320 : 60 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-zinc-900 text-white shadow-2xl border-r border-zinc-800 flex flex-col relative z-10"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <History className="text-blue-400" size={20} />
              <h2 className="font-semibold">Search History</h2>
            </motion.div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
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
            <div
              className="flex items-center gap-2 mb-8 cursor-pointer"
              onClick={handleNewChat}
            >
              <span className="bg-zinc-800 p-2 rounded-full hover:bg-zinc-700 transition-colors">
                <Plus size={16} />
              </span>
              <span>New chat</span>
            </div>
            {searchHistory.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-300">Recent searches</span>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {searchHistory.map((item: HistoryItem, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleHistoryClick(item._id)}
                      className="w-full p-3 text-left bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
                    >
                      <div className="text-sm truncate text-gray-200 flex items-center justify-between">
                        {item.title}
                        <span
                          className="hover:text-red-500 cursor-pointer"
                          onClick={() => handleDeleteHistory(item._id)}
                        >
                          <Trash2 size={15} />
                        </span>
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
        <div className="bg-zinc-800 border-b border-zinc-700 py-3 flex items-center">
          <div className="max-w-4xl text-center mx-auto">
            <h1 className="text-4xl bg-gradient-to-b from-blue-400 to-purple-500 bg-clip-text font-black tracking-tighter text-transparent mb-2 font-heading">
              Interactive Learning Dashboard
            </h1>
          </div>
          <div
            onClick={handleLogout}
            className="flex items-center bg-zinc-900 p-2 rounded-md border border-zinc-700 absolute right-4 gap-2 cursor-pointer"
          >
            <LogOut color="red" />
            <span className="text-white">Logout</span>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-zinc-800 border-b border-zinc-800 p-6 flex items-center justify-center">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                console.log(model);
                if (prompt.trim()) {
                  try {
                    setLoading(true);
                    const res = await axios.post(
                      `${process.env.NEXT_PUBLIC_API_URL}/lesson`,
                      { lesson_name: prompt, model: model, user_id },
                      { withCredentials: true }
                    );
                    if (res.data && res.data.mermaid_code) {
                      setMermaidCode(res.data.mermaid_code);
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
              <div className="relative flex items-center justify-between border border-zinc-700 px-2 rounded-xl">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Enter the lesson you want for quick revision..."
                  className="w-full pl-10 pr-4 py-3 outline-none transition-all bg-zinc-800 text-white"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as MODEL)}
                  name="model"
                  id="model"
                  className="px-2 py-1 border border-zinc-700 rounded-lg text-white bg-zinc-800 hover:bg-zinc-700 transition-colors ml-2"
                >
                  <option value="select model">Model</option>
                  <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                  <option value="openai/gpt-oss-20b:free">GPT-OSS</option>
                </select>
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
                <div className="text-center text-white">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-300">
                    Loading your learning diagram...
                  </p>
                </div>
              </motion.div>
            ) : mermaidCode.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-zinc-800 rounded-2xl shadow-xl border border-zinc-700 p-8"
              >
                <div className="mb-6">
                  <p className="text-gray-300">
                    Click on any node to explore detailed content and examples
                  </p>
                </div>
                <div className="border-2 border-dashed border-zinc-500 rounded-xl p-6 bg-gray-100">
                  <MermaidDiagram
                    code={mermaidCode}
                    onNodeClick={handleNodeClick}
                  />
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-gray-400 mt-16">
                <div className="text-lg">
                  <h1
                    className={`font-bold text-3xl capitalize mb-4 ${playfair.variable}`}
                  >
                    Welcome! {name}
                  </h1>
                  Start by entering a lesson topic above to generate an
                  interactive diagram.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
              className="bg-white text-black rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-zinc-700 p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
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
                    <div className="text-center text-gray-300">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-3"></div>
                      <p>Loading content...</p>
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
