import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useBlackboardStore } from "../store/blackboardStore";
import { AlertDialog } from "./AlertDialog";
//@ts-ignore
import { ResponseDialog } from "./ResponseDialog";
import { generateResponse } from "../services/groq";
import {
  ArrowLeft,
  Save,
  Eraser,
  MessageSquare,
  History,
  Download,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Point {
  x: number;
  y: number;
}

interface DrawingData {
  points: Point[];
  color: string;
  width: number;
}

interface AIResponse {
  id: string;
  response_text: string;
  created_at: string;
}

export const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentWidth, setCurrentWidth] = useState(2);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const { drawingData, addStroke, clearDrawing } = useBlackboardStore();
  const [alert, setAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }>({ show: false, title: "", message: "", type: "info" });
  const [loading, setLoading] = useState(false);
  const [showResponseHistory, setShowResponseHistory] = useState(false);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [showResponseDialog, setShowResponseDialog] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const whiteboardId = searchParams.get("id");
  const whiteboardTitle = searchParams.get("title");

  useEffect(() => {
    if (!whiteboardId) {
      navigate("/dashboard");
      return;
    }

    // Load AI responses
    loadAIResponses();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    drawingData.forEach((stroke) => {
      if (!ctx) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      stroke.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    });
  }, [drawingData, whiteboardId, navigate]);

  const loadAIResponses = async () => {
    if (!whiteboardId) return;

    try {
      const { data, error } = await supabase
        .from("ai_responses")
        .select("*")
        .eq("whiteboard_id", whiteboardId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAiResponses(data || []);
    } catch (error) {
      console.error("Error loading AI responses:", error);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPoints((prev) => [...prev, { x, y }]);

    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (currentPoints.length > 0) {
      const lastPoint = currentPoints[currentPoints.length - 1];
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    if (currentPoints.length > 1) {
      addStroke({
        points: currentPoints,
        color: currentColor,
        width: currentWidth,
      });
    }
    setCurrentPoints([]);
  };

  const saveWhiteboard = async () => {
    if (!whiteboardId) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("whiteboards")
        .update({ drawing_data: drawingData })
        .eq("id", whiteboardId);

      if (error) throw error;

      setAlert({
        show: true,
        title: "Success",
        message: "Whiteboard saved successfully!",
        type: "success",
      });
    } catch (error) {
      console.error("Error saving whiteboard:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to save whiteboard. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAIResponse = async () => {
    if (!canvasRef.current || !whiteboardId) return;

    try {
      setLoading(true);
      const canvas = canvasRef.current;

      // Create a temporary canvas with white background
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      // Fill white background
      tempCtx.fillStyle = "white";
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Copy the drawing
      tempCtx.drawImage(canvas, 0, 0);

      const imageData = tempCanvas.toDataURL("image/png");
      const response = await generateResponse(imageData);

      const { error } = await supabase.from("ai_responses").insert([
        {
          whiteboard_id: whiteboardId,
          response_text: response,
        },
      ]);

      if (error) throw error;

      // Reload responses
      await loadAIResponses();

      setAlert({
        show: true,
        title: "AI Response",
        message: response,
        type: "info",
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to get AI response. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCanvas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Fill white background
    tempCtx.fillStyle = "white";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Copy the drawing
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement("a");
    link.download = `${whiteboardTitle || "whiteboard"}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl font-bold">
            {decodeURIComponent(whiteboardTitle || "")}
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={clearDrawing}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md"
              disabled={loading}
            >
              <Eraser className="w-5 h-5" />
              Clear
            </button>
            <button
              onClick={() => setShowResponseHistory(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md"
            >
              <History className="w-5 h-5" />
              Response History
            </button>
            <button
              onClick={downloadCanvas}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
            <button
              onClick={getAIResponse}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              disabled={loading}
            >
              <MessageSquare className="w-5 h-5" />
              Get AI Response
            </button>
            <button
              onClick={saveWhiteboard}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={loading}
            >
              <Save className="w-5 h-5" />
              Save
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="mb-4 flex items-center gap-4">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <input
              type="range"
              min="1"
              max="10"
              value={currentWidth}
              onChange={(e) => setCurrentWidth(parseInt(e.target.value))}
              className="w-32"
            />
          </div>
          <canvas
            ref={canvasRef}
            className="w-full h-[600px] border border-gray-300 rounded cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
          />
        </div>
      </div>

      {/* Response History Dialog */}
      {showResponseHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                AI Response History
              </h3>
              <button
                onClick={() => setShowResponseHistory(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {aiResponses.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No responses yet
                </p>
              ) : (
                <div className="space-y-6">
                  {aiResponses.map((response) => (
                    <div
                      key={response.id}
                      className="bg-gray-50 rounded-lg p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-sm text-gray-500">
                          {new Date(response.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none">
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
                              <ul
                                className="list-disc pl-4 space-y-1 mb-4"
                                {...props}
                              />
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
                                  className="bg-[#1e2837] rounded px-1 py-0.5 text-sm font-mono"
                                  {...props}
                                />
                              ) : (
                                //@ts-ignore
                                <pre
                                  className="bg-[#1e2837] rounded-md p-3 text-sm font-mono overflow-x-auto"
                                  {...props}
                                />
                              ),
                          }}
                        >
                          {response.response_text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={alert.show}
        onClose={() => setAlert({ ...alert, show: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />

      <ResponseDialog
        isOpen={showResponseDialog}
        onClose={() => setShowResponseDialog(false)}
        drawingData={drawingData}
      />
    </div>
  );
};
