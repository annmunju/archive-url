# snap-url

AI 기반 URL 수집/정리/요약 API MVP입니다.

## 기능
- URL 입력
- URL 정규화(깨진 백슬래시/인코딩 보정)
- `https://r.jina.ai/http://원본URL` 방식으로 마크다운 수집
- 수집된 마크다운에서 본문/링크 추출
- LangGraph 파이프라인으로 요약 생성
- SQLite DB에 원문 메타데이터 + 요약 + 링크 저장

## 스택
- Node.js + TypeScript
- Express
- LangChain.js, LangGraph.js
- better-sqlite3 (SQLite)

## 시작
```bash
cp .env.example .env
npm install
npm run dev
```

## 환경변수
- `OPENAI_API_KEY`: 설정 시 LLM 요약 사용
- `OPENAI_MODEL`: 기본 `gpt-4o-mini`
- `PORT`: 기본 `3000`
- `DB_PATH`: 기본 `./data/snap-url.db`
- `JINA_FETCH_TIMEOUT_MS`: 기본 `20000`

`OPENAI_API_KEY`가 없으면 fallback 요약(본문 축약)으로 동작합니다.

## API
### `POST /ingest`
```json
{
  "url": "https://example.com"
}
```

성공 시 문서 ID, 정규화 URL, jina 미러 URL, 추출결과, 요약 반환.

### `GET /documents`
저장된 문서 목록 조회 (`?limit=20`)

### `GET /documents/:id`
저장된 문서 단건 조회

### `GET /health`
헬스체크
