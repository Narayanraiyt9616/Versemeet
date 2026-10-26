import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Crown, ShieldAlert } from 'lucide-react';

export default function ChatDrawer({
  isOpen = false,
  onClose,
  messages = [],
  onSendMessage,
  isChatAllowed = true,
  isHost = false
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    if (!isChatAllowed && !isHost) return;

    onSendMessage(inputText.trim());
    setInputText('');
  };

  const formatTime = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white/98 backdrop-blur-2xl border-l border-slate-200 text-slate-900 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 select-none">
      {/* Header */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">Meeting Chat</h3>
            <p className="text-[11px] text-slate-500 font-medium">Messages visible to all attendees</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin bg-white">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2 border border-slate-200/60">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">
              Ask questions, share links, or say hello to the group!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex flex-col space-y-1">
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">{msg.senderName}</span>
                  {msg.senderRole === 'host' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      <Crown className="w-2.5 h-2.5 fill-current text-amber-600" /> Host
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="bg-slate-100/80 border border-slate-200/80 rounded-2xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 break-words leading-relaxed shadow-xs">
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50">
        {!isChatAllowed && !isHost ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>Meeting chat has been disabled by the host.</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send a message to everyone..."
              maxLength={1000}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-xs"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
