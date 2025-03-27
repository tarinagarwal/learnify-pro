import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Send, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  user: {
    name: string;
  };
  userVote?: "upvote" | "downvote" | null;
}

interface Community {
  id: string;
  title: string;
  description: string;
  tags: string[];
  user: {
    name: string;
  };
}

export default function CommunityChat() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (communityId) {
      fetchCommunity();
      fetchMessages();
      subscribeToMessages();
      subscribeToVotes();
    }
  }, [communityId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchCommunity = async () => {
    try {
      const { data, error } = await supabase
        .from("communities_with_users")
        .select("*")
        .eq("id", communityId)
        .single();

      if (error) throw error;
      if (data) {
        setCommunity({
          ...data,
          user: {
            name: data.user_name,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching community:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messages, error } = await supabase
        .from("community_messages_with_users")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const messagesWithVotes = await Promise.all(
        (messages || []).map(async (message) => {
          const { data: vote } = await supabase
            .from("message_votes")
            .select("vote_type")
            .eq("message_id", message.id)
            .eq("user_id", user.id)
            .maybeSingle();

          return {
            ...message,
            user: {
              name: message.user_name,
            },
            userVote: vote?.vote_type || null,
          };
        })
      );

      setMessages(messagesWithVotes);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`messages:${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_messages",
          filter: `community_id=eq.${communityId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const subscribeToVotes = () => {
    const subscription = supabase
      .channel(`votes:${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_votes",
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleVote = async (
    messageId: string,
    voteType: "upvote" | "downvote"
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      if (message.userVote === voteType) {
        // Remove vote
        await supabase
          .from("message_votes")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
      } else {
        // Upsert vote
        await supabase.from("message_votes").upsert(
          {
            message_id: messageId,
            user_id: user.id,
            vote_type: voteType,
          },
          {
            onConflict: "message_id,user_id",
          }
        );
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !communityId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("community_messages").insert({
        community_id: communityId,
        user_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/community")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Communities
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>{community?.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {community?.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {community?.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </CardHeader>
          </Card>
        </div>

        <Card className="mb-4">
          <CardContent className="p-0">
            <ScrollArea className="h-[500px] p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex flex-col space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">
                        {message.user.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleVote(message.id, "upvote")}
                        className={`flex items-center gap-1 ${
                          message.userVote === "upvote"
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span className="text-xs">{message.upvotes}</span>
                      </button>
                      <button
                        onClick={() => handleVote(message.id, "downvote")}
                        className={`flex items-center gap-1 ${
                          message.userVote === "downvote"
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span className="text-xs">{message.downvotes}</span>
                      </button>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
