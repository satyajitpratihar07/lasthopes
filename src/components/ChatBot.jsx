import React, { useState, useRef, useEffect } from 'react'
import Icon from './Icon'

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Hello! I am the Last Hope AI Assistant. How can I help you with your academic portal today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userText = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setIsLoading(true)

    try {
      // Filter out any previous error messages to keep the history clean.
      // We also skip the first message (greeting) to ensure history always starts with a user prompt if required.
      const historyToSend = messages.slice(1).filter(m => !m.text.includes('API Error:') && !m.text.includes('Error 404'))

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          history: historyToSend,
          message: userText
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setMessages(prev => [...prev, { role: 'model', text: data.text }])
    } catch (error) {
      console.error('Gemini API Error:', error)
      // Smart Offline Fallback Mode
      const inputLower = userText.toLowerCase()
      let text = `I couldn't reach the Google Gemini servers with the provided API key (Error 404). However, I'm running in offline mode! I can help you with basic navigation of the Last Hope portal.`
      
      if (inputLower.includes('hello') || inputLower.includes('hi') || inputLower.includes('hey')) {
        text = "Hello! I am the Last Hope AI. I'm currently running in offline fallback mode because the API key is restricted. How can I assist you with the portal?"
      } else if (inputLower.includes('fix') || inputLower.includes('error') || inputLower.includes('404')) {
        text = "The 404 error means your API key doesn't have access to the 'Generative Language API'. To fix it, you need to generate a new key specifically from Google AI Studio (aistudio.google.com), not Google Cloud."
      } else if (inputLower.includes('login') || inputLower.includes('account')) {
        text = "You can log in using either an Admin or Student account. Check out the Saved Accounts dropdown next to the Welcome Back text to auto-fill credentials!"
      } else if (inputLower.includes('dashboard') || inputLower.includes('portal')) {
        text = "Once you log in, the dashboard will give you access to your course materials, schedule, and system telemetry depending on your role."
      } else if (inputLower.includes('help')) {
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
