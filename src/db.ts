import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { ExtractedLink, StoredDocument } from "./types.js";

const dbPath = process.env.DB_PATH ?? "./data/snap-url.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT NOT NULL,
    links TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const upsertStmt = db.prepare(`
  INSERT INTO documents (url, title, description, content, summary, links)
  VALUES (@url, @title, @description, @content, @summary, @links)
  ON CONFLICT(url) DO UPDATE SET
    title=excluded.title,
    description=excluded.description,
    content=excluded.content,
    summary=excluded.summary,
    links=excluded.links
`);

const getByIdStmt = db.prepare(`
  SELECT id, url, title, description, content, summary, links, created_at
  FROM documents
  WHERE id = ?
`);

const getByUrlStmt = db.prepare(`
  SELECT id, url, title, description, content, summary, links, created_at
  FROM documents
  WHERE url = ?
`);

const listStmt = db.prepare(`
  SELECT id, url, title, description, content, summary, links, created_at
  FROM documents
  ORDER BY id DESC
  LIMIT ?
`);

function parseRow(row: any): StoredDocument {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    content: row.content,
    summary: row.summary,
    links: JSON.parse(row.links) as ExtractedLink[],
    created_at: row.created_at,
  };
}

export function upsertDocument(input: {
  url: string;
  title: string;
  description: string;
  content: string;
  summary: string;
  links: ExtractedLink[];
}): StoredDocument {
  upsertStmt.run({ ...input, links: JSON.stringify(input.links) });
  const row = getByUrlStmt.get(input.url);
  return parseRow(row);
}

export function getDocumentById(id: number): StoredDocument | null {
  const row = getByIdStmt.get(id);
  return row ? parseRow(row) : null;
}

export function listDocuments(limit = 20): StoredDocument[] {
  const rows = listStmt.all(limit) as any[];
  return rows.map(parseRow);
}
