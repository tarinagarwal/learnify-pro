import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Clock, Trash2 } from "lucide-react";
import { useBlackboardStore } from "../store/blackboardStore";

interface Whiteboard {
  id: string;
  title: string;
  created_at: string;
  drawing_data: any[];
}

export const History: React.FC = () => {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { loadSavedWhiteboard } = useBlackboardStore();

  useEffect(() => {
    loadWhiteboards();
  }, []);

  const loadWhiteboards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("whiteboards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWhiteboards(data || []);
    } catch (error) {
      console.error("Error loading whiteboards:", error);
      alert("Error loading whiteboard history.");
    } finally {
      setLoading(false);
    }
  };

  const deleteWhiteboard = async (id: string) => {
    try {
      const { error } = await supabase
        .from("whiteboards")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setWhiteboards(whiteboards.filter((wb) => wb.id !== id));
    } catch (error) {
      console.error("Error deleting whiteboard:", error);
      alert("Error deleting whiteboard.");
    }
  };

  const viewWhiteboard = async (whiteboard: Whiteboard) => {
    await loadSavedWhiteboard(whiteboard.drawing_data);
    navigate(
      `/whiteboard?id=${whiteboard.id}&title=${encodeURIComponent(
        whiteboard.title
      )}`
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold mb-6">Whiteboard History</h2>

      {whiteboards.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No whiteboards yet
          </h3>
          <p className="text-gray-500">Start creating your first whiteboard!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whiteboards.map((whiteboard) => (
            <div
              key={whiteboard.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => viewWhiteboard(whiteboard)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    {whiteboard.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWhiteboard(whiteboard.id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Created:{" "}
                  {new Date(whiteboard.created_at).toLocaleDateString()}
                </p>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">
                    {whiteboard.drawing_data.length} strokes
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
