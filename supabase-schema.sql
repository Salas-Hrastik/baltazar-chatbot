-- ============================================================
-- BALTAZAR CHATBOT — Supabase Vector Database Schema
-- Pokrenite ovaj SQL u Supabase SQL Editoru
-- ============================================================

-- 1. Aktiviraj pgvector ekstenziju
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Kreira tablicu dokumenata s vektorskim embeddingima
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,                    -- npr. "01-Istrazivanje/ai-turizam.md-chunk-0"
  content     TEXT NOT NULL,                       -- Tekst chunka
  metadata    JSONB NOT NULL DEFAULT '{}',         -- Naslov, folder, tagovi, URL...
  embedding   VECTOR(1536),                        -- OpenAI text-embedding-3-small dimenzije
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indeks za brzo vektorsko pretraživanje (HNSW algoritam)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Indeks za filtriranje po folderu/kategoriji
CREATE INDEX IF NOT EXISTS documents_metadata_folder_idx
  ON documents
  USING gin (metadata);

-- 5. Automatski updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. Funkcija za semantičko pretraživanje (koristi RAG)
-- ============================================================
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id          TEXT,
  content     TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 7. Row Level Security (RLS) — javno čitanje, samo admin piše
-- ============================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Svi mogu čitati dokumente (potrebno za chatbot)
CREATE POLICY "Javno čitanje dokumenata"
  ON documents FOR SELECT
  USING (true);

-- Samo service_role može pisati (ingestija iz GitHub Actions)
CREATE POLICY "Samo servis može pisati"
  ON documents FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 8. Korisna view za statistike
-- ============================================================
CREATE OR REPLACE VIEW vault_statistics AS
SELECT
  metadata->>'folder' AS folder,
  COUNT(*) AS broj_chunkova,
  COUNT(DISTINCT metadata->>'source') AS broj_datoteka,
  MAX(updated_at) AS zadnje_azuriranje
FROM documents
GROUP BY metadata->>'folder'
ORDER BY broj_chunkova DESC;

-- ============================================================
-- TESTIRANJE — provjerite rade li funkcije
-- ============================================================
-- SELECT COUNT(*) FROM documents;
-- SELECT * FROM vault_statistics;
