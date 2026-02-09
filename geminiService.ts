
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const categories = [
  "السيرة النبوية",
  "قصص الأنبياء والمرسلين",
  "قصص الصحابة",
  "القرآن الكريم"
];

/**
 * توليد سؤال باستخدام أحدث مفتاح API متوفر في البيئة
 */
export const generateQuestion = async (usedIds: string[]): Promise<Question> => {
  // نقوم دائماً بجلب أحدث قيمة للمفتاح من process.env.API_KEY
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `أنشئ سؤالاً إسلامياً جديداً في قسم (${category}). يجب أن يكون السؤال واضحاً ومناسباً لمسابقة.
               تجنب هذه الأسئلة إذا كانت موجودة: ${usedIds.join(', ')}.
               أريد الإجابة الصحيحة، و3 خيارات خاطئة مقنعة، وشرحاً موجزاً (توعية) يشرح لماذا هذه هي الإجابة الصحيحة أو يضيف معلومة مفيدة متعلقة بالسؤال.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "نص السؤال" },
          correctAnswer: { type: Type.STRING, description: "الإجابة الصحيحة" },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "قائمة تضم 4 خيارات (أحدهم الصحيح)"
          },
          explanation: { type: Type.STRING, description: "شرح تعليمي موجز للإجابة الصحيحة" }
        },
        required: ["text", "correctAnswer", "options", "explanation"]
      }
    }
  });

  const data = JSON.parse(response.text);
  
  const shuffledOptions = [...data.options].sort(() => Math.random() - 0.5);

  return {
    id: Math.random().toString(36).substring(7),
    text: data.text,
    correctAnswer: data.correctAnswer,
    options: shuffledOptions,
    category,
    explanation: data.explanation
  };
};

/**
 * التحقق من الإجابة المباشرة باستخدام أحدث مفتاح API
 */
export const checkDirectAnswer = async (question: string, correctAnswer: string, userAnswer: string): Promise<boolean> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return false;
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `هل الإجابة "${userAnswer}" تعتبر صحيحة للسؤال: "${question}"؟ الإجابة النموذجية هي "${correctAnswer}".
               أجب فقط بكلمة "صحيح" أو "خطأ". خذ في الاعتبار الأخطاء الإملائية البسيطة أو المترادفات القريبة جداً في الأسماء الإسلامية.`,
  });

  const resultText = response.text.trim();
  return resultText.includes("صحيح");
};
