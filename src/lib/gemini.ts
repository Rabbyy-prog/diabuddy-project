import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export type Msg = { role: "user" | "assistant"; content: string };

export async function askDiaBuddy(messages: Msg[], userData?: unknown) {
  const res = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: `You are DiaBuddy, a friendly diabetes support assistant for Malaysian users.
Explain glucose readings simply in English or Bahasa Malaysia.
Never diagnose or change medication doses. Advise seeing a doctor when unsure.
User's recent data: ${JSON.stringify(userData ?? {})}`,
    },
  });
  return res.text;
}