import React from "react";
import { X, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ResponseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  drawingData: any[];
  response?: string;
}

export const ResponseDialog: React.FC<ResponseDialogProps> = ({
  isOpen,
  onClose,
  drawingData,
  response,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!isOpen || !canvasRef.current || !drawingData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all paths
    if (Array.isArray(drawingData)) {
      drawingData.forEach((path) => {
        if (!path || !Array.isArray(path.points) || path.points.length < 2)
          return;

        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.slice(1).forEach((point: any) => {
          if (typeof point.x === "number" && typeof point.y === "number") {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.strokeStyle = path.color || "#000000";
        ctx.lineWidth = path.width || 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    }
  }, [isOpen, drawingData]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "whiteboard-snapshot.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 transform transition-all">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">AI Analysis</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
              title="Download snapshot"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="relative w-full aspect-[4/3] bg-white rounded-lg shadow-md overflow-hidden">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full h-full"
            />
          </div>
          <div className="prose prose-sm max-w-none overflow-y-auto max-h-[600px] p-4 bg-gray-50 rounded-lg">
            {response ? (
              <ReactMarkdown
                components={{
                  h3: ({ node, ...props }) => (
                    <h3
                      className="text-lg font-semibold text-gray-900 mb-2"
                      {...props}
                    />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong
                      className="font-semibold text-gray-900"
                      {...props}
                    />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-gray-300 pl-4 italic my-4"
                      {...props}
                    />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-4 space-y-1 mb-4" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol
                      className="list-decimal pl-4 space-y-1 mb-4"
                      {...props}
                    />
                  ),
                  //@ts-ignore
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code
                        className="bg-gray-100 rounded px-1 py-0.5 text-sm font-mono"
                        {...props}
                      />
                    ) : (
                      //@ts-ignore
                      <pre
                        className="bg-gray-100 rounded-md p-3 text-sm font-mono overflow-x-auto"
                        {...props}
                      />
                    ),
                }}
              >
                {response}
              </ReactMarkdown>
            ) : (
              <div className="text-center text-gray-500">
                No analysis available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
