"use client";
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import RenderContent from "../components/RenderContent";
import { getFromDB, saveToDB } from "../helper/indexDB";

function PromptLesson() {
  const [prompt, setPrompt] = useState("");
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [subtopicContent, setSubtopicContent] = useState("");
  const cachedNodesContent = useRef<Record<string, string>>({});

  // later remove this - for now to reduce the api calls to the model i have used it as a hard coded value
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

  // Initialize mermaid once
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false });
  }, []);

  // Render Mermaid + bind click handlers
  useEffect(() => {
    if (mermaidCode && chartRef.current) {
      mermaid.mermaidAPI.render("testDiagram", mermaidCode).then(({ svg }) => {
        if (chartRef.current) {
          chartRef.current.innerHTML = svg;

          const nodeEls =
            chartRef.current.querySelectorAll<SVGGElement>(".node");
          nodeEls.forEach((el) => {
            const label = el.textContent?.trim() || "Unnamed Node";
            const id = el.id || label;

            el.style.cursor = "pointer";
            el.addEventListener("click", async () => {
              setSelectedNode({ id, label });

              // If already cached, show instantly
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
                  cachedNodesContent.current[label] =
                    cachedData.content.content;
                  return;
                }
              }

              // Otherwise fetch
              try {
                setLoadingContent(true);
                const res = await axios.post(
                  `${process.env.NEXT_PUBLIC_API_URL}/Integers/${label}`
                );

                setSubtopicContent(res.data.subtopic_content);

                // save in in-memory cache
                cachedNodesContent.current[label] = res.data.subtopic_content;

                // save in IndexedDB
                await saveToDB(cacheKey, {
                  content: res.data.subtopic_content,
                  timestamp: Date.now(),
                });
              } catch (error) {
                console.error("Error fetching node details:", error);
                setSubtopicContent(
                  "⚠️ Failed to load content. Please try again."
                );
              } finally {
                setLoadingContent(false);
              }
            });
          });
        }
      });
    }
  }, [mermaidCode, prompt]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/lesson/${prompt}`);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center flex-col gap-6 mt-6"
      >
        <input
          type="text"
          placeholder="Enter your prompt here"
          className="prompt-input p-2 bg-gray-200 rounded-md w-96"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          type="submit"
          className="prompt-submit bg-green-500 hover:bg-green-600 transition text-white p-2 rounded-md font-bold"
        >
          Submit
        </button>
      </form>

      {/* Mermaid diagram */}
      {loading ? (
        <div className="text-center mt-8">Loading...</div>
      ) : (
        <div className="flex items-center gap-4 justify-center mt-16 border-t border-gray-300 p-4 flex-row-reverse">
          <div ref={chartRef} className="mt-8 p-4 w-full" />
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl shadow-2xl p-6 max-w-3xl w-full"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedNode.label}
                </h2>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-500 hover:text-red-500 transition cursor-pointer"
                >
                  <X />
                </button>
              </div>

              {loadingContent ? (
                <div className="animate-pulse text-gray-400">
                  Loading content...
                </div>
              ) : (
                <RenderContent subtopicContent={subtopicContent} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PromptLesson;
