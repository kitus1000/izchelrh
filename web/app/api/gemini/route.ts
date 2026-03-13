import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import Groq from 'groq-sdk';

// Configuración de Groq (respaldo)
const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

// Lista de modelos de Gemini a intentar
const GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash"];

export async function POST(req: NextRequest) {
    let lastError: any = null;
    let geminiClient: any = null;
    const errors: string[] = [];

    try {
        console.log("AI Route called. NODE_ENV:", process.env.NODE_ENV);
        const { prompt, context } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const fullPrompt = context
            ? `Contexto de la pantalla actual (JSON): ${JSON.stringify(context)}\n\nUsuario: ${prompt}`
            : prompt;

        // --- INTENTO 1: Gemini ---
        try {
            geminiClient = getGeminiClient();
            if (geminiClient) {
                for (const modelName of GEMINI_MODELS) {
                    try {
                        console.log(`Intentando Gemini con modelo: ${modelName}...`);
                        const result = await geminiClient.models.generateContent({
                            model: modelName,
                            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                        });

                        // El SDK @google/genai puede devolver la respuesta de varias formas según la versión
                        const text = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
                        
                        if (text) {
                            return NextResponse.json({ text, provider: 'gemini', modelUsed: modelName });
                        }
                    } catch (error: any) {
                        console.warn(`Gemini (${modelName}) falló:`, error.message);
                        errors.push(`Gemini (${modelName}): ${error.message}`);
                    }
                }
            }
        } catch (e: any) {
            console.warn("Error inicializando Gemini:", e.message);
            errors.push(`Inicialización Gemini: ${e.message}`);
        }

        // --- INTENTO 2: Groq (Fallback) ---
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            try {
                const groqClient = new Groq({ apiKey: groqKey });
                console.log("Intentando fallback con Groq (Llama-3)...");
                const completion = await groqClient.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "Eres un asistente experto en Recursos Humanos y sistemas de gestión de personal. Ayuda al usuario con sus dudas basándote en el contexto proporcionado."
                        },
                        { role: "user", content: fullPrompt }
                    ],
                    model: "llama-3.3-70b-versatile",
                });

                const text = completion.choices[0]?.message?.content;
                if (text) {
                    return NextResponse.json({
                        text,
                        provider: 'groq',
                        modelUsed: "llama-3.3-70b-versatile",
                        isFallback: true
                    });
                }
            } catch (error: any) {
                console.error('Groq Fallback Error:', error.message);
                errors.push(`Groq: ${error.message}`);
            }
        } else {
            errors.push("Groq no configurado (GROQ_API_KEY faltante)");
        }

        // Si llegamos aquí, todo falló
        return NextResponse.json({
            error: "No hay servicios de IA disponibles o todos fallaron.",
            details: errors.join(" | "),
            geminiKeyPresent: !!process.env.GEMINI_API_KEY,
            groqKeyPresent: !!process.env.GROQ_API_KEY
        }, { status: 503 });

    } catch (error: any) {
        console.error('AI Integration Error:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
