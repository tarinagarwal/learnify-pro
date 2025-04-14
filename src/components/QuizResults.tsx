"use client";
import {
  Trophy,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  Loader2,
} from "lucide-react";
import type { Question } from "../types/quiz";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { generateQuizAnalytics } from "../services/groq";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

interface Props {
  questions: Question[];
  userAnswers: string[];
  onRestart: () => void;
  isHistoryView?: boolean;
  quizId?: string | null;
}

export default function QuizResults({
  questions,
  userAnswers,
  onRestart,
  isHistoryView,
  quizId,
}: Props) {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
  const [generatingAnalytics, setGeneratingAnalytics] = useState(false);
  const [hasAnalytics, setHasAnalytics] = useState(false);

  const score = questions.reduce(
    (acc, q, idx) => (q.correctAnswer === userAnswers[idx] ? acc + 1 : acc),
    0
  );

  const percentage = Math.round((score / questions.length) * 100);

  useEffect(() => {
    // Check if analytics exists for this quiz
    const checkAnalytics = async () => {
      if (!quizId) return;

      const { data } = await supabase
        .from("quiz_analytics")
        .select("id")
        .eq("quiz_id", quizId)
        .single();

      setHasAnalytics(!!data);
    };

    checkAnalytics();
  }, [quizId]);

  const toggleItem = (idx: number) => {
    setOpenItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleGenerateAnalytics = async () => {
    try {
      setGeneratingAnalytics(true);

      // Get the quiz ID from the URL if in history view
      const urlParams = new URLSearchParams(window.location.search);
      const currentQuizId = urlParams.get("id") || quizId;

      if (!currentQuizId) {
        console.error("No quiz ID found");
        return;
      }

      // Generate analytics
      const analysis = await generateQuizAnalytics(questions, userAnswers);

      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Store analytics in Supabase
      const { error } = await supabase.from("quiz_analytics").insert({
        quiz_id: currentQuizId,
        user_id: user.id,
        analysis,
      });

      if (error) throw error;

      // Navigate to analytics page
      navigate(`/quiz-analytics/${currentQuizId}`);
    } catch (error) {
      console.error("Error generating analytics:", error);
    } finally {
      setGeneratingAnalytics(false);
    }
  };

  // Determine performance message
  let performanceMessage = "";
  let performanceColor = "";

  if (percentage >= 90) {
    performanceMessage = "Outstanding! You're a master of this topic!";
    performanceColor = "text-green-400";
  } else if (percentage >= 70) {
    performanceMessage = "Great job! You have a solid understanding.";
    performanceColor = "text-green-400";
  } else if (percentage >= 50) {
    performanceMessage = "Good effort! Keep practicing to improve.";
    performanceColor = "text-yellow-400";
  } else {
    performanceMessage = "Keep learning! This topic needs more study.";
    performanceColor = "text-red-400";
  }

  return (
    <div className="p-6">
      <CardHeader className="px-0 pt-0 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-500/20 backdrop-blur-sm rounded-full mb-4">
          <Trophy className="w-12 h-12 text-yellow-500" />
        </div>
        <CardTitle className="text-3xl font-bold text-gray-100">
          {isHistoryView ? "Quiz Results" : "Quiz Complete!"}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {isHistoryView ? "Review your performance" : "See how well you did"}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <div className="text-center mb-10">
          <div className="relative w-48 h-48 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-8 border-gray-700"></div>
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
            >
              <circle
                className="text-gray-700"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
              />
              <circle
                className="text-purple-500"
                strokeWidth="8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
                strokeDasharray="264"
                strokeDashoffset={264 - (percentage / 100) * 264}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-4xl font-bold text-gray-100">
                {percentage}%
              </span>
              <span className="text-sm text-gray-400">
                {score} of {questions.length} correct
              </span>
            </div>
          </div>
          <p className={`text-lg font-medium ${performanceColor}`}>
            {performanceMessage}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {questions.map((q, idx) => {
            const isCorrect = q.correctAnswer === userAnswers[idx];
            return (
              <Collapsible
                key={idx}
                open={openItems[idx]}
                onOpenChange={() => toggleItem(idx)}
              >
                <Card
                  className={`bg-gray-800/30 border-l-4 ${
                    isCorrect ? "border-l-green-500" : "border-l-red-500"
                  } border-gray-700`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 p-1 rounded-full ${
                            isCorrect
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <XCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base font-medium text-gray-100">
                            {q.question}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-400 mt-1">
                            Your answer: {userAnswers[idx]}
                          </CardDescription>
                        </div>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-8 w-8 rounded-full"
                        >
                          {openItems[idx] ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="p-4 pt-0">
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-sm mb-1">
                          <span className="font-medium text-purple-400">
                            Correct answer:
                          </span>{" "}
                          <span className="text-gray-100">
                            {q.correctAnswer}
                          </span>
                        </p>
                        <p className="text-sm text-gray-300 mt-2 bg-gray-800/50 p-3 rounded-md">
                          {q.explanation}
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          {quizId && (
            <>
              {hasAnalytics ? (
                <Button
                  onClick={() => navigate(`/quiz-analytics/${quizId}`)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  View Analytics
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateAnalytics}
                  disabled={generatingAnalytics}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6"
                >
                  {generatingAnalytics ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Analysis...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      AI Mentor Analysis
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          <Button
            onClick={onRestart}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            {isHistoryView ? "Back to History" : "Try Another Quiz"}
          </Button>
        </div>
      </CardContent>
    </div>
  );
}
