# ArchiveURL 마켓 출시 확장 계획

작성일: 2026-03-08  
대상: `frontend/` iOS 앱 + `backend/` FastAPI  
목표: 개인용 앱이 아니라, 로그인 기반의 실제 서비스 앱으로 확장해서 App Store에 출시한다.

## 1. 결론

지금 구조로는 바로 마켓 출시하면 안 된다.

현재 상태는:

- 단일 사용자 전제에 가깝다
- 인증/세션이 없다
- 데이터가 사용자별로 분리되지 않는다
- 백엔드가 SQLite 단일 프로세스 구조다

마켓 출시 기준의 추천 방향은 아래다.

1. **앱보다 먼저 백엔드를 멀티유저 서비스 구조로 전환한다.**
2. **SQLite를 Postgres로 전환한다.**
3. **로그인, 세션, 계정 삭제, 개인정보 처리 정책을 먼저 완성한다.**
4. **그 다음 TestFlight 베타 -> App Store 출시 순서로 간다.**

즉, 이 프로젝트는 이제 `배포 계획`이 아니라 `서비스 런치 계획`으로 봐야 한다.

## 2. 지금 부족한 점

현재 코드 기준에서 바로 보이는 제한:

- [backend/app/main.py](/Users/anmunju/Documents/개발/archive-url/backend/app/main.py): 모든 API가 인증 없이 열려 있다
- [backend/app/db.py](/Users/anmunju/Documents/개발/archive-url/backend/app/db.py): `documents`, `ingest_jobs`에 `user_id` 개념이 없다
- [frontend/src/api/client.ts](/Users/anmunju/Documents/개발/archive-url/frontend/src/api/client.ts): 토큰 저장, 인증 헤더, 세션 갱신 로직이 없다
- [frontend/src/navigation/RootNavigator.tsx](/Users/anmunju/Documents/개발/archive-url/frontend/src/navigation/RootNavigator.tsx): 로그인 전/후 화면 분리 구조가 없다

이 상태는:

- 내 데이터와 남의 데이터를 나눌 수 없고
- 악의적 호출을 막을 수 없고
- 리뷰 제출 시 서비스 운영 요건을 충족하기 어렵다

## 3. 목표 아키텍처

출시용 목표 구조는 아래가 맞다.

### 앱

- iOS 앱
- 로그인/회원가입/로그아웃/계정삭제 지원
- URL 공유 시트 지원
- 인증된 사용자 기준으로만 데이터 접근

### API

- FastAPI
- JWT access token + refresh token 또는 세션 기반 인증
- 사용자별 권한 검사
- rate limiting
- observability 로그

### 데이터

- PostgreSQL
- 사용자, 세션, 문서, ingest job, 감사 로그 분리

### 비동기 처리

- ingest worker 분리
- 큐 기반 처리
- 실패 재시도 / dead-letter 또는 오류 추적

### 운영 인프라

- HTTPS
- 프로덕션 도메인
- 비밀값 관리
- 백업
- 에러 추적

## 4. 권장 기술 결정

### 인증

권장:

- 이메일 로그인 + magic link 또는 passwordless
- iOS에서는 `Sign in with Apple` 추가 검토

이유:

- 공개 서비스에선 비밀번호 재설정, 이메일 인증, 계정 복구 비용이 생각보다 크다
- 소규모 팀이면 passwordless가 운영비가 적다

대안:

- Supabase Auth
- Clerk
- Auth0
- 직접 구현

현실적 추천:

- **초기 런치는 Supabase Auth 또는 Clerk**

직접 구현은 지금 단계에서 비용보다 리스크가 크다.

### 데이터베이스

권장:

- **Postgres**

이유:

- 멀티유저 서비스
- 동시성
- 백업/복구
- 관리형 서비스 연결성

### 백엔드 배포

권장 우선순위:

1. Railway
2. Render
3. Fly.io

초기엔 Railway가 가장 단순하다.

### 스토리지

현재는 외부 파일 스토리지가 없어도 되지만, 추후 아래가 생기면 필요하다.

- 썸네일
- 첨부 이미지
- export 파일
- 사용자 업로드 파일

그때는 S3 호환 스토리지를 붙인다.

## 5. 데이터 모델 확장

최소 추가 테이블:

- `users`
- `sessions` 또는 `refresh_tokens`
- `documents.user_id`
- `ingest_jobs.user_id`
- `audit_logs`
- `user_settings`

핵심 원칙:

- 모든 문서와 작업은 반드시 소유 사용자에 귀속
- API는 항상 인증된 사용자 컨텍스트에서만 동작
- 관리자 API와 일반 사용자 API를 분리

예시 방향:

```sql
users
- id
- email
- display_name
- auth_provider
- created_at
- deleted_at

documents
- id
- user_id
- url
- title
- ...

ingest_jobs
- id
- user_id
- normalized_url
- status
- ...
```

## 6. 반드시 필요한 제품 기능

마켓 출시 기준 MVP에는 아래가 필요하다.

### 계정 관련

- 회원가입
- 로그인
- 로그아웃
- 계정 삭제
- 약관/개인정보처리방침 링크

### 앱 기능

- URL 저장
- 문서 목록/상세/수정/삭제
- ingest 진행 상태 표시
- 실패 상태 재시도

### 운영/신뢰성

- 중복 요청 방지
- 기본 rate limiting
- 장애 로그
- 관리자용 에러 확인 수단

## 7. iOS/App Store 요구사항

출시 전에 아래를 준비해야 한다.

- Apple Developer Program 가입
- App Store Connect 앱 등록
- 개인정보처리방침 URL
- 앱 설명, 스크린샷, 키워드, 카테고리
- 앱 내부 계정 삭제 기능
- 리뷰용 테스트 계정 또는 리뷰 가능 상태의 서버
- 프로덕션 백엔드 상시 가동

추가 주의:

- 제3자 로그인만 넣는 경우, 조건에 따라 `Sign in with Apple` 요구를 받을 수 있다
- 커스텀 URL scheme만 쓰지 말고, 서비스 도메인과 Universal Links도 준비하는 편이 안전하다

## 8. 단계별 실행 계획

## Phase 0. 서비스 설계 확정

목표:

- 개인용 앱이 아니라 공개 서비스 기준으로 스펙 재정의

할 일:

- 가입/로그인 방식 결정
- 무료/유료 여부 결정
- 개인정보 저장 범위 정의
- App Store 공개 범위 정의
- 장애 대응 방식 정의

산출물:

- 서비스 정책 초안
- 인증 흐름 초안
- 데이터 모델 초안

## Phase 1. 인증/유저 모델 도입

목표:

- 앱을 사용자 단위 서비스로 바꾼다

할 일:

- `users` 모델 추가
- 세션 또는 토큰 구조 추가
- 프론트 로그인 화면 추가
- 인증 상태에 따라 내비게이션 분기
- API 인증 미들웨어 추가

완료 기준:

- 로그인한 사용자만 API 호출 가능
- 사용자 A가 사용자 B 데이터에 접근 불가

## Phase 2. 데이터베이스 전환

목표:

- SQLite를 서비스용 DB로 교체

할 일:

- Postgres 스키마 설계
- 마이그레이션 도구 도입
- 기존 SQLite 데이터 이전 스크립트 작성
- 인덱스와 제약조건 정리

완료 기준:

- 프로덕션 DB가 Postgres에서 안정적으로 동작

## Phase 3. 비동기 처리 분리

목표:

- API와 ingest 처리 분리

할 일:

- 작업 큐 도입
- worker 프로세스 분리
- 재시도 정책 정리
- 처리 실패 관측 가능하게 로그 추가

권장 예시:

- Redis + worker
- 또는 서비스형 큐

완료 기준:

- API 서버와 worker가 독립적으로 스케일 가능

## Phase 4. 프로덕션 인프라 구축

목표:

- 실제 사용자 트래픽을 받을 수 있는 운영 환경 확보

할 일:

- 프로덕션 도메인 구매
- HTTPS 연결
- API 서버 배포
- Postgres 관리형 배포
- 에러 추적 도구 도입
- 로그 수집 도입
- 백업 정책 설정

권장 구성:

- 앱: TestFlight -> App Store
- API: Railway 또는 Render
- DB: 관리형 Postgres
- 에러 추적: Sentry

완료 기준:

- 앱 심사 기간 동안 서버가 안정적으로 살아 있음

## Phase 5. 정책/리뷰 대응

목표:

- App Review에서 막히지 않게 준비

할 일:

- 개인정보처리방침 작성
- 이용약관 작성
- 앱 내 계정삭제 기능 제공
- 리뷰어 테스트 계정 준비
- 앱 설명/스크린샷 작성
- App Privacy 응답 정리

완료 기준:

- TestFlight 외부 테스터 및 App Review 제출 가능

## Phase 6. 베타 운영

목표:

- 실제 사용자 유입 전 장애를 줄인다

할 일:

- TestFlight 내부 테스트
- TestFlight 외부 베타
- 로그인 이탈률 체크
- ingest 실패율 체크
- 크래시 체크

완료 기준:

- 치명적 장애 없이 베타 사용자 유지 가능

## Phase 7. App Store 출시

목표:

- 공개 출시

할 일:

- 최종 빌드 제출
- 리뷰 대응
- 출시 국가 설정
- 고객 문의 채널 열기

완료 기준:

- App Store에서 다운로드 가능

## 9. 비용 계획

초기 공개 서비스 기준의 현실적 비용 범위:

| 항목 | 권장안 |
| --- | --- |
| Apple Developer Program | 연 $99 |
| API 서버 | 월 $5 ~ $20 |
| Postgres | 월 $0 ~ $25 |
| Auth 서비스 | 월 $0 ~ $25 |
| 도메인 | 연 $10 ~ $20 |
| 에러 추적/로그 | 초기 무료 티어 가능 |

초기 합계 감각:

- 아주 작게 시작하면 `월 $10 ~ $40 + 연 $99`

개인용 때와 달라지는 핵심:

- 이제 서버 월비용은 사실상 필수다
- Apple Developer Program도 필수다

## 10. 지금 하지 말아야 할 것

출시 전인데 아래를 먼저 하면 산만해진다.

- 안드로이드 동시 런치
- 자체 인증 직접 구현
- 과한 추천 시스템
- 복잡한 결제 모델
- 관리자 웹앱 대형화

먼저 해야 하는 건:

- 로그인
- 멀티유저 데이터 분리
- Postgres 전환
- 운영 안정성

## 11. 바로 다음 액션

지금 이 저장소 기준에서 실제 우선순위는 아래다.

1. 인증 방식 결정
2. `users` / `sessions` / `documents.user_id` / `ingest_jobs.user_id` 스키마 설계
3. Postgres 마이그레이션 계획 작성
4. 프론트 로그인 흐름 와이어프레임 작성
5. Railway 또는 Render 기준 배포 구조 초안 작성
6. TestFlight용 프로덕션 환경 구성

## 12. 최종 권장안

이 프로젝트를 마켓에 올릴 거면 아래 조합이 가장 현실적이다.

- 인증: Supabase Auth 또는 Clerk
- API: FastAPI 유지
- DB: Postgres
- 배포: Railway
- 베타: TestFlight
- 출시: App Store

한 줄로 정리하면:

**`지금은 앱 출시 준비보다, 멀티유저 서비스 아키텍처 전환이 먼저다.`**

## 13. 참고 링크

- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- App information in App Store Connect: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- Universal Links: https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content
- Expo authentication guide: https://docs.expo.dev/develop/authentication/
- Expo linking overview: https://docs.expo.dev/linking/overview/
- Railway pricing: https://docs.railway.com/pricing
- Render pricing: https://render.com/pricing
