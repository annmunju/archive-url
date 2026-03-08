import { API_BASE_URL, ApiError } from "@/api/client";
import type { SessionUser } from "./context";

type GetMeResponse = {
  user: SessionUser;
};

export async function getCurrentUserProfile(accessToken: string): Promise<GetMeResponse> {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let payload: { error?: { code?: string; message?: string; retryable?: boolean } } | null = null;
    try {
      payload = (await response.json()) as { error?: { code?: string; message?: string; retryable?: boolean } };
    } catch {
      payload = null;
    }

    throw new ApiError(
      response.status,
      payload?.error?.code ?? "INTERNAL_ERROR",
      payload?.error?.message ?? "사용자 정보를 불러오지 못했습니다.",
      payload?.error?.retryable ?? false,
    );
  }

  return (await response.json()) as GetMeResponse;
}
