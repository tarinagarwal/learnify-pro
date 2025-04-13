import Groq from "groq-sdk";
import type { QuizConfig, Question } from "../types/quiz";
import type { CourseOutline, Chapter } from "../types/course";

// Ensure GROQ API key is configured
if (!import.meta.env.VITE_GROQ_API_KEY) {
  throw new Error("GROQ API key is not configured");
}

// Initialize GROQ SDK
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate multiple-choice questions based on either a topic or provided content.
 * @param {QuizConfig} config - Configuration for quiz generation.
 * @returns {Promise<Question[]>} - List of generated questions.
 */
export async function generateQuestions(
  config: QuizConfig,
  retryCount = 0
): Promise<Question[]> {
  try {
    // Determine prompt based on config structure
    const prompt =
      "pdfContent" in config
        ? `Based on the following content, generate ${config.numQuestions} multiple choice questions at ${config.difficulty} difficulty level. Make sure the questions are directly related to the content provided.

Content:
${config.pdfContent}

Respond with a JSON array ONLY. DO NOT include any other text, explanations, or introductions.
Response must include all the things given in this example format.
Example format:
[
  {
    "question": "the question text",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "the correct option",
    "explanation": "explanation why this is the correct answer"
  }
]`
        : `Generate ${config.numQuestions} multiple choice questions about ${config.topic} at ${config.difficulty} difficulty level. 

Respond with a JSON array ONLY. DO NOT include any other text, explanations, or introductions.
Response must include all the things given in this example format.
Example format:
[
  {
    "question": "the question text",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "the correct option",
    "explanation": "explanation why this is the correct answer"
  }
]`;

    // Make API call to generate questions
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 2048,
    });

    const response = completion.choices[0]?.message?.content || "[]";
    return JSON.parse(response);
  } catch (error: any) {
    console.error("Error generating questions:", error);

    // Retry logic for 503 errors
    if (error?.message?.includes("503") && retryCount < MAX_RETRIES) {
      console.log(`Retrying... Attempt ${retryCount + 1} of ${MAX_RETRIES}`);
      await sleep(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
      return generateQuestions(config, retryCount + 1);
    }

    throw new Error(
      "Failed to generate questions. Please try again later. " +
        "If the problem persists, contact support."
    );
  }
}

/**
 * Generate a professional response to user queries based on provided PDF content.
 * @param {string} pdfContent - Content extracted from a PDF.
 * @param {string} userQuestion - User's question about the PDF content.
 * @returns {Promise<string>} - Generated response to the user's question.
 */
export async function generatePdfChat(
  pdfContent: string,
  userQuestion: string
): Promise<string> {
  try {
    const systemPrompt = `You are a professional AI assistant specialized in analyzing PDF documents. Your responses should be:
1. Well-structured with clear sections when appropriate
2. Concise yet comprehensive
3. Professional in tone
4. Include relevant quotes from the document when applicable (in quotation marks)
5. Always cite specific sections or pages if you can identify them
6. If information is not found in the document, clearly state that

Use the following PDF content to answer questions:

${pdfContent}

Format longer responses with appropriate Markdown:
- Use **bold** for emphasis
- Use bullet points for lists
- Use > for quotes from the document
- Use ### for section headers if needed`;

    // Make API call to generate chat response
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuestion },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 2048,
    });

    return (
      completion.choices[0]?.message?.content ||
      "I couldn't generate a response."
    );
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw new Error("Failed to generate response");
  }
}

/**
 * Generate a course outline for a given topic
 */
export async function generateCourseOutline(
  topic: string
): Promise<CourseOutline> {
  try {
    const prompt = `Create a comprehensive course outline for "${topic}". Respond with a JSON array ONLY. DO NOT include any other text, explanations, or introductions. Follow the following structure.
{
  "title": "Course title",
  "description": "A comprehensive description of the course",
  "chapters": [
    {
      "title": "Chapter title",
      "description": "Brief description of what will be covered in this chapter",
      "order_index": chapter number (starting from 1)
    }
  ]
}

Make sure the outline is:
1. Well-structured and logical
2. Progressive (from basic to advanced)
3. Comprehensive yet concise
4. Practical and applicable`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 2048,
    });

    const response = completion.choices[0]?.message?.content || "{}";
    return JSON.parse(response);
  } catch (error) {
    console.error("Error generating course outline:", error);
    throw new Error("Failed to generate course outline");
  }
}

/**
 * Generate detailed content for a specific chapter
 */
export async function generateChapterContent(
  courseTitle: string,
  chapterTitle: string,
  chapterDescription: string
): Promise<string> {
  try {
    const prompt = `Generate comprehensive content for the chapter "${chapterTitle}" which is part of the course "${courseTitle}".
    
Chapter Description: ${chapterDescription}

The content should:
1. Be well-structured with clear sections
2. Include practical examples where applicable
3. Be written in Markdown format
4. Include key concepts, explanations, and practical applications
5. Be comprehensive yet easy to understand

Use appropriate Markdown formatting:
- Use ## for main sections
- Use ### for subsections
- Use bullet points for lists
- Use code blocks for examples (if applicable)
- Use bold and italic for emphasis`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 4096,
    });

    return (
      completion.choices[0]?.message?.content || "Failed to generate content"
    );
  } catch (error) {
    console.error("Error generating chapter content:", error);
    throw new Error("Failed to generate chapter content");
  }
}

/**
 * Generate a learning roadmap for a given topic with enhanced detail and structure
 */
export async function generateRoadmap(topic: string): Promise<any> {
  try {
    const prompt = `Create a comprehensive and detailed learning roadmap for "${topic}". The roadmap should be extremely detailed and include:

1. Clear progression from beginner to advanced levels
2. Required skills and technologies with detailed explanations
3. Extensive list of learning resources including:
   - Official documentation
   - Interactive tutorials
   - Video courses
   - Books
   - Practice exercises
4. Best practices and industry standards
5. Common pitfalls and how to avoid them
6. Detailed project ideas with increasing complexity
7. Recommended tools and development environment setup
8. Estimated time frames for each stage
9. Career progression opportunities
10. Industry certifications if applicable

IMPORTANT: Your response must be a valid JSON object. Do not include any text before or after the JSON object.

Format:
{
  "title": "Main topic title",
  "description": "Comprehensive overview of the learning path",
  "stages": [
    {
      "level": "Beginner/Intermediate/Advanced",
      "title": "Stage title",
      "description": "Detailed description of this stage",
      "skills": [
        {
          "name": "Skill name",
          "description": "Detailed explanation of the skill",
          "importance": "Why this skill is crucial"
        }
      ],
      "resources": [
        {
          "name": "Resource name",
          "type": "Documentation/Tutorial/Course/Book/Video",
          "url": "URL if applicable",
          "description": "Detailed description of the resource",
          "format": "Text/Video/Interactive",
          "difficulty": "Beginner/Intermediate/Advanced",
          "estimated_time": "Time to complete this resource",
          "prerequisites": ["Required prerequisites"],
          "cost": "Free/Paid/Subscription"
        }
      ],
      "timeframe": "Estimated time to complete this stage",
      "projects": [
        {
          "name": "Project name",
          "description": "Detailed project description",
          "learning_objectives": ["What you'll learn"],
          "features": ["Key features to implement"],
          "skills_practiced": ["Skills you'll practice"],
          "difficulty": "Beginner/Intermediate/Advanced",
          "estimated_time": "Time to complete",
          "resources": ["Helpful resources for this project"],
          "next_steps": ["How to extend this project"]
        }
      ],
      "best_practices": [
        {
          "title": "Best practice name",
          "description": "Detailed explanation",
          "examples": ["Good and bad examples"]
        }
      ],
      "common_pitfalls": [
        {
          "issue": "Pitfall description",
          "solution": "How to avoid or resolve it"
        }
      ]
    }
  ],
  "tools": [
    {
      "name": "Tool name",
      "category": "Category of tool",
      "description": "Detailed description",
      "url": "Official website/docs",
      "setup_guide": "Basic setup instructions",
      "alternatives": ["Alternative tools"],
      "pros": ["Advantages"],
      "cons": ["Disadvantages"]
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "provider": "Certification provider",
      "level": "Beginner/Intermediate/Advanced",
      "description": "What the certification covers",
      "url": "Official certification page",
      "cost": "Certification cost",
      "validity": "How long it's valid",
      "preparation_resources": ["Study resources"]
    }
  ],
  "career_path": {
    "roles": ["Possible job roles"],
    "skills_required": ["Required skills for each role"],
    "progression": ["Career progression steps"],
    "salary_range": "Typical salary range"
  }
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
      response_format: { type: "json_object" }, // Enforce JSON response
    });

    const response = completion.choices[0]?.message?.content || "{}";

    try {
      const parsedResponse = JSON.parse(response);

      // Validate the required structure
      if (!parsedResponse.stages || !Array.isArray(parsedResponse.stages)) {
        throw new Error(
          "Invalid roadmap structure: missing or invalid stages array"
        );
      }

      return parsedResponse;
    } catch (parseError) {
      console.error("Error parsing roadmap JSON:", parseError);
      // Return a minimal valid structure
      return {
        title: topic,
        description: "Unable to generate detailed roadmap at this time.",
        stages: [],
        tools: [],
        certifications: [],
        career_path: {
          roles: [],
          skills_required: [],
          progression: [],
          salary_range: "Not available",
        },
      };
    }
  } catch (error) {
    console.error("Error generating roadmap:", error);
    throw new Error("Failed to generate roadmap");
  }
}

export const generateResponse = async (imageData: string): Promise<string> => {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageData,
              },
            },
            {
              type: "text",
              text: "Analyze this whiteboard drawing and provide a response in a standard markdown format which looks professional You tone should be like a teacher. If it contains:\n\n- Mathematical equations: Show the solution steps\n- Code: Explain the logic and suggest improvements\n- Diagrams/flowcharts: Describe the structure and relationships\n\nFocus only on the content visible in the drawing. If there is any question, answer it. Do not provide the information on whats on the whiteboard. Just the question and the answer.",
            },
          ],
        },
      ],
      model: "llama-3.2-90b-vision-preview",
      temperature: 0.7,
      max_tokens: 2048,
    });

    return completion.choices[0]?.message?.content || "No response generated";
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
};
