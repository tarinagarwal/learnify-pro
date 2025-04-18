"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, MessageCircle } from "lucide-react";

interface NewChatDialogProps {
  onChatCreated: (sessionId: string) => void;
}

export function NewChatDialog({ onChatCreated }: NewChatDialogProps) {
  const [title, setTitle] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateChat = async () => {
    try {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: session, error } = await supabase
        .from("chat_sessions")
        .insert([
          {
            user_id: user.id,
            title: title || "New Chat",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      onChatCreated(session.id);
      setIsOpen(false);
      setTitle("");
    } catch (error) {
      console.error("Error creating chat:", error);
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 border-purple-400 text-purple-400 hover:bg-purple-400/10 rounded-full"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-400" />
            Create New Chat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter chat title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreateChat()}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-400">
              Give your chat a descriptive name to help you find it later
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChat}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Chat"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
