"use client";
import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  code: string;
  onNodeClick?: (id: string, label: string) => void;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  code,
  onNodeClick,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code || !chartRef.current) return;

    mermaid.initialize({
      startOnLoad: false,
    });

    // render diagram
    mermaid.mermaidAPI.render(`mermaid-${Date.now()}`, code).then(({ svg }) => {
      if (chartRef.current) {
        chartRef.current.innerHTML = svg;

        // attach click events
        const nodeEls = chartRef.current.querySelectorAll<SVGGElement>(".node");
        nodeEls.forEach((el) => {
          const label = el.textContent?.trim() || "Unnamed Node";
          const id = el.id || label;

          el.style.cursor = "pointer";
          el.addEventListener("click", () => {
            if (onNodeClick) onNodeClick(id, label);
          });
        });
      }
    });
  }, [code, onNodeClick]);

  return (
    <div className="w-full overflow-x-scroll md:p-4 p-2">
      <div ref={chartRef} className="min-w-max" />
    </div>
  );
};

export default MermaidDiagram;
