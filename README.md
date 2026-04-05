# Baltazar — AI Chatbot za Visoko Obrazovanje, Turizam i Ugostiteljstvo

Kompletni RAG (Retrieval-Augmented Generation) chatbot koji koristi vaš Obsidian vault kao bazu znanja.

---

## Arhitektura sustava

```
Obsidian Vault (lokalno)
    ↓ Obsidian Git plugin (auto push svaki sat)
GitHub Repozitorij
    ↓ GitHub Actions (pokreće se na push .md datoteka)
Vercel API /api/ingest
    ↓ Embeddingsi (OpenAI text-embedding-3-small)
Supabase pgvector
    ↑ Semantic search pri svakom pitanju
Claude Sonnet 4.6 API
    ↓
Javni chatbot na Vercelu
```

---

## Brzi početak (30 minuta do prvog deploy)

### Korak 1 — Supabase baza

1. Otvorite [supabase.com](https://supabase.com) → New Project
2. Idite na **SQL Editor** → New Query
3. Kopirajte i pokrenite cijeli sadržaj datoteke `supabase-schema.sql`
4. Zabilježite: **Project URL**, **anon key**, **service_role key**

### Korak 2 — GitHub repozitorij

1. Kreirajte novi **private** repozitorij: `github.com/username/baltazar-vault`
2. U Obsidianu otvorite **Settings → Plugin treće strane → Git → Options**:
   - Remote URL: `https://github.com/username/baltazar-vault.git`
   - Auto pull interval: `10` minuta
   - Auto push interval: `60` minuta
   - Commit author: vaše ime/email
3. Pokrenite: **Git: Commit all changes** i **Git: Push**

### Korak 3 — Vercel deploy

1. Forkajte ili uploadajte ovaj projekt na GitHub
2. Idite na [vercel.com](https://vercel.com) → New Project → Import
3. Dodajte environment varijable (kopijte iz `.env.local.example`):

| Varijabla | Vrijednost |
|---|---|
| `ANTHROPIC_API_KEY` | Vaš Claude API ključ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | OpenAI API ključ |
| `GITHUB_TOKEN` | GitHub Personal Access Token (read:repo) |
| `GITHUB_REPO` | `username/baltazar-vault` |
| `INGEST_SECRET` | Nasumičan tajni string (npr. generiran s `openssl rand -hex 32`) |

4. Deploy → zabilježite URL (npr. `https://baltazar-chatbot.vercel.app`)

### Korak 4 — GitHub Actions secrets

U GitHub repozitoriju (vault repo) → Settings → Secrets → Actions:

| Secret | Vrijednost |
|---|---|
| `VERCEL_APP_URL` | `https://baltazar-chatbot.vercel.app` |
| `INGEST_SECRET` | Isti string kao u Vercelu |

### Korak 5 — Prva ingestija

```bash
# Ručno pokrenite iz GitHub Actions sučelja:
# Actions → "Ingestija Obsidian Vaulta" → Run workflow → force_reingest: true
```

---

## Scraping web sadržaja

```bash
# Instalacija
cd scraper
pip install -r requirements.txt

# Postavite putanju do vaulta (jednom)
export OBSIDIAN_VAULT_PATH="/Users/drago/Obsidian/Baltazar sef"

# Scraping jedne stranice
python scraper.py --url https://htz.hr/en-US --folder 01-Istrazivanje

# Scraping liste URL-ova
python scraper.py --file urls-primjer.txt --folder 02-Web-scraping

# Za JavaScript-heavy stranice (SPA, dynamički content)
python scraper.py --url https://example.com --jina --folder 02-Web-scraping
```

Sve scraped bilješke automatski se commitaju i pushaju na GitHub (Obsidian Git),
a GitHub Actions pokreće ingestiju u Supabase.

---

## Struktura Obsidian vaulta

```
Baltazar sef/
├── 01-Istrazivanje/      ← Akademska istraživanja, AI trendovi
├── 02-Web-scraping/      ← Automatski scraping web stranica
├── 03-Predavanja/        ← Materijali s predavanja
├── 04-Projekti/          ← Projektna dokumentacija
├── 05-Reference/         ← Bibliografije, citirani radovi
└── _Templates/           ← Predlošci za bilješke
```

---

## Razvoj lokalno

```bash
git clone https://github.com/username/baltazar-chatbot
cd baltazar-chatbot
npm install
cp .env.local.example .env.local
# Uredite .env.local s vašim ključevima
npm run dev
# Otvorite http://localhost:3000
```

---

## Troškovi (procjena)

| Servis | Plan | Trošak/mj |
|---|---|---|
| Vercel | Hobby (besplatno) | $0 |
| Supabase | Free tier | $0 |
| OpenAI Embeddings | ~1M tokena/mj | ~$0.02 |
| Anthropic Claude | ~100 poruka/dan | ~$5-15 |
| **Ukupno** | | **~$5-15/mj** |

---

## Licenca

MIT — slobodno koristite i prilagodite za vlastite potrebe.
