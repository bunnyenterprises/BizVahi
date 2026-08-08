import React, { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { PaperPlaneRight, Sparkle, User } from "@phosphor-icons/react";

const QUICK_QUESTIONS = [
  "Which product made me the most money this month?",
  "What is my estimated profit this month?",
  "Which expense category is the highest?",
  "Which items are running low on stock?",
  "Who is my best customer?",
  "How can I reduce my expenses?",
  "What should I focus on to grow my business?",
];

export default function BizAI() {
  const { t } = useLang();
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm your business advisor. I have access to your real sales, expenses, inventory and customer data. Ask me anything about your business — I'll give you specific answers based on your numbers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ask = async (question) => {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/business/ask", { question: q });
      setMessages((m) => [...m, { role: "ai", text: data.answer }]);
    } catch (e) {
      const errMsg = "Something went wrong. Try again.";
      setMessages((m) => [...m, { role: "ai", text: errMsg, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col" data-testid="biz-ai-page">
        <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">AI BUSINESS ADVISOR</div>
        <h1 className="text-3xl font-black tracking-tighter mb-6">{t("aiAdvisor")}</h1>

        {/* Quick questions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => ask(q)} disabled={loading}
              className="text-xs border border-foreground/20 dark:border-white/15 px-3 py-1.5 hover:border-teal-600 hover:klein transition-colors disabled:opacity-40">
              {q}
            </button>
          ))}
        </div>

        {/* Chat messages */}
        <div className="flex-1 border border-foreground/15 p-4 mb-4 min-h-64 max-h-[50vh] overflow-y-auto space-y-4" data-testid="biz-ai-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 shrink-0 flex items-center justify-center text-white text-xs font-bold ${msg.role === "ai" ? "bg-teal-600" : "bg-black"}`}>
                {msg.role === "ai" ? <Sparkle size={14} weight="fill" /> : <User size={14} weight="fill" />}
              </div>
              <div className={`max-w-[80%] p-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-black text-white"
                  : msg.error
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-secondary dark:bg-gray-800"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-teal-600 flex items-center justify-center">
                <Sparkle size={14} weight="fill" className="text-white" />
              </div>
              <div className="bg-secondary dark:bg-gray-800 p-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-teal-600 animate-pulse" />
                <span className="w-1.5 h-1.5 bg-teal-600 animate-pulse" style={{ animationDelay: "0.15s" }} />
                <span className="w-1.5 h-1.5 bg-teal-600 animate-pulse" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            className="flex-1 border border-foreground/20 p-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:border-teal-600"
            placeholder={t("askPlaceholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
            disabled={loading}
            data-testid="biz-ai-input"
          />
          <button onClick={() => ask()} disabled={loading || !input.trim()}
            className="bg-black text-white px-4 py-3 hover:bg-gray-800 disabled:opacity-40 transition-colors"
            data-testid="biz-ai-send">
            <PaperPlaneRight size={18} weight="fill" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Answers are based on data you've entered in Sales, Inventory, Expenses and Customers. The more data you add, the better the answers.
        </p>
      </main>
    </div>
  );
}
