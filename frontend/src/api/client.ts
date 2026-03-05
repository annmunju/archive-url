import type { ApiErrorBody } from "./types";

class ApiError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor(status: number, code: string, message: string, retryable: boolean) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const fallbackBaseUrl = "http://localhost:3000";

export const API_BASE_URL = explicitBaseUrl ?? fallbackBaseUrl;

export { ApiError };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      errorBody = null;
    }

    throw new ApiError(
      response.status,
      errorBody?.error.code ?? "INTERNAL_ERROR",
      errorBody?.error.message ?? "요청 처리 중 오류가 발생했습니다.",
      errorBody?.error.retryable ?? false,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
