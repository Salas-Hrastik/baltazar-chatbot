import { supabase } from './supabase'
import { generateEmbedding } from './embeddings'

export type RetrievedChunk = {
  id: string
  content: string
  metadata: {
    source: string
    title: string
    folder: string
    tags?: string[]
    url?: string
  }
  similarity: number
}

// Dohvaća najrelevantnije chunkove za dano pitanje
export async function retrieveRelevantChunks(
  query: string,
  limit = 5,
  similarityThreshold = 0.7
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query)

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: similarityThreshold,
    match_count: limit,
  })

  if (error) {
    console.error('Greška pri dohvatu dokumenata:', error)
    return []
  }

  return data || []
}

// Formatira dohvaćene chunkove u kontekst za Claude
export function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'Nema relevantnih informacija u bazi znanja.'
  }

  return chunks
    .map((chunk, i) => {
      const source = chunk.metadata.url
        ? `[${chunk.metadata.title}](${chunk.metadata.url})`
        : chunk.metadata.title

      return `### Izvor ${i + 1}: ${source}\n**Kategorija:** ${chunk.metadata.folder}\n\n${chunk.content}`
    })
    .join('\n\n---\n\n')
}

// Sistem prompt za Baltazar chatbot
export function buildSystemPrompt(context: string): string {
  return `Ti si Baltazar, AI asistent specijaliziran za visoko obrazovanje, turizam i ugostiteljstvo.

Koristiš sljedeće informacije iz baze znanja kako bi odgovorio na pitanja:

${context}

## Upute:
- Odgovaraj na jeziku na kojem je postavljeno pitanje (hrvatski ili engleski)
- Temeljи odgovore isključivo na dostavljenom kontekstu
- Ako informacija nije u kontekstu, jasno navedi da nemaš tu informaciju
- Budi precizan, koncizan i koristan
- Navedi izvore kada je moguće
- Za pitanja o turizmu, ugostiteljstvu i obrazovanju, pruži praktične savjete`
}
