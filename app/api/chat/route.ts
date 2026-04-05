import Anthropic from '@anthropic-ai/sdk'
import { AnthropicStream, StreamingTextResponse } from 'ai'
import { retrieveRelevantChunks, formatContext, buildSystemPrompt } from '@/lib/rag'

export const runtime = 'edge'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Uzmi zadnje korisničko pitanje
  const lastUserMessage = messages[messages.length - 1]?.content || ''

  // RAG: dohvati relevantne chunkove
  const relevantChunks = await retrieveRelevantChunks(lastUserMessage, 5)
  const context = formatContext(relevantChunks)
  const systemPrompt = buildSystemPrompt(context)

  // Filtriraj poruke (makni system iz messages niza)
  const userMessages = messages.filter((m: { role: string }) => m.role !== 'system')

  // Pošalji Claudeu s RAG kontekstom
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: userMessages,
    stream: true,
  })

  // Vrati streaming odgovor
  const stream = AnthropicStream(response)
  return new StreamingTextResponse(stream)
}
