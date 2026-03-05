# Snap URL Backend API 명세 v1

작성일: 2026-03-05
대상 서비스: `snap-url` (Node.js + Express + SQLite)

> iOS 클라이언트 디자인/UX 명세는 [app-design-spec.md](./app-design-spec.md) 참조.

---

## 1. 목적

- `POST /ingest`를 비동기 작업(Job) 생성 API로 전환한다.
- 문서 CRUD API(`GET`, `PATCH`, `DELETE`)를 제공한다.
- 클라이언트는 Job 상태를 폴링해서 완료 시 문서를 조회한다.

## 2. 범위

### 포함

- 비동기 Job 생성/조회 API
- Job 상태 모델 및 전이 규칙
- 문서 조회/수정/삭제 API
- DB 스키마 (`ingest_jobs`, `documents`)
- 실패 사유/재시도/타임아웃 정책
- 에러 규약

### 제외 (다음 단계)

- 푸시 알림
- 웹소켓/SSE 실시간 스트리밍
- 분산 큐 (Redis, SQS 등) 도입
- 카테고리 필터 서버 사이드 구현

---

## 3. 상태 모델

`status` 값:

| 상태 | 설명 |
|------|------|
| `queued` | 작업 생성됨, 아직 실행 전 |
| `running` | 파이프라인 실행 중 |
| `succeeded` | 성공, `document_id` 확정 |
| `failed` | 실패, `error_code`/`error_message` 기록 |

상태 전이:

```
queued ──→ running ──→ succeeded
  │           │
  │           └──→ failed
  └──────────────→ failed (사전 검증 실패)
```

종료 상태: `succeeded`, `failed`

---

## 4. 리소스 모델

### 4.1 IngestJob

```json
{
  "id": 101,
  "request_id": "9d42233a-f2a6-4f1a-9cf8-336f6f236f4f",
  "raw_url": "https://example.com",
  "normalized_url": "https://example.com/",
  "status": "running",
  "attempt": 1,
  "max_attempts": 2,
  "error_code": null,
  "error_message": null,
  "document_id": null,
  "created_at": "2026-03-05T09:00:00.000Z",
  "updated_at": "2026-03-05T09:00:02.000Z",
  "started_at": "2026-03-05T09:00:01.000Z",
  "finished_at": null
}
```

### 4.2 Document

```json
{
  "id": 55,
  "url": "https://example.com/article",
  "title": "AI의 미래",
  "description": "AI 기술의 발전과 미래 전망에 대한 문서",
  "content": "...",
  "summary": "이 문서는 AI 기술의 현재 상태와...",
  "links": [
    {
      "url": "https://link1.com/article",
      "content": "관련 기사 링크 설명"
    },
    {
      "url": "https://link2.com/resource",
      "content": "추가 리소스 링크 설명"
    }
  ],
  "created_at": "2026-03-05T09:00:00.000Z"
}
```

---

## 5. API 명세

### 5.1 `POST /ingest`

비동기 ingest Job 생성.

**Request:**

```json
{
  "url": "https://example.com/article"
}
```

**Headers (선택):**

- `Idempotency-Key`: 동일 요청 중복 생성 방지용 키 (권장)

**Response: `202 Accepted`**

```json
{
  "job": {
    "id": 101,
    "status": "queued",
    "raw_url": "https://example.com/article",
    "normalized_url": "https://example.com/article",
    "document_id": null,
    "error_code": null,
    "error_message": null,
    "created_at": "2026-03-05T09:00:00.000Z",
    "updated_at": "2026-03-05T09:00:00.000Z"
  },
  "links": {
    "self": "/ingest-jobs/101",
    "document": null
  }
}
```

**에러:**

| 코드 | HTTP | 설명 |
|------|------|------|
| `INVALID_REQUEST_BODY` | 400 | 요청 본문 형식 오류 |
| `INVALID_URL` | 400 | URL 형식 오류 |

### 5.2 `GET /ingest-jobs/:id`

Job 상태 조회.

**Response: `200 OK`**

```json
{
  "job": {
    "id": 101,
    "status": "succeeded",
    "raw_url": "https://example.com/article",
    "normalized_url": "https://example.com/article",
    "document_id": 55,
    "error_code": null,
    "error_message": null,
    "attempt": 1,
    "max_attempts": 2,
    "created_at": "2026-03-05T09:00:00.000Z",
    "updated_at": "2026-03-05T09:00:06.000Z",
    "started_at": "2026-03-05T09:00:01.000Z",
    "finished_at": "2026-03-05T09:00:06.000Z"
  },
  "links": {
    "document": "/documents/55"
  }
}
```

**에러:**

| 코드 | HTTP | 설명 |
|------|------|------|
| `JOB_NOT_FOUND` | 404 | 해당 ID의 Job 없음 |

### 5.3 `GET /ingest-jobs`

최근 Job 목록 조회 (운영/디버깅용).

**Query:**

| 파라미터 | 기본값 | 설명 |
|---------|-------|------|
| `limit` | 20 | 최대 100 |
| `status` | — | `queued`, `running`, `succeeded`, `failed` 중 택 1 (선택) |

**Response: `200 OK`**

```json
{
  "items": [
    {
      "id": 101,
      "status": "running",
      "normalized_url": "https://example.com/article",
      "document_id": null,
      "updated_at": "2026-03-05T09:00:02.000Z"
    }
  ]
}
```

### 5.4 `GET /documents`

문서 목록 조회.

**Query:**

| 파라미터 | 기본값 | 설명 |
|---------|-------|------|
| `limit` | 20 | 최대 100 |
| `offset` | 0 | 페이지네이션 오프셋 |

**Response: `200 OK`**

```json
{
  "items": [
    {
      "id": 55,
      "url": "https://example.com/article",
      "title": "AI의 미래",
      "description": "AI 기술의 발전과 미래 전망에 대한 문서",
      "summary": "이 문서는 AI 기술의...",
      "created_at": "2026-03-05T09:00:00.000Z"
    }
  ]
}
```

### 5.5 `GET /documents/:id`

문서 상세 조회.

**Response: `200 OK`**

```json
{
  "document": {
    "id": 55,
    "url": "https://example.com/article",
    "title": "AI의 미래",
    "description": "AI 기술의 발전과 미래 전망에 대한 문서",
    "content": "...",
    "summary": "이 문서는 AI 기술의 현재 상태와...",
    "links": [
      {
        "url": "https://link1.com/article",
        "content": "관련 기사 링크 설명"
      }
    ],
    "created_at": "2026-03-05T09:00:00.000Z"
  }
}
```

**에러:**

| 코드 | HTTP | 설명 |
|------|------|------|
| `DOCUMENT_NOT_FOUND` | 404 | 해당 ID의 문서 없음 |

### 5.6 `PATCH /documents/:id`

문서 수정. 전달된 필드만 업데이트한다.

**Request:**

```json
{
  "title": "수정된 제목",
  "description": "수정된 설명",
  "links": [
    {
      "url": "https://link1.com/article",
      "content": "관련 기사 링크 설명"
    },
    {
      "url": "https://newlink.com",
      "content": "새로 추가된 링크"
    }
  ]
}
```

> `links` 필드가 포함되면 기존 링크를 전체 교체한다 (PUT 시맨틱).

**Response: `200 OK`**

```json
{
  "document": {
    "id": 55,
    "url": "https://example.com/article",
    "title": "수정된 제목",
    "description": "수정된 설명",
    "content": "...",
    "summary": "이 문서는 AI 기술의 현재 상태와...",
    "links": [
      {
        "url": "https://link1.com/article",
        "content": "관련 기사 링크 설명"
      },
      {
        "url": "https://newlink.com",
        "content": "새로 추가된 링크"
      }
    ],
    "created_at": "2026-03-05T09:00:00.000Z"
  }
}
```

**에러:**

| 코드 | HTTP | 설명 |
|------|------|------|
| `DOCUMENT_NOT_FOUND` | 404 | 해당 ID의 문서 없음 |
| `INVALID_REQUEST_BODY` | 400 | 요청 본문 형식 오류 |

### 5.7 `DELETE /documents/:id`

문서 삭제.

**Response: `204 No Content`**

(빈 응답)

**에러:**

| 코드 | HTTP | 설명 |
|------|------|------|
| `DOCUMENT_NOT_FOUND` | 404 | 해당 ID의 문서 없음 |

### 5.8 `GET /health`

서버 상태 확인.

**Response: `200 OK`**

```json
{
  "status": "ok"
}
```

---

## 6. 에러 규약

공통 에러 응답 포맷:

```json
{
  "error": {
    "code": "JINA_FETCH_FAILED",
    "message": "Jina fetch failed: 522",
    "retryable": true
  }
}
```

### 에러 코드 목록

| 코드 | 설명 | retryable |
|------|------|-----------|
| `INVALID_REQUEST_BODY` | 요청 본문 형식 오류 | false |
| `INVALID_URL` | URL 형식 오류 | false |
| `JOB_NOT_FOUND` | Job 미존재 | false |
| `DOCUMENT_NOT_FOUND` | 문서 미존재 | false |
| `NORMALIZE_FAILED` | URL 정규화 실패 | false |
| `JINA_FETCH_FAILED` | Jina fetch 실패 | true |
| `EXTRACT_FAILED` | 콘텐츠 추출 실패 | true |
| `SUMMARIZE_FAILED` | AI 요약 실패 | true |
| `PERSIST_FAILED` | DB 저장 실패 | true |
| `INTERNAL_ERROR` | 내부 서버 오류 | false |

---

## 7. DB 스키마

### 7.1 `documents` (기존)

```sql
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  content TEXT,
  summary TEXT,
  links TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

> `links` 컬럼은 JSON 배열 문자열로 저장: `[{"url":"...","content":"..."}]`

### 7.2 `ingest_jobs` (신규)

```sql
CREATE TABLE IF NOT EXISTS ingest_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT,
  raw_url TEXT NOT NULL,
  normalized_url TEXT,
  status TEXT NOT NULL CHECK(status IN ('queued','running','succeeded','failed')),
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 2,
  error_code TEXT,
  error_message TEXT,
  document_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME,
  FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status_updated_at
  ON ingest_jobs(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_normalized_url
  ON ingest_jobs(normalized_url);
```

### 중복 요청 정책

- 같은 `Idempotency-Key` + 같은 URL이면 기존 Job 반환 (새 Job 미생성).
- 같은 URL의 `running` Job이 있으면 해당 Job 재사용 가능 (옵션, v1 권장).

---

## 8. 실행 모델 (v1)

- 앱 프로세스 내 메모리 큐 (in-process worker) 1개로 시작.
- 서버 시작 시 `queued`/`running` 잔여 Job을 스캔:
  - `running`은 `queued`로 되돌린 뒤 재처리
  - `attempt < max_attempts`인 Job만 재시도
- 동시 처리 수 기본 1 (환경변수 `INGEST_CONCURRENCY`로 확장 가능)

---

## 9. 재시도/타임아웃 정책

- 기본 `max_attempts = 2`
- 재시도 대상: 네트워크성 오류 (`JINA_FETCH_FAILED`, 일부 `SUMMARIZE_FAILED`)
- 재시도 비대상: 입력 검증 오류 (`INVALID_URL` 등)
- Jina fetch timeout: 기존 `JINA_FETCH_TIMEOUT_MS` 환경변수 사용

---

## 10. 하위호환/마이그레이션

- 기존 동기 `/ingest` 응답은 v1에서 제거하고 `202 + job`으로 통일.
- 단기 호환이 필요하면 임시로 `POST /ingest-sync`를 내부/개발용으로 유지 가능.

---

## 11. 완료 기준 (Definition of Done)

- [ ] `POST /ingest`가 항상 `202`와 Job 리소스를 반환
- [ ] `GET /ingest-jobs/:id`로 상태 추적 가능
- [ ] 성공 시 `document_id`가 연결되고 기존 문서 조회 API와 연동됨
- [ ] 실패 시 에러 코드/메시지 저장 및 반환
- [ ] 서버 재시작 후 미완료 Job 복구 동작
- [ ] `PATCH /documents/:id`로 제목, 설명, 링크 수정 가능
- [ ] `DELETE /documents/:id`로 문서 삭제 가능
- [ ] 에러 응답이 공통 포맷을 따름
