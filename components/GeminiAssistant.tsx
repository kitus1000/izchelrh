'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader2, X, MessageSquare } from 'lucide-react';

interface GeminiAssistantProps {
    screenContext?: any; // Data from the current screen to provide context to the AI
}

export default function GeminiAssistant({ screenContext }: GeminiAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: input,
                    context: screenContext
                }),
            });

            const data = await response.json();

            if (data.error) {
                // Si es un error de cuota, dar un mensaje amigable
                if (data.isQuotaError) {
                    throw new Error("Has agotado tu cuota gratuita de hoy en Google Gemini. Por favor, intenta de nuevo en unos minutos o mañana.");
                }
                throw new Error(data.details || data.error);
            }

            setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'ai', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen ? (
                <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 w-96 flex flex-col max-h-[600px] animate-in slide-in-from-bottom-4">
                    {/* Header */}
                    <div className="bg-indigo-900 p-4 rounded-t-2xl flex justify-between items-center">
                        <div className="flex items-center gap-2 text-white">
                            <Sparkles className="w-5 h-5 text-indigo-300" />
                            <span className="font-bold">Asistente AI</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] bg-zinc-50/50">
                        {messages.length === 0 && (
                            <div className="text-center py-8 text-zinc-400">
                                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">¿En qué puedo ayudarte hoy?</p>
                                {screenContext && <p className="text-[10px] mt-2 text-indigo-400 font-bold uppercase">Análisis de pantalla activo</p>}
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white border border-zinc-200 text-zinc-800 shadow-sm rounded-tl-none'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-zinc-200 p-3 rounded-2xl shadow-sm rounded-tl-none">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-zinc-100 rounded-b-2xl">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Escribe tu duda aquí..."
                                className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 top-2 p-1.5 bg-indigo-900 text-white rounded-lg hover:bg-black transition-all disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-indigo-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 group relative"
                >
                    <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full border-2 border-white animate-bounce"></div>
                </button>
            )}
        </div>
    );
}
