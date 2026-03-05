import { apiFetch } from "./client";
import type { Document, DocumentListItem, ExtractedLink } from "./types";

type ListDocumentsResponse = {
  items: DocumentListItem[];
};

type GetDocumentResponse = {
  document: Document;
};

type PatchDocumentPayload = {
  title?: string;
  description?: string;
  links?: ExtractedLink[];
};

export async function listDocuments(limit: number, offset: number): Promise<ListDocumentsResponse> {
  return apiFetch<ListDocumentsResponse>(`/documents?limit=${limit}&offset=${offset}`);
}

export async function getDocument(id: number): Promise<GetDocumentResponse> {
  return apiFetch<GetDocumentResponse>(`/documents/${id}`);
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
