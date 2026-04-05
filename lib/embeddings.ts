import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Generira embedding vektor za dani tekst
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // 1536 dimenzija, ~$0.02/1M tokena
    input: text.slice(0, 8000), // Limit konteksta
  })
  return response.data[0].embedding
}

// Dijeli tekst na chunkove za embedding
export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end)

    // Izbjegavaj chunking usred rečenice
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const splitPoint = Math.max(lastPeriod, lastNewline)

      if (splitPoint > chunkSize * 0.5) {
        chunks.push(chunk.slice(0, splitPoint + 1))
        start += splitPoint + 1 - overlap
        continue
      }
    }

    chunks.push(chunk)
    start += chunkSize - overlap
  }

  return chunks.filter(c => c.trim().length > 50) // Ignoriraj premale chunkove
}
