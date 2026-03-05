import type { DocumentListItem } from "@/api/types";

const TITLE_PREFIX_REGEX = /^\s*title:\s*/i;
const JINA_MIRROR_REGEX = /jina markdown mirror from/i;
const URL_META_REGEX = /^\s*\[url 메타\]\s*/i;

export function cleanTitle(raw: string): string {
  return raw.replace(TITLE_PREFIX_REGEX, "").replace(URL_META_REGEX, "").trim();
}

export function cleanSummary(raw: string): string {
  return raw.replace(/\r/g, "").trim();
}

export function getListDescription(item: DocumentListItem): string {
  const description = item.description?.trim() ?? "";
  if (!description || JINA_MIRROR_REGEX.test(description)) {
    return cleanSummary(item.summary);
  }
  return description;
}
