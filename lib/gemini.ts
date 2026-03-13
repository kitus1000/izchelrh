import { GoogleGenAI } from "@google/genai";

let clientInstance: GoogleGenAI | null = null;

export const getGeminiClient = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
    }

    if (!clientInstance) {
        clientInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
    }
    return clientInstance;
};

/**
 * Helper to get a configured model for generation
 * In SDK v2, we usually use the model name directly in generateContent
 */
export const getGeminiModel = (modelName: string = "gemini-2.0-flash") => {
    return modelName;
};
