#!/usr/bin/env python3
"""
Baltazar Web Scraper
====================
Scrapa web stranice i sprema sadržaj kao Markdown bilješke u Obsidian vault.

Korištenje:
  python scraper.py --url https://example.com --folder 02-Web-scraping
  python scraper.py --file urls.txt --folder 01-Istrazivanje
  python scraper.py --sitemap https://example.com/sitemap.xml

Instalacija:
  pip install -r requirements.txt
"""

import argparse
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


# ─── Konfiguracija ───────────────────────────────────────────────────────────

VAULT_PATH = os.getenv("OBSIDIAN_VAULT_PATH", os.path.expanduser("~/Obsidian/Baltazar sef"))
DEFAULT_FOLDER = "02-Web-scraping"
REQUEST_DELAY = 1.0  # sekunde između zahtjeva (budi ljubazan prema serverima)
MAX_RETRIES = 3
TIMEOUT = 15

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "hr,en;q=0.9",
}

# Domene koje treba preskočiti
BLOCKED_DOMAINS = {"facebook.com", "instagram.com", "twitter.com", "x.com"}

# CSS selektori za uklanjanje neželjenih elemenata
REMOVE_SELECTORS = [
    "nav", "header", "footer", "script", "style", "ads",
    ".cookie-banner", ".popup", ".newsletter-signup",
    "[class*='cookie']", "[class*='gdpr']", "[id*='cookie']",
    ".sidebar", ".comments", ".social-share"
]


# ─── Scraping funkcije ────────────────────────────────────────────────────────

def fetch_page(url: str) -> Optional[BeautifulSoup]:
    """Dohvaća HTML stranicu i vraća BeautifulSoup objekt."""
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            response.raise_for_status()
            return BeautifulSoup(response.text, "html.parser")
        except requests.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                print(f"  ⚠️  Pokušaj {attempt + 1}/{MAX_RETRIES} neuspješan: {e}")
                time.sleep(2 ** attempt)
            else:
                print(f"  ❌ Greška pri dohvatu {url}: {e}")
                return None


def extract_content(soup: BeautifulSoup, url: str) -> dict:
    """Izvlači relevantni sadržaj iz HTML stranice."""
    # Ukloni neželjene elemente
    for selector in REMOVE_SELECTORS:
        for element in soup.select(selector):
            element.decompose()

    # Naslov
    title = (
        (soup.find("h1") and soup.find("h1").get_text(strip=True)) or
        (soup.find("title") and soup.find("title").get_text(strip=True)) or
        urlparse(url).path.split("/")[-1] or
        "Bez naslova"
    )

    # Meta opis
    meta_desc = ""
    meta = soup.find("meta", attrs={"name": "description"})
    if meta:
        meta_desc = meta.get("content", "")

    # Datum objave
    pub_date = datetime.now().strftime("%Y-%m-%d")
    date_meta = soup.find("meta", attrs={"property": "article:published_time"})
    if date_meta:
        pub_date = date_meta.get("content", pub_date)[:10]

    # Tagovi
    tags = []
    keywords_meta = soup.find("meta", attrs={"name": "keywords"})
    if keywords_meta:
        tags = [t.strip() for t in keywords_meta.get("content", "").split(",") if t.strip()]

    # Glavni sadržaj — pokušaj prepoznati content area
    main_content = (
        soup.find("main") or
        soup.find("article") or
        soup.find(class_=re.compile(r"content|article|post|main", re.I)) or
        soup.find("body")
    )

    # Konvertiraj u Markdown
    markdown_content = html_to_markdown(main_content)

    return {
        "title": title,
        "url": url,
        "description": meta_desc,
        "date": pub_date,
        "tags": tags,
        "content": markdown_content,
        "domain": urlparse(url).netloc,
    }


def html_to_markdown(element) -> str:
    """Konvertira HTML element u Markdown format."""
    if not element:
        return ""

    lines = []

    for child in element.children:
        if hasattr(child, "name"):
            tag = child.name

            if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
                level = int(tag[1])
                text = child.get_text(strip=True)
                if text:
                    lines.append(f"\n{'#' * level} {text}\n")

            elif tag == "p":
                text = child.get_text(separator=" ", strip=True)
                if text:
                    lines.append(f"\n{text}\n")

            elif tag in ("ul", "ol"):
                for li in child.find_all("li", recursive=False):
                    text = li.get_text(separator=" ", strip=True)
                    if text:
                        lines.append(f"- {text}")
                lines.append("")

            elif tag == "blockquote":
                text = child.get_text(separator=" ", strip=True)
                if text:
                    lines.append(f"\n> {text}\n")

            elif tag == "a":
                href = child.get("href", "")
                text = child.get_text(strip=True)
                if text and href:
                    lines.append(f"[{text}]({href})")
                elif text:
                    lines.append(text)

            elif tag == "strong" or tag == "b":
                text = child.get_text(strip=True)
                if text:
                    lines.append(f"**{text}**")

            elif tag in ("em", "i"):
                text = child.get_text(strip=True)
                if text:
                    lines.append(f"*{text}*")

            elif tag == "table":
                lines.append(table_to_markdown(child))

            elif tag in ("div", "section", "article"):
                lines.append(html_to_markdown(child))

        else:
            # Tekst čvor
            text = str(child).strip()
            if text and not text.isspace():
                lines.append(text)

    return "\n".join(lines)


def table_to_markdown(table) -> str:
    """Konvertira HTML tablicu u Markdown tablicu."""
    rows = table.find_all("tr")
    if not rows:
        return ""

    md_rows = []
    for i, row in enumerate(rows):
        cells = row.find_all(["th", "td"])
        cell_texts = [c.get_text(strip=True).replace("|", "\\|") for c in cells]
        md_rows.append("| " + " | ".join(cell_texts) + " |")
        if i == 0:
            md_rows.append("|" + "|".join([" --- " for _ in cells]) + "|")

    return "\n" + "\n".join(md_rows) + "\n"


# ─── Obsidian bilješka ────────────────────────────────────────────────────────

def create_obsidian_note(data: dict, folder: str) -> str:
    """Kreira Obsidian Markdown bilješku s frontmatterom."""
    tags_str = "\n".join([f"  - {tag}" for tag in data.get("tags", [])]) or "  - web-scraping"

    frontmatter = f"""---
title: "{data['title'].replace('"', "'")}"
url: "{data['url']}"
date: {data['date']}
domain: {data['domain']}
tags:
{tags_str}
scraped_at: {datetime.now().isoformat()}
---

"""

    header = f"# {data['title']}\n\n"
    source_info = f"> **Izvor:** [{data['domain']}]({data['url']})\n"
    if data.get("description"):
        source_info += f"> **Opis:** {data['description']}\n"
    source_info += "\n"

    return frontmatter + header + source_info + data["content"]


def save_note(content: str, title: str, folder: str) -> Path:
    """Sprema bilješku u Obsidian vault."""
    # Sanitiziraj naziv datoteke
    safe_title = re.sub(r'[<>:"/\\|?*]', "-", title)
    safe_title = safe_title[:100].strip("-")  # Max 100 znakova

    output_dir = Path(VAULT_PATH) / folder
    output_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{safe_title}.md"
    filepath = output_dir / filename

    # Dodaj timestamp ako datoteka već postoji
    if filepath.exists():
        timestamp = datetime.now().strftime("%Y%m%d-%H%M")
        filename = f"{safe_title}-{timestamp}.md"
        filepath = output_dir / filename

    filepath.write_text(content, encoding="utf-8")
    return filepath


# ─── Jina.ai Reader (alternativa za JS-heavy stranice) ───────────────────────

def fetch_with_jina(url: str) -> Optional[str]:
    """Koristi Jina.ai Reader API za pretvorbu web stranice u Markdown."""
    jina_url = f"https://r.jina.ai/{url}"
    try:
        response = requests.get(jina_url, headers=HEADERS, timeout=TIMEOUT)
        if response.status_code == 200:
            return response.text
    except requests.RequestException:
        pass
    return None


# ─── Glavni programski tok ────────────────────────────────────────────────────

def scrape_url(url: str, folder: str, use_jina: bool = False) -> bool:
    """Scrapa jednu URL i sprema kao Obsidian bilješku."""
    domain = urlparse(url).netloc

    # Provjeri blokirane domene
    if any(blocked in domain for blocked in BLOCKED_DOMAINS):
        print(f"  ⛔ Preskačem blokiranu domenu: {domain}")
        return False

    print(f"  🌐 Scraping: {url}")

    if use_jina:
        # Jina.ai za JS-heavy stranice
        content = fetch_with_jina(url)
        if content:
            title = url.split("/")[-1] or domain
            note_content = f"""---
title: "{title}"
url: "{url}"
date: {datetime.now().strftime('%Y-%m-%d')}
scraped_at: {datetime.now().isoformat()}
method: jina-reader
---

{content}"""
            filepath = save_note(note_content, title, folder)
            print(f"  ✅ Spremljeno: {filepath.name}")
            return True
        return False

    # Standardni scraping
    soup = fetch_page(url)
    if not soup:
        return False

    data = extract_content(soup, url)
    if not data["content"].strip():
        print(f"  ⚠️  Prazan sadržaj, preskačem: {url}")
        return False

    note_content = create_obsidian_note(data, folder)
    filepath = save_note(note_content, data["title"], folder)
    print(f"  ✅ Spremljeno: {filepath.name} ({len(data['content'])} znakova)")
    return True


def process_url_file(filepath: str, folder: str, use_jina: bool = False):
    """Procesira datoteku s listom URL-ova (jedan po liniji)."""
    path = Path(filepath)
    if not path.exists():
        print(f"❌ Datoteka ne postoji: {filepath}")
        return

    urls = [
        line.strip()
        for line in path.read_text().splitlines()
        if line.strip() and not line.startswith("#")
    ]

    print(f"\n📋 Procesiranje {len(urls)} URL-ova iz {filepath}...")
    success = 0

    for i, url in enumerate(urls, 1):
        print(f"\n[{i}/{len(urls)}]", end=" ")
        if scrape_url(url, folder, use_jina):
            success += 1
        time.sleep(REQUEST_DELAY)

    print(f"\n✨ Završeno: {success}/{len(urls)} uspješno scraped")


# ─── CLI Interface ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Baltazar Web Scraper — sprema web sadržaj u Obsidian vault",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Primjeri:
  python scraper.py --url https://htz.hr/en-US --folder 01-Istrazivanje
  python scraper.py --file urls.txt --folder 02-Web-scraping
  python scraper.py --url https://spa-hotel.hr --jina --folder 02-Web-scraping
        """
    )

    parser.add_argument("--url", help="Jedna URL za scraping")
    parser.add_argument("--file", help="Putanja do datoteke s URL listom")
    parser.add_argument("--folder", default=DEFAULT_FOLDER, help=f"Obsidian folder (default: {DEFAULT_FOLDER})")
    parser.add_argument("--vault", help=f"Putanja do Obsidian vaulta (default: {VAULT_PATH})")
    parser.add_argument("--jina", action="store_true", help="Koristi Jina.ai Reader (za JS stranice)")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY, help=f"Pauza između zahtjeva u sec (default: {REQUEST_DELAY})")

    args = parser.parse_args()

    if args.vault:
        global VAULT_PATH
        VAULT_PATH = args.vault

    REQUEST_DELAY_GLOBAL = args.delay

    if not args.url and not args.file:
        parser.print_help()
        sys.exit(1)

    print(f"\n🏛️  Baltazar Web Scraper")
    print(f"📂 Vault: {VAULT_PATH}")
    print(f"📁 Folder: {args.folder}")
    print(f"🔧 Metoda: {'Jina.ai Reader' if args.jina else 'Standardni scraping'}\n")

    if args.url:
        scrape_url(args.url, args.folder, args.jina)
    elif args.file:
        process_url_file(args.file, args.folder, args.jina)


if __name__ == "__main__":
    main()
