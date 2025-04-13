import React, { useState, useEffect } from "react";
import {
  Route,
  Search,
  Plus,
  Loader2,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { generateRoadmap } from "../services/groq";
import type { Roadmap } from "../types/roadmap";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchBar } from "@/components/SearchBar";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Roadmaps() {
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "my-roadmaps"

  useEffect(() => {
    fetchRoadmaps();
  }, [activeTab]);

  const fetchRoadmaps = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("roadmaps").select("*");

      // Filter by user_id if on "my-roadmaps" tab
      if (activeTab === "my-roadmaps") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      setRoadmaps(data || []);
    } catch (err) {
      console.error("Error fetching roadmaps:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoadmap = async () => {
    if (!topic.trim()) return;

    try {
      setGenerating(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Generate roadmap via GROQ
      const roadmapContent = await generateRoadmap(topic);

      // Validate roadmap content structure
      if (
        !roadmapContent ||
        !roadmapContent.stages ||
        !Array.isArray(roadmapContent.stages)
      ) {
        throw new Error("Invalid roadmap structure received");
      }

      // Insert roadmap
      const { error: roadmapError } = await supabase.from("roadmaps").insert({
        title: roadmapContent.title || `Roadmap: ${topic}`,
        description:
          roadmapContent.description || `Learning roadmap for ${topic}`,
        content: roadmapContent,
        user_id: user.id,
      });

      if (roadmapError) throw roadmapError;

      setTopic("");
      fetchRoadmaps();
    } catch (error) {
      console.error("Error creating roadmap:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create roadmap"
      );
    } finally {
      setGenerating(false);
    }
  };

  const filteredRoadmaps = roadmaps.filter(
    (roadmap) =>
      roadmap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roadmap.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderStages = (stages: any[] = []) => {
    if (!Array.isArray(stages) || stages.length === 0) {
      return (
        <Card className="text-center p-8">
          <CardContent>
            <p className="text-muted-foreground">
              No stages available for this roadmap.
            </p>
          </CardContent>
        </Card>
      );
    }

    return stages.map((stage, index) => (
      <div key={index} className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              stage.level === "Beginner"
                ? "bg-green-100 text-green-800"
                : stage.level === "Intermediate"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {stage.level}
          </span>
          <h2 className="text-xl font-semibold">{stage.title}</h2>
        </div>

        <p className="text-muted-foreground mb-6">{stage.description}</p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(stage.skills) &&
                  stage.skills.map((skill: any, i: number) => (
                    <div key={i}>
                      <h4 className="font-medium">{skill.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {skill.description}
                      </p>
                      <p className="text-sm text-primary mt-1">
                        Why it matters: {skill.importance}
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(stage.resources) &&
                  stage.resources.map((resource: any, i: number) => (
                    <div key={i} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {resource.url ? (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {resource.name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            resource.name
                          )}
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            resource.cost === "Free"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {resource.cost}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {resource.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {resource.format}
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {resource.difficulty}
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {resource.estimated_time}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Practice Projects</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.isArray(stage.projects) &&
              stage.projects.map((project: any, i: number) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">
                          Learning Objectives
                        </h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {Array.isArray(project.learning_objectives) &&
                            project.learning_objectives.map(
                              (obj: string, j: number) => (
                                <li key={j} className="text-sm">
                                  {obj}
                                </li>
                              )
                            )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Key Features</h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {Array.isArray(project.features) &&
                            project.features.map(
                              (feature: string, j: number) => (
                                <li key={j} className="text-sm">
                                  {feature}
                                </li>
                              )
                            )}
                        </ul>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(project.skills_practiced) &&
                          project.skills_practiced.map(
                            (skill: string, j: number) => (
                              <span
                                key={j}
                                className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
                              >
                                {skill}
                              </span>
                            )
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* Best Practices & Pitfalls */}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(stage.best_practices) &&
                  stage.best_practices.map((practice: any, i: number) => (
                    <div key={i}>
                      <h4 className="font-medium">{practice.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {practice.description}
                      </p>
                      <div className="mt-2 space-y-1">
                        {Array.isArray(practice.examples) &&
                          practice.examples.map(
                            (example: string, j: number) => (
                              <p
                                key={j}
                                className="text-sm bg-muted p-2 rounded"
                              >
                                {example}
                              </p>
                            )
                          )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Common Pitfalls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(stage.common_pitfalls) &&
                  stage.common_pitfalls.map((pitfall: any, i: number) => (
                    <div key={i}>
                      <h4 className="font-medium text-red-600">
                        {pitfall.issue}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Solution: {pitfall.solution}
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {selectedRoadmap ? (
          <>
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => setSelectedRoadmap(null)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Roadmaps
              </Button>

              <div className="bg-white rounded-lg shadow-lg p-8">
                <h1 className="text-3xl font-bold mb-2">
                  {selectedRoadmap.content?.title || "Untitled Roadmap"}
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  {selectedRoadmap.content?.description ||
                    "No description available"}
                </p>

                <Tabs defaultValue="stages" className="w-full">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="stages">Learning Path</TabsTrigger>
                    <TabsTrigger value="tools">Tools</TabsTrigger>
                    <TabsTrigger value="certifications">
                      Certifications
                    </TabsTrigger>
                    <TabsTrigger value="career">Career Path</TabsTrigger>
                  </TabsList>

                  <TabsContent value="stages" className="mt-6">
                    <div className="space-y-12">
                      {renderStages(selectedRoadmap.content?.stages)}
                    </div>
                  </TabsContent>

                  <TabsContent value="tools" className="mt-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {Array.isArray(selectedRoadmap.content?.tools) &&
                        selectedRoadmap.content.tools.map(
                          (tool: any, index: number) => (
                            <Card key={index}>
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <CardTitle>{tool.name}</CardTitle>
                                  <span className="text-sm bg-muted px-2 py-1 rounded">
                                    {tool.category}
                                  </span>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                  {tool.description}
                                </p>
                                <a
                                  href={tool.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 mb-4"
                                >
                                  Official Documentation
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      Setup Guide
                                    </h4>
                                    <p className="text-sm">
                                      {tool.setup_guide}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">Pros</h4>
                                    <ul className="list-disc pl-4 space-y-1">
                                      {Array.isArray(tool.pros) &&
                                        tool.pros.map(
                                          (pro: string, i: number) => (
                                            <li key={i} className="text-sm">
                                              {pro}
                                            </li>
                                          )
                                        )}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">Cons</h4>
                                    <ul className="list-disc pl-4 space-y-1">
                                      {Array.isArray(tool.cons) &&
                                        tool.cons.map(
                                          (con: string, i: number) => (
                                            <li key={i} className="text-sm">
                                              {con}
                                            </li>
                                          )
                                        )}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      Alternatives
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {Array.isArray(tool.alternatives) &&
                                        tool.alternatives.map(
                                          (alt: string, i: number) => (
                                            <span
                                              key={i}
                                              className="px-2 py-1 bg-muted rounded text-sm"
                                            >
                                              {alt}
                                            </span>
                                          )
                                        )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        )}
                    </div>
                  </TabsContent>

                  <TabsContent value="certifications" className="mt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {Array.isArray(selectedRoadmap.content?.certifications) &&
                        selectedRoadmap.content.certifications.map(
                          (cert: any, index: number) => (
                            <Card key={index}>
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <CardTitle>{cert.name}</CardTitle>
                                  <span
                                    className={`text-sm px-2 py-1 rounded ${
                                      cert.level === "Beginner"
                                        ? "bg-green-100 text-green-800"
                                        : cert.level === "Intermediate"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {cert.level}
                                  </span>
                                </div>
                                <CardDescription>
                                  {cert.provider}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                  {cert.description}
                                </p>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      Cost:
                                    </span>
                                    <span className="text-sm">{cert.cost}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      Validity:
                                    </span>
                                    <span className="text-sm">
                                      {cert.validity}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      Preparation Resources
                                    </h4>
                                    <ul className="list-disc pl-4 space-y-1">
                                      {Array.isArray(
                                        cert.preparation_resources
                                      ) &&
                                        cert.preparation_resources.map(
                                          (resource: string, i: number) => (
                                            <li key={i} className="text-sm">
                                              {resource}
                                            </li>
                                          )
                                        )}
                                    </ul>
                                  </div>
                                  <a
                                    href={cert.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    Learn More
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        )}
                    </div>
                  </TabsContent>

                  <TabsContent value="career" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Career Progression Path</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold mb-3">
                              Possible Roles
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(
                                selectedRoadmap.content?.career_path?.roles
                              ) &&
                                selectedRoadmap.content.career_path.roles.map(
                                  (role: any, i: number) => (
                                    <span
                                      key={i}
                                      className="px-3 py-1 bg-primary/10 text-primary rounded-full"
                                    >
                                      {typeof role === "string"
                                        ? role
                                        : role.name || "Unknown Role"}
                                    </span>
                                  )
                                )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-3">
                              Required Skills
                            </h3>
                            <div className="grid gap-2 md:grid-cols-2">
                              {Array.isArray(
                                selectedRoadmap.content?.career_path
                                  ?.skills_required
                              ) &&
                                selectedRoadmap.content.career_path.skills_required.map(
                                  (skill: any, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-2 bg-muted p-2 rounded"
                                    >
                                      <span className="text-sm">
                                        {typeof skill === "string"
                                          ? skill
                                          : skill.name || "Unknown Skill"}
                                      </span>
                                      {typeof skill !== "string" &&
                                        skill.description && (
                                          <span className="text-xs text-muted-foreground">
                                            - {skill.description}
                                          </span>
                                        )}
                                    </div>
                                  )
                                )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-3">
                              Career Progression
                            </h3>
                            <div className="space-y-4">
                              {Array.isArray(
                                selectedRoadmap.content?.career_path
                                  ?.progression
                              ) &&
                                selectedRoadmap.content.career_path.progression.map(
                                  (step: string, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-4"
                                    >
                                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                                        {i + 1}
                                      </span>
                                      <span>{step}</span>
                                    </div>
                                  )
                                )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-3">
                              Salary Range
                            </h3>
                            <p className="text-lg font-medium text-primary">
                              {selectedRoadmap.content?.career_path
                                ?.salary_range || "Not available"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-12">
              <Route className="mx-auto h-16 w-16 text-primary" />
              <h2 className="mt-2 text-4xl font-bold text-primary">
                Learning Roadmaps
              </h2>
              <p className="mt-2 text-xl text-muted-foreground">
                Discover structured learning paths for any technology
              </p>
            </div>

            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search roadmaps..."
                  />
                  <TabsList>
                    <TabsTrigger value="all">All Roadmaps</TabsTrigger>
                    <TabsTrigger value="my-roadmaps">My Roadmaps</TabsTrigger>
                  </TabsList>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Roadmap
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Roadmap</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="topic">Topic</Label>
                        <Input
                          id="topic"
                          placeholder="e.g., React Development, Web Development"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                        />
                        {error && (
                          <p className="text-sm text-red-500 mt-1">{error}</p>
                        )}
                      </div>
                      <Button
                        onClick={handleCreateRoadmap}
                        disabled={generating || !topic.trim()}
                        className="w-full"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Roadmap...
                          </>
                        ) : (
                          "Create Roadmap"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {filteredRoadmaps.length === 0 ? (
                <Card className="text-center p-8 bg-gray-100">
                  <CardContent>
                    <Route className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-xl text-muted-foreground">
                      No roadmaps found
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      Try a different search term or create a new roadmap
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredRoadmaps.map((roadmap) => (
                    <Card
                      key={roadmap.id}
                      className="bg-gray-100 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedRoadmap(roadmap)}
                    >
                      <CardHeader>
                        <CardTitle>
                          {roadmap.content?.title || "Untitled Roadmap"}
                        </CardTitle>
                        <CardDescription>
                          {roadmap.content?.description ||
                            "No description available"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Array.isArray(roadmap.content?.stages) &&
                            roadmap.content.stages.map(
                              (stage: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      stage.level === "Beginner"
                                        ? "bg-green-500"
                                        : stage.level === "Intermediate"
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {stage.title}
                                  </span>
                                </div>
                              )
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
