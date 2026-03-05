import type { DocumentListItem } from "@/api/types";

export type Category = "all" | "tech" | "design" | "business";

const rules: Record<Exclude<Category, "all">, RegExp> = {
  tech: /(ai|개발|코드|프로그래밍|software|engineering|web|backend|frontend|tech)/i,
  design: /(design|ux|ui|브랜딩|프로덕트 디자인|타이포)/i,
  business: /(biz|business|마케팅|세일즈|전략|투자|startup|productivity)/i,
};

export function detectCategory(item: DocumentListItem): Exclude<Category, "all"> | null {
  const value = `${item.title} ${item.description} ${item.summary}`.toLowerCase();
  const found = Object.entries(rules).find(([, regex]) => regex.test(value));
  return (found?.[0] as Exclude<Category, "all"> | undefined) ?? null;
}

export function applyCategoryFilter(items: DocumentListItem[], category: Category): DocumentListItem[] {
  if (category === "all") {
    return items;
  }
  return items.filter((item) => detectCategory(item) === category);
}
