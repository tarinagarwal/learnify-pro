"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Upload, FileText, Lightbulb, Zap } from "lucide-react";
import type { QuizConfig } from "../types/quiz";
import { extractTextFromPdf } from "../utils/pdfExtractor";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  onStart: (config: QuizConfig) => void;
  initialConfig?: QuizConfig;
}

export default function QuizSetup({ onStart, initialConfig }: Props) {
  const [topic, setTopic] = useState(initialConfig?.topic || "");
  const [difficulty, setDifficulty] = useState(
    initialConfig?.difficulty || "medium"
  );
  const [numQuestions, setNumQuestions] = useState(
    initialConfig?.numQuestions || 5
  );
  const [quizType, setQuizType] = useState<"topic" | "pdf">("topic");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedPdfContent = sessionStorage.getItem("pdfContent");
    const storedPdfName = sessionStorage.getItem("pdfName");
    const storedTopic = sessionStorage.getItem("quizTopic");

    if (storedPdfContent && storedPdfName) {
      setQuizType("pdf");
      onStart({
        topic: storedPdfName,
        difficulty,
        numQuestions,
        pdfContent: storedPdfContent,
      });
      sessionStorage.removeItem("pdfContent");
      sessionStorage.removeItem("pdfName");
      sessionStorage.removeItem("pdfUrl");
    } else if (storedTopic) {
      setTopic(storedTopic);
      sessionStorage.removeItem("quizTopic");
      sessionStorage.removeItem("quizContent");
    }
  }, []);

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF file");
      return;
    }

    try {
      setLoading(true);
      const fileUrl = URL.createObjectURL(file);
      setPdfFile(file);
      const pdfText = await extractTextFromPdf(file);
      onStart({
        topic: file.name,
        difficulty,
        numQuestions,
        pdfContent: pdfText,
      });
    } catch (error) {
      setError("Error processing PDF file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (quizType === "pdf" && pdfFile) {
        const pdfText = await extractTextFromPdf(pdfFile);
        onStart({
          topic: pdfFile.name,
          difficulty,
          numQuestions,
          pdfContent: pdfText,
        });
      } else {
        onStart({ topic, difficulty, numQuestions });
      }
    } catch (error) {
      setError("Error processing PDF file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const popularTopics = [
    { name: "JavaScript Fundamentals", icon: <Zap className="h-4 w-4" /> },
    {
      name: "Machine Learning Basics",
      icon: <Lightbulb className="h-4 w-4" />,
    },
    { name: "World History", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl font-bold text-gray-100 mb-2">
          Quiz Setup
        </CardTitle>
        <CardDescription className="text-gray-400">
          Choose a topic or upload a PDF to generate quiz questions
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Tabs
          defaultValue="topic"
          onValueChange={(value) => setQuizType(value as "topic" | "pdf")}
        >
          <TabsList className="grid grid-cols-2 mb-6 bg-gray-700/50">
            <TabsTrigger
              value="topic"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              By Topic
            </TabsTrigger>
            <TabsTrigger
              value="pdf"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              From PDF
            </TabsTrigger>
          </TabsList>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <TabsContent value="topic">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-gray-300">
                  Topic
                </Label>
                <Input
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  readOnly={!!initialConfig?.topic}
                  className="bg-gray-700/50 border-gray-600 text-gray-100 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter a topic for your quiz"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Popular Topics</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {popularTopics.map((popularTopic, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      onClick={() => setTopic(popularTopic.name)}
                      className="justify-start border-gray-600 text-gray-900 hover:text-purple-400"
                    >
                      {popularTopic.icon}
                      <span className="ml-2">{popularTopic.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="difficulty" className="text-gray-300">
                    Difficulty
                  </Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger
                      id="difficulty"
                      className="bg-gray-700/50 border-gray-600 text-gray-100 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                      <SelectItem
                        value="easy"
                        className="focus:bg-purple-600 focus:text-white"
                      >
                        Easy
                      </SelectItem>
                      <SelectItem
                        value="medium"
                        className="focus:bg-purple-600 focus:text-white"
                      >
                        Medium
                      </SelectItem>
                      <SelectItem
                        value="hard"
                        className="focus:bg-purple-600 focus:text-white"
                      >
                        Hard
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numQuestions" className="text-gray-300">
                    Number of Questions
                  </Label>
                  <Input
                    type="number"
                    id="numQuestions"
                    min="1"
                    max="10"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="bg-gray-700/50 border-gray-600 text-gray-100 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !topic}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? "Processing..." : "Start Quiz"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="pdf">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pdf-upload" className="text-gray-300">
                  Upload PDF
                </Label>
                <div className="flex items-center justify-center w-full">
                  <Label
                    htmlFor="pdf-upload"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="p-3 mb-3 rounded-full bg-gray-700/50">
                        <Upload className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="mb-2 text-sm text-gray-300">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">PDF (MAX. 10MB)</p>
                    </div>
                    <Input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handlePdfChange}
                      required={quizType === "pdf"}
                    />
                  </Label>
                </div>
                {pdfFile && (
                  <div className="flex items-center mt-2 p-2 bg-gray-700/30 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-400 mr-2" />
                    <p className="text-sm text-gray-300 truncate">
                      {pdfFile.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="difficulty" className="text-gray-300">
                    Difficulty
                  </Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger
                      id="difficulty"
                      className="bg-gray-700/50 border-gray-600 text-gray-100 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                      <SelectItem
                        value="easy"
                        className="focus:bg-purple-600 focus:text-white"
                      >
                        Easy
                      </SelectItem>
                      <SelectItem
                        value="medium"
                        className="focus:bg-purple-600 focus:text-white"
                      >
                        Medium
                      </SelectItem>
                      <SelectItem
                        value="hard"
                        className="focus:bg-purple-600 focus:text-white"
                      >
                        Hard
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numQuestions" className="text-gray-300">
                    Number of Questions
                  </Label>
                  <Input
                    type="number"
                    id="numQuestions"
                    min="1"
                    max="10"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="bg-gray-700/50 border-gray-600 text-gray-100 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !pdfFile}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? "Processing..." : "Start Quiz"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </div>
  );
}
