# ARCHIVE-URL App Spec (Current Implementation)

작성일: 2026-03-06  
대상 구현: `frontend/` (Expo SDK 54, React Native)

## 1. 목적
현재 앱이 실제로 제공하는 화면/동작을 코드 기준으로 정리한다.

## 2. 화면 구성

### 2.1 홈 (`HomeScreen`)
- URL 입력
- `수집 시작` 버튼으로 `POST /ingest`
- 하단에 `수집 요청 현황` 표시
  - 5초 간격으로 `GET /ingest-jobs` 폴링
  - `queued`, `running`, `failed` 상태 표시

### 2.2 문서 목록 (`DocumentsScreen`)
- 제목: `내 문서`
- 카테고리 칩 필터 (`GET /categories`)
- 문서 목록 (`GET /documents`, 무한 스크롤)
- 카드 스와이프 액션
  - 좌측: 삭제 (`DELETE /documents/:id`)
  - 우측: 고정/해제 (`PATCH /documents/:id` with `is_pinned`)
- 상단 새로고침 버튼 및 Pull-to-refresh 지원

### 2.3 문서 상세 (`DocumentDetailScreen`)
- 문서 제목/URL/생성시각
- 요약, 메모(description), 링크 목록
- 액션
  - 수정 화면 이동
  - URL 공유
  - 링크 열기

### 2.4 문서 수정 (`EditDocumentScreen`)
- 제목/메모(description) 편집
- 요약은 읽기 전용
- 링크 추가/삭제
- 저장 시 `PATCH /documents/:id`

## 3. 네비게이션 구조
- Bottom Tabs
  - `Home`
  - `Documents`
- Stack
  - `DocumentDetail`
  - `EditDocument`

## 4. 상태/데이터
- 데이터 패칭: `@tanstack/react-query`
- API 기본 URL 우선순위:
  1. `EXPO_PUBLIC_API_BASE_URL`
  2. Metro host 기반 추론 (`http://<bundle-host>:3000`)
  3. fallback `http://localhost:3000`

실기기에서는 `localhost`가 단말 자신을 가리키므로 `.env` 설정이 필요하다.

## 5. 디자인 토큰
- 파일: `frontend/src/theme/tokens.ts`
- 주요 색상:
  - `background`, `primary`, `textPrimary`, `textSecondary`, `border`, `card`, `input`
- 기본 폰트:
  - Inter (`Inter_400Regular`, `Inter_600SemiBold`, `Inter_700Bold`)

## 6. 구현 범위/제한
- 별도 `처리 중 전용 화면`은 없음 (홈 화면의 현황 리스트로 상태 확인)
- 실시간 푸시/WebSocket/SSE 미지원 (폴링 기반)
- 오프라인 저장/동기화 미구현

## 7. 관련 문서
- 백엔드 API: [backend-async-ingest-spec-v1.md](./backend-async-ingest-spec-v1.md)
