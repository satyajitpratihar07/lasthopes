import React, { useState, useRef, useEffect } from 'react'
import Icon from './Icon'

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role
          history: historyTo
      const inputLower = userText.toLo {
        text = "I can answer questions about logging in, fixing the API key error, or navigating the dashboard. Just ask!"
      }

      setMessages(prev => [...prev, { role: 'model', text }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      <div 
        className={`pointer-events-auto transition-all duration-300 origin-bottom-right mb-4 w-[340px] sm:w-[400px] h-[500px] max-h-[80vh] flex flex-col bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none absolute'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-teal-500/20 to-teal-900/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
              <Icon name="smart_toy" size={18} className="text-teal-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Last Hope AI</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Online</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-teal-600 text-white rounded-tr-sm' 
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'
                }`}
              >
                {/* Parse basic markdown (bold/italic) for simple rendering, or just output text */}
                {msg.text.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < msg.text.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 text-slate-400 p-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-[#020617]/50">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl py-3 pl-4 pr-12 outline-none focus:bg-white/10 focus:border-teal-500/50 transition-all placeholder:text-white/20"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal-500 transition-colors text-white"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-tr from-teal-600 to-teal-400 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] hover:scale-105 transition-all flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/30"
      >
        <Icon name={isOpen ? "close" : "smart_toy"} size={26} />
      </button>

    </div>
  )
}
