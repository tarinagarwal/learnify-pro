import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, PencilRuler, MessageSquare, Book, BookOpen } from 'lucide-react';
import { AlertDialog } from '../components/AlertDialog';
import { useAuthStore } from '../store/authStore';

interface DashboardStats {
  totalWhiteboards: number;
  totalResponses: number;
  totalNotebooks: number;
  totalNotebookPages: number;
}

interface Whiteboard {
  id: string;
  title: string;
  created_at: string;
  drawing_data: any[];
}

interface Notebook {
  id: string;
  title: string;
  created_at: string;
  whiteboards: {
    id: string;
  }[];
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalWhiteboards: 0,
    totalResponses: 0,
    totalNotebooks: 0,
    totalNotebookPages: 0
  });
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [showNewNotebookDialog, setShowNewNotebookDialog] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [newNotebookSize, setNewNotebookSize] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({ show: false, title: '', message: '', type: 'info' });
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { data: whiteboardsData, error: whiteboardsError } = await supabase
        .from('whiteboards')
        .select('*')
        .is('notebook_id', null)
        .order('created_at', { ascending: false });

      if (whiteboardsError) throw whiteboardsError;

      const { data: notebooksData, error: notebooksError } = await supabase
        .from('notebooks')
        .select(`
          *,
          whiteboards (
            id
          )
        `)
        .order('created_at', { ascending: false });

      if (notebooksError) throw notebooksError;

      const { count: responsesCount, error: responsesError } = await supabase
        .from('ai_responses')
        .select('*', { count: 'exact', head: true });

      if (responsesError) throw responsesError;

      const totalNotebookPages = notebooksData?.reduce((acc, nb) => 
        acc + (nb.whiteboards?.length || 0), 0) || 0;

      setWhiteboards(whiteboardsData || []);
      setNotebooks(notebooksData || []);
      setStats({
        totalWhiteboards: (whiteboardsData?.length || 0),
        totalResponses: responsesCount || 0,
        totalNotebooks: notebooksData?.length || 0,
        totalNotebookPages
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setAlert({
        show: true,
        title: 'Error',
        message: 'Failed to load dashboard data. Please try again.',
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
      const { data, error } = await supabase
        .from('whiteboards')
        .insert([{ 
          title: newBoardTitle.trim(),
          user_id: user.id,
          drawing_data: []
        }])
        .select()
        .single();

      if (error) throw error;

      setShowNewBoardDialog(false);
      setNewBoardTitle('');
      navigate(`/whiteboard?id=${data.id}&title=${encodeURIComponent(data.title)}`);
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

  const handleCreateNotebook = async () => {
    if (!newNotebookTitle.trim()) {
      setAlert({
        show: true,
        title: 'Invalid Title',
        message: 'Please enter a title for your notebook.',
        type: 'warning',
      });
      return;
    }

    if (!user) {
      setAlert({
        show: true,
        title: 'Authentication Error',
        message: 'You must be logged in to create a notebook.',
        type: 'error',
      });
      return;
    }

    try {
      const { data: notebook, error: notebookError } = await supabase
        .from('notebooks')
        .insert([{
          title: newNotebookTitle.trim(),
          user_id: user.id
        }])
        .select()
        .single();

      if (notebookError) throw notebookError;

      // Create initial whiteboards
      const whiteboards = Array.from({ length: newNotebookSize }, (_, i) => ({
        title: `Page ${i + 1}`,
        user_id: user.id,
        notebook_id: notebook.id,
        order_index: i,
        drawing_data: []
      }));

      const { error: whiteboardsError } = await supabase
        .from('whiteboards')
        .insert(whiteboards);

      if (whiteboardsError) throw whiteboardsError;

      setShowNewNotebookDialog(false);
      setNewNotebookTitle('');
      setNewNotebookSize(5);
      navigate(`/notebook/${notebook.id}`);
    } catch (error) {
      console.error('Error creating notebook:', error);
      setAlert({
        show: true,
        title: 'Error',
        message: 'Failed to create notebook. Please try again.',
        type: 'error',
      });
    }
  };

  const deleteWhiteboard = async (id: string) => {
    try {
      const { error } = await supabase
        .from('whiteboards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadDashboardData();
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

  const deleteNotebook = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notebooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting notebook:', error);
      setAlert({
        show: true,
        title: 'Error',
        message: 'Failed to delete notebook. Please try again.',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-200 min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-100 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <PencilRuler className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">Individual Whiteboards</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalWhiteboards}</p>
        </div>
        <div className="bg-gray-100 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <Book className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">Notebooks</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalNotebooks}</p>
        </div>
        <div className="bg-gray-100 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">Notebook Pages</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalNotebookPages}</p>
        </div>
        <div className="bg-gray-100 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">AI Responses</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalResponses}</p>
        </div>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your Notebooks</h2>
          <button
            onClick={() => setShowNewNotebookDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md"
          >
            <Plus className="w-5 h-5" />
            New Notebook
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notebooks.map((notebook) => (
            <div
              key={notebook.id}
              className="bg-gray-100 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{notebook.title}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/notebook/${notebook.id}`)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Book className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteNotebook(notebook.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Created: {new Date(notebook.created_at).toLocaleDateString()}
                </p>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">
                    {notebook.whiteboards?.length || 0} pages
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your Whiteboards</h2>
          <button
            onClick={() => setShowNewBoardDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white"
          >
            <Plus className="w-5 h-5" />
            New Whiteboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whiteboards.map((whiteboard) => (
            <div
              key={whiteboard.id}
              className="bg-gray-100 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{whiteboard.title}</h3>
                  <div className="flex items-center gap-2">
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
      </div>

      {showNewBoardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Whiteboard</h3>
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

      {showNewNotebookDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Notebook</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notebook Title
                </label>
                <input
                  type="text"
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  placeholder="Enter notebook title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Pages (max 25)
                </label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={newNotebookSize}
                  onChange={(e) => setNewNotebookSize(Math.min(25, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewNotebookDialog(false);
                  setNewNotebookTitle('');
                  setNewNotebookSize(5);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNotebook}
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