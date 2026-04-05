import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateEmbedding, chunkText } from '@/lib/embeddings'
import matter from 'gray-matter'

// Tajni ključ za zaštitu endpointa od neautoriziranog pristupa
const INGEST_SECRET = process.env.INGEST_SECRET || 'change-me-in-production'

export async function POST(req: Request) {
  // Provjera autorizacije
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${INGEST_SECRET}`) {
    return NextResponse.json({ error: 'Neautoriziran pristup' }, { status: 401 })
  }

  try {
    // Dohvati sve markdown datoteke iz GitHub repozitorija
    const files = await fetchGitHubFiles()

    let processedCount = 0
    let errorCount = 0

    for (const file of files) {
      try {
        // Parsiraj frontmatter i sadržaj
        const { data: frontmatter, content } = matter(file.content)

        // Preskači prazne datoteke
        if (!content.trim()) continue

        // Podijeli na chunkove
        const chunks = chunkText(content)

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]

          // Generiraj embedding
          const embedding = await generateEmbedding(chunk)

          // Spremi u Supabase
          const { error } = await supabaseAdmin.from('documents').upsert({
            id: `${file.path}-chunk-${i}`,
            content: chunk,
            metadata: {
              source: file.path,
              title: frontmatter.title || file.name.replace('.md', ''),
              folder: file.folder,
              tags: frontmatter.tags || [],
              url: frontmatter.url || null,
              created_at: frontmatter.date || new Date().toISOString(),
            },
            embedding,
          })

          if (error) throw error
        }

        processedCount++
      } catch (err) {
        console.error(`Greška pri obradi ${file.path}:`, err)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: files.length,
    })
  } catch (error) {
    console.error('Ingestija neuspješna:', error)
    return NextResponse.json({ error: 'Ingestija neuspješna' }, { status: 500 })
  }
}

// Dohvaća sve .md datoteke iz GitHub repozitorija
async function fetchGitHubFiles() {
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH || 'main'
  const token = process.env.GITHUB_TOKEN

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Dohvati stablo svih datoteka
  const treeUrl = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`
  const treeRes = await fetch(treeUrl, { headers })
  const treeData = await treeRes.json()

  // Filtriraj samo .md datoteke (ne u .obsidian folderu)
  const mdFiles = treeData.tree.filter(
    (f: { type: string; path: string }) =>
      f.type === 'blob' &&
      f.path.endsWith('.md') &&
      !f.path.startsWith('.obsidian/')
  )

  // Dohvati sadržaj svake datoteke
  const files = await Promise.all(
    mdFiles.map(async (file: { path: string }) => {
      const contentUrl = `https://api.github.com/repos/${repo}/contents/${file.path}?ref=${branch}`
      const res = await fetch(contentUrl, { headers })
      const data = await res.json()

      return {
        path: file.path,
        name: file.path.split('/').pop() || '',
        folder: file.path.split('/')[0] || 'root',
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
      }
    })
  )

  return files
}
