import React from "react";

function RenderContent({ subtopicContent }: { subtopicContent: string }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto space-y-3 text-gray-700 leading-relaxed">
      {subtopicContent}
    </div>
  );
}

export default RenderContent;
