/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Download, 
  Trash2, 
  Copy, 
  Check, 
  User, 
  Bot, 
  Hash, 
  Sparkles, 
  Plus, 
  Shuffle,
  AlertCircle
} from 'lucide-react';
import { generateVisual, getRandomPrompt, GeneratedContent } from './gemini';

interface HistoryItem extends GeneratedContent {
  id: string;
  prompt: string;
  timestamp: number;
  error?: string;
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('vision-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          if (parsed.length > 0) {
            setActiveId(parsed[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vision-chat-history', JSON.stringify(messages));
    messages.forEach(msg => {
      if (msg.type === 'CANVAS' && !msg.error) {
        renderCanvas(msg);
      }
    });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const renderCanvas = (msg: HistoryItem) => {
    const canvas = canvasRefs.current[msg.id];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      const script = new Function('document', 'canvas', 'context', `
        const targetCanvas = canvas;
        const canvasTarget = canvas;
        ${msg.code}
      `);
      script(document, canvas, ctx);
    } catch (err) {
      console.error('Canvas error:', err);
    }
  };

  const handleGenerate = async (promptToRun: string) => {
    if (!promptToRun.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await generateVisual(promptToRun);
      const newItem: HistoryItem = {
        ...data,
        id: crypto.randomUUID(),
        prompt: promptToRun,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newItem]);
      setActiveId(newItem.id);
    } catch (err: any) {
      console.error('Generation failed:', err);
      const errorText = err?.message || 'Failed to generate visual. Please try again.';
      setErrorMessage(errorText);
      const errorItem: HistoryItem = {
        type: 'SVG',
        code: '',
        explanation: errorText,
        id: crypto.randomUUID(),
        prompt: promptToRun,
        timestamp: Date.now(),
        error: errorText,
      };
      setMessages(prev => [...prev, errorItem]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    const currentPrompt = prompt;
    setPrompt('');
    await handleGenerate(currentPrompt);
  };

  const handleDistracted = async () => {
    if (loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const randomPrompt = await getRandomPrompt();
      // Put the generated prompt in the input for immediate visibility and refinement
      setPrompt(randomPrompt);
      // Generate the visual directly for the random prompt
      const data = await generateVisual(randomPrompt);
      const newItem: HistoryItem = {
        ...data,
        id: crypto.randomUUID(),
        prompt: randomPrompt,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newItem]);
      setActiveId(newItem.id);
    } catch (err: any) {
      console.error('Distracted generation error:', err);
      setErrorMessage(err?.message || 'Could not generate visual. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadCode = (msg: HistoryItem) => {
    const extension = msg.type === 'SVG' ? 'svg' : msg.type === 'REACT' ? 'tsx' : 'js';
    const blob = new Blob([msg.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vision-${msg.id.slice(0, 8)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    if (confirm('Clear all chat messages?')) {
      setMessages([]);
      setActiveId(null);
      localStorage.removeItem('vision-chat-history');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-gray-900">Vision Studio</h1>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Minimal AI Content Engineer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button 
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Clear Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full custom-scrollbar">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40 py-16">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-800">Start a new creation</h2>
              <p className="text-sm text-gray-500">Describe what you want to engineer, or click "Iam feeling distracted".</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-4">
            {/* User Message */}
            <div className="flex items-start gap-4 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div className="bg-gray-100 text-gray-800 px-5 py-3 rounded-2xl rounded-tr-none shadow-sm max-w-[80%] text-sm leading-relaxed">
                {msg.prompt}
              </div>
            </div>

            {/* Bot Response (The Builder) */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 space-y-3 max-w-[90%] md:max-w-[85%]">
                {msg.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-none p-4 text-sm text-red-700 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="font-medium">Generation Error</p>
                      <p className="text-xs text-red-600 mt-0.5">{msg.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none overflow-hidden group border-b-2 border-b-gray-200">
                    {/* Visual Preview Header */}
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-gray-300" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{msg.type} RENDER</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => downloadCode(msg)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                          title="Download Code"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => copyToClipboard(msg.id, msg.code)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                          title="Copy Code"
                        >
                          {copiedId === msg.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Render Area */}
                    <div className="p-0 overflow-auto flex items-center justify-center bg-white min-h-[220px]">
                      {msg.type === 'SVG' && (
                        <div 
                          className="w-full h-full p-8 flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: msg.code }} 
                        />
                      )}
                      {msg.type === 'REACT' && (
                        <div 
                          className="w-full h-full p-4"
                          dangerouslySetInnerHTML={{ __html: msg.code }} 
                        />
                      )}
                      {msg.type === 'CANVAS' && (
                        <div className="p-4">
                          <canvas 
                            ref={(el) => (canvasRefs.current[msg.id] = el)} 
                            width={400} 
                            height={400} 
                            className="bg-white rounded-lg border border-gray-100 max-w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {msg.explanation && !msg.error && (
                  <p className="text-xs text-gray-500 px-2 leading-relaxed italic">
                    {msg.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none w-2/3 h-48 md:h-64 flex items-center justify-center">
              <span className="text-xs text-gray-400">Engineering visual content with code...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-10" />
      </main>

      {/* Input Bar */}
      <div className="border-t border-gray-100 p-4 md:p-6 bg-white sticky bottom-0">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {/* Iam feeling distracted button on the LEFT */}
          <button
            type="button"
            onClick={handleDistracted}
            disabled={loading}
            className="h-[52px] px-5 rounded-2xl bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 transition-all flex items-center gap-2 shadow-sm font-semibold text-sm shrink-0"
            title="Generate a random creative prompt"
          >
            <Shuffle className="w-5 h-5 text-gray-700" />
            <span className="hidden sm:inline">Iam feeling distracted</span>
          </button>

          <form 
            onSubmit={handleSubmit}
            className="flex-1 relative group"
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              placeholder="Engineer visual through code (SVG, React, Canvas)..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 pr-16 text-sm focus:outline-none focus:border-gray-900 focus:bg-white transition-all shadow-sm group-focus-within:shadow-md"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="absolute right-3 top-2 bottom-2 px-4 rounded-xl bg-gray-900 text-white hover:bg-black disabled:bg-gray-200 transition-all flex items-center justify-center shadow-lg"
              title="Build visual"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
        <p className="text-center mt-3 text-[10px] text-gray-400 font-medium">Design visuals instantly with code-based rendering (SVG, React, Canvas).</p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #eee;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ddd;
        }
        
        svg {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}
