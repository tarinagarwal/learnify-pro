import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Plus, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Community {
  id: string;
  title: string;
  description: string;
  tags: string[];
  user: {
    name: string;
  };
  _count?: {
    messages: number;
  };
}

export default function Community() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [showNewCommunityDialog, setShowNewCommunityDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Form data for new community
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
  });

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from("communities_with_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get message counts for each community
      const communitiesWithCounts = await Promise.all(
        (data || []).map(async (community) => {
          const { count } = await supabase
            .from("community_messages")
            .select("*", { count: "exact", head: true })
            .eq("community_id", community.id);

          return {
            ...community,
            user: {
              name: community.user_name,
            },
            _count: {
              messages: count || 0,
            },
          };
        })
      );

      setCommunities(communitiesWithCounts);
    } catch (error) {
      console.error("Error fetching communities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const { data, error } = await supabase
        .from("communities")
        .insert([
          {
            title: formData.title,
            description: formData.description,
            tags,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setShowNewCommunityDialog(false);
      setFormData({ title: "", description: "", tags: "" });
      fetchCommunities();
    } catch (error) {
      console.error("Error creating community:", error);
    }
  };

  const filteredCommunities = communities.filter(
    (community) =>
      community.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowNewCommunityDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Community
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommunities.map((community) => (
            <Card
              key={community.id}
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => navigate(`/community/${community.id}`)}
            >
              <CardHeader>
                <CardTitle>{community.title}</CardTitle>
                <CardDescription>{community.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {community.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Created by {community.user?.name}</span>
                  <span>{community._count?.messages || 0} messages</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Community Dialog */}
        <Dialog
          open={showNewCommunityDialog}
          onOpenChange={setShowNewCommunityDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Community</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="react, typescript, web development"
                />
              </div>
              <Button type="submit" className="w-full">
                Create Community
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
