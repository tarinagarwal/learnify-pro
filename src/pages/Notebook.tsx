import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, PencilRuler, ArrowLeft, ArrowRight, MoveVertical } from 'lucide-react';
import { AlertDialog } from '../components/AlertDialog';
import { useAuthStore } from '../store/authStore';

interface Whiteboard {
  id: string;
  title: string;
  created_at: string;
  order_index: number;
  drawing_data: any[];
  user_id: string;
  notebook_id: string;
}

interface Notebook {
  id: string;
  title: string;
  created_at: string;
}

export const Notebook: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [alert, setAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({ show: false, title: '', message: '', type: 'info' });
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      loadNotebookData();
    }
  }, [id]);

  const loadNotebookData = async () => {
    try {
      setLoading(true);
      const { data: notebookData, error: notebookError } = await supabase
        .from('notebooks')
        .select('*')
        .eq('id', id)
        .single();

      if (notebookError) throw notebookError;

      const { data: whiteboardsData, error: whiteboardsError } = await supabase
        .from('whiteboards')
        .select('*')
        .eq('notebook_id', id)
        .order('order_index', { ascending: true });

      if (whiteboardsError) throw whiteboardsError;

      setNotebook(notebookData);
      setWhiteboards(whiteboardsData || []);
    } catch (error) {
      console.error('Error loading notebook data:', error);
      setAlert({
        show: true,
        title: 'Error',
        message: 'Failed to load notebook data. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWhiteboard = async () => {
    if (!newBoardTitle.trim()) {
      setAlert({
        show: true,
        title: 'Invalid Title',
        message: 'Please enter a title for your whiteboard.',
        type: 'warning',
      });
      return;
    }

    if (!user) {
      setAlert({
        show: true,
        title: 'Authentication Error',
        message: 'You must be logged in to create a whiteboard.',
        type: 'error',
      });
      return;
    }

    try {
      const maxOrderIndex = Math.max(...whiteboards.map(w => w.order_index), -1);
      
      const { data, error } = await supabase
        .from('whiteboards')
        .insert([{
          title: newBoardTitle.trim(),
          user_id: user.id,
          notebook_id: id,
          order_index: maxOrderIndex + 1,
          drawing_data: []
        }])
        .select()
        .single();

      if (error) throw error;

      setShowNewBoardDialog(false);
      setNewBoardTitle('');
      loadNotebookData();
    } catch (error) {
      console.error('Error creating whiteboard:', error);
      setAlert({
        show: true,
        title: 'Error',
        message: 'Failed to create whiteboard. Please try again.',
        type: 'error',
      });
    }
  };

  const deleteWhiteboard = async (whiteboardId: string) => {
    try {
      const { error } = await supabase
        .from('whiteboards')
        .delete()
        .eq('id', whiteboardId);

      if (error) throw error;
      loadNotebookData();
    } catch (error) {
      console.error('Error deleting whiteboard:', error);
      setAlert({
        show: true,
        title: 'Error',
        message: 'Failed to delete whiteboard. Please try again.',
        type: 'error',
      });
    }
  };

  const moveWhiteboard = async (whiteboardId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = whiteboards.findIndex(w => w.id === whiteboardId);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= whiteboards.length) return;

      const updatedWhiteboards = [...whiteboards];
      const temp = updatedWhiteboards[currentIndex];
      updatedWhiteboards[currentIndex] = updatedWhiteboards[newIndex];
      updatedWhiteboards[newIndex] = temp;

      // Update order_index while preserving all other fields
      const updates = updatedWhiteboards.map((w, index) => ({
        id: w.id,
        user_id: w.user_id,
        notebook_id: w.notebook_id,
        title: w.title,
        drawing_data: w.drawing_data,
        order_index: index
      }));

      const { error } = await supabase
        .from('whiteboards')
        .upsert(updates, {
          onConflict: 'id'
        });

      if (error) throw error;
      loadNotebookData();
    } catch (error) {
      console.error('Error reordering whiteboards:', error);
      setAlert({
        show: true,
        title: 'Error',
        message: 'Failed to reorder whiteboards. Please try again.',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold">{notebook?.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setReordering(!reordering)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              reordering
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MoveVertical className="w-5 h-5" />
            {reordering ? 'Done Reordering' : 'Reorder Whiteboards'}
          </button>
          <button
            onClick={() => setShowNewBoardDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Add Whiteboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {whiteboards.map((whiteboard, index) => (
          <div
            key={whiteboard.id}
            className="bg-gray-100 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-900">
                  {whiteboard.title}
                </h3>
                <div className="flex items-center gap-2">
                  {reordering ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveWhiteboard(whiteboard.id, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded-full ${
                          index === 0
                            ? 'text-gray-300'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveWhiteboard(whiteboard.id, 'down')}
                        disabled={index === whiteboards.length - 1}
                        className={`p-1 rounded-full ${
                          index === whiteboards.length - 1
                            ? 'text-gray-300'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate(`/whiteboard?id=${whiteboard.id}&title=${encodeURIComponent(whiteboard.title)}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <PencilRuler className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteWhiteboard(whiteboard.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Created: {new Date(whiteboard.created_at).toLocaleDateString()}
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

      {showNewBoardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add New Whiteboard
            </h3>
            <input
              type="text"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              placeholder="Enter whiteboard title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewBoardDialog(false);
                  setNewBoardTitle('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWhiteboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
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
    </div>
  );
};