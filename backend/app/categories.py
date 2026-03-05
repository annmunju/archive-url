from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional


@dataclass(frozen=True)
class CategoryDef:
    key: str
    label: str
    order: int
    keywords: tuple[str, ...]
    enabled: bool = True


DEFAULT_CATEGORY_KEY = "uncategorized"

_BASE_CATEGORIES: tuple[CategoryDef, ...] = (
    CategoryDef(
        key="tech",
        label="기술",
        order=10,
        keywords=(
            "ai",
            "개발",
            "코드",
            "프로그래밍",
            "software",
            "engineering",
            "backend",
            "frontend",
            "tech",
            "api",
        ),
    ),
    CategoryDef(
        key="news",
        label="뉴스",
        order=20,
        keywords=(
            "news",
            "뉴스",
            "속보",
            "기사",
            "breaking",
            "headline",
            "press",
            "보도",
            "언론",
            "journal",
        ),
    ),
    CategoryDef(
        key="business",
        label="비즈니스",
        order=30,
        keywords=("biz", "business", "마케팅", "세일즈", "전략", "투자", "startup", "productivity"),
    ),
)

_DEFAULT_CATEGORY = CategoryDef(
    key=DEFAULT_CATEGORY_KEY,
    label="기타",
    order=9999,
    keywords=(),
)


def list_categories() -> list[dict[str, object]]:
    items = [item for item in _BASE_CATEGORIES if item.enabled]
    items.sort(key=lambda item: item.order)
    if all(item.key != DEFAULT_CATEGORY_KEY for item in items):
        items.append(_DEFAULT_CATEGORY)
    deduped: list[CategoryDef] = []
    seen: set[str] = set()
    for item in items:
        if item.key in seen:
            continue
        seen.add(item.key)
        deduped.append(item)
    return [{"key": item.key, "label": item.label, "order": item.order} for item in deduped]


def get_category_keys() -> list[str]:
    return [item["key"] for item in list_categories()]


def normalize_category_key(value: Optional[str]) -> str:
    if not value:
        return DEFAULT_CATEGORY_KEY
    normalized = value.strip().lower()
    return normalized if normalized in set(get_category_keys()) else DEFAULT_CATEGORY_KEY


def _iter_matchable_categories() -> Iterable[CategoryDef]:
    for item in _BASE_CATEGORIES:
        if not item.enabled:
            continue
        if item.key == DEFAULT_CATEGORY_KEY:
            continue
        yield item


def classify_category_key(*texts: str) -> str:
    value = " ".join(texts).lower()
    for item in _iter_matchable_categories():
        if any(keyword.lower() in value for keyword in item.keywords):
            return item.key
    return DEFAULT_CATEGORY_KEY
