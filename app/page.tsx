'use client'

import { useChat } from 'ai/react'
import { Send, Bot, Loader2 } from 'lucide-react'
import { ChatMessage } from './components/ChatMessage'
import { useRef, useEffect } from 'react'

const SUGGESTED_QUESTIONS = [
  'Koji su trendovi AI-a u turizmu za 2025. godinu?',
  'Kako implementirati personalizaciju u hotelijerstvu?',
  'Koje kompetencije trebaju studenti u digitalnoj ekonomiji?',
  'Kako koristiti chatbotove u recepciji hotela?',
]

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-gray-900">
            {process.env.NEXT_PUBLIC_CHATBOT_NAME || 'Baltazar'}
          </h1>
          <p className="text-xs text-gray-500">
            {process.env.NEXT_PUBLIC_CHATBOT_DESCRIPTION || 'AI asistent za visoko obrazovanje i turizam'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-gray-500">Online</span>
        </div>
      </header>

      {/* Prostor za poruke */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Dobrodošli!</h2>
              <p className="text-gray-500 max-w-md">
                Ja sam Baltazar, vaš AI asistent. Pitajte me o turizmu,
                ugostiteljstvu i visokom obrazovanju.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const event = { target: { value: q } } as React.ChangeEvent<HTMLInputElement>
                    handleInputChange(event)
                  }}
                  className="text-left p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700 shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{ id: message.id, role: message.role as 'user' | 'assistant', content: message.content }}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">B</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Postavite pitanje o turizmu, ugostiteljstvu ili obrazovanju..."
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-blue-600 text-white px-4 py-2.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-2">
          Baltazar može griješiti. Provjerite važne informacije.
        </p>
      </div>
    </div>
  )
}
