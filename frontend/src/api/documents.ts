import { apiFetch } from "./client";
import type { CategoryItem, Document, DocumentListItem, ExtractedLink } from "./types";

type ListDocumentsResponse = {
  items: DocumentListItem[];
};

type GetDocumentResponse = {
  document: Document;
};

type ListCategoriesResponse = {
  items: CategoryItem[];
};

type PatchDocumentPayload = {
  title?: string;
  description?: string;
  links?: ExtractedLink[];
  is_pinned?: boolean;
};

export async function listDocuments(limit: number, offset: number): Promise<ListDocumentsResponse> {
  return apiFetch<ListDocumentsResponse>(`/documents?limit=${limit}&offset=${offset}`);
}

export async function getDocument(id: number): Promise<GetDocumentResponse> {
  return apiFetch<GetDocumentResponse>(`/documents/${id}`);
}

export async function listCategories(): Promise<ListCategoriesResponse> {
  return apiFetch<ListCategoriesResponse>("/categories");
}

export async function patchDocument(id: number, payload: PatchDocumentPayload): Promise<GetDocumentResponse> {
  return apiFetch<GetDocumentResponse>(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteDocument(id: number): Promise<void> {
  return apiFetch<void>(`/documents/${id}`, {
    method: "DELETE",
  });
}
