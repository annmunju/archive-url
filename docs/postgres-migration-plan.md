# ArchiveURL Postgres 전환 계획

작성일: 2026-03-08  
대상: `backend/`  
목표: 현재 SQLite 기반 백엔드를 Postgres 기반 프로덕션 구조로 전환한다.

## 1. 문서 목적

이 문서는 아래를 정의한다.

- 왜 SQLite를 교체해야 하는지
- 어떤 방식으로 Postgres로 옮길지
- 스키마와 코드 구조를 어떻게 바꿀지
- 어떤 순서로 안전하게 마이그레이션할지
- 실패 시 어떻게 롤백할지

이 문서는 구현 작업 계획서다.

## 2. 현재 상태

현재 백엔드의 DB 계층은 [backend/app/db.py](/Users/anmunju/Documents/개발/archive-url/backend/app/db.py)에 집중되어 있다.

특징:

- Python 내장 `sqlite3` 직접 사용
- 애플리케이션 시작 시 스키마 자동 생성
- migration 툴이 없다
- DB 접근 로직과 저장소 로직이 한 파일에 섞여 있다
- 멀티유저 전환을 고려한 스키마가 아니다

현재 의존성:

- [backend/requirements.txt](/Users/anmunju/Documents/개발/archive-url/backend/requirements.txt) 에 Postgres 드라이버와 migration 툴이 없다

## 3. 왜 SQLite를 유지하면 안 되는가

개인용 앱에서는 SQLite가 충분했지만, 공개 서비스 기준에서는 한계가 명확하다.

문제:

- 동시성 제한이 크다
- 관리형 서비스와의 연결성이 약하다
- 백업/복구 전략이 제한적이다
- 마이그레이션 관리가 어렵다
- 멀티 인스턴스 확장이 사실상 불편하다
- worker/API 분리 이후 운영 복잡도가 급증한다

따라서 공개 출시 기준에서는 Postgres로 전환하는 것이 맞다.

## 4. 목표 상태

전환 완료 후 목표:

- DB는 관리형 Postgres 사용
- 스키마 변경은 migration 파일로 관리
- 앱 시작 시 자동 스키마 생성 제거
- DB 접근은 repository 계층으로 분리
- 인증/멀티유저 구조를 지원

## 5. 기술 선택

권장 조합:

- DB: Postgres 16+
- Python driver: `psycopg` 또는 `psycopg[binary]`
- ORM/쿼리 계층: 초기에는 SQLAlchemy Core 또는 SQLAlchemy ORM
- migration: Alembic

현실적 추천:

- **SQLAlchemy + Alembic + psycopg**

이유:

- Python 생태계 표준에 가깝다
- Alembic 연동이 자연스럽다
- 스키마 버전 관리를 쉽게 할 수 있다

비권장:

- SQLite 스타일 raw SQL 파일 하나에 계속 누적
- migration 없이 앱 startup에서 테이블 생성

## 6. 설계 원칙

### 원칙 1. DB 연결과 비즈니스 로직 분리

현재는 `DB` 클래스가 너무 많은 책임을 가진다.  
전환 후에는 아래를 분리한다.

- connection/session 관리
- schema model
- repository
- service layer

### 원칙 2. 마이그레이션은 항상 명시적으로 수행

앱 부팅 시 몰래 테이블을 만드는 구조는 운영에 불리하다.

전환 후:

- `alembic upgrade head`로만 스키마 변경

### 원칙 3. 멀티유저 기준으로 다시 스키마 설계

단순히 SQLite 테이블을 Postgres로 복제하면 안 된다.  
`user_id`, 인덱스, 제약조건을 포함해 다시 설계해야 한다.

### 원칙 4. 한 번에 큰 전환보다 단계적 전환

아래 순서가 맞다.

1. Postgres 인프라 도입
2. 마이그레이션 체계 도입
3. 신규 스키마 생성
4. 코드 전환
5. 데이터 이전
6. SQLite 제거

## 7. 목표 스키마 범위

최소 포함 테이블:

- `users`
- `user_sessions`
- `documents`
- `ingest_jobs`
- `audit_logs`

참고 기준:

- [docs/auth-and-multiuser-spec.md](/Users/anmunju/Documents/개발/archive-url/docs/auth-and-multiuser-spec.md)

## 8. 코드 구조 변경 계획

현재:

- [backend/app/db.py](/Users/anmunju/Documents/개발/archive-url/backend/app/db.py) 하나에 모든 저장 로직 집중

목표:

- `backend/app/db/engine.py`
- `backend/app/db/session.py`
- `backend/app/models/`
- `backend/app/repositories/users.py`
- `backend/app/repositories/documents.py`
- `backend/app/repositories/ingest_jobs.py`
- `backend/alembic/`

권장 구조 예시:

```text
backend/
  alembic/
  alembic.ini
  app/
    db/
      engine.py
      session.py
    models/
      user.py
      document.py
      ingest_job.py
    repositories/
      users.py
      documents.py
      ingest_jobs.py
    services/
      auth.py
      ingest.py
```

## 9. 환경 변수 변경

현재:

- `DB_PATH`

목표:

- `DATABASE_URL`

예시:

```env
DATABASE_URL=postgresql+psycopg://archiveurl:password@db-host:5432/archiveurl
```

추가:

- `ENVIRONMENT=development|staging|production`

전환 후:

- SQLite 전용 `DB_PATH`는 제거 또는 개발 전용 fallback으로만 유지

권장:

- 공개 서비스 전환 이후에는 `DATABASE_URL`만 사용

## 10. 단계별 마이그레이션 계획

## Phase 0. 준비

목표:

- 전환 작업을 시작할 최소 구조 확보

할 일:

- `psycopg`, `sqlalchemy`, `alembic` 의존성 추가
- Postgres 인스턴스 생성
- 개발용/스테이징용 DB 분리

완료 기준:

- 로컬에서 Postgres에 연결 가능

## Phase 1. DB 계층 뼈대 추가

목표:

- sqlite3 직결 구조와 별도로 새 DB 계층 생성

할 일:

- SQLAlchemy engine 생성
- 세션 팩토리 생성
- health query 작성
- Alembic 초기화

완료 기준:

- `alembic upgrade head`가 동작

## Phase 2. 신규 스키마 작성

목표:

- 멀티유저용 Postgres 스키마 생성

할 일:

- `users`
- `user_sessions`
- `documents`
- `ingest_jobs`
- `audit_logs`
- 인덱스/제약조건 정의

완료 기준:

- 빈 Postgres DB에 전체 스키마 생성 가능

## Phase 3. Repository 전환

목표:

- 기존 sqlite 로직을 Postgres repository로 옮김

할 일:

- 문서 조회/수정/삭제 repository 작성
- ingest job 생성/조회 repository 작성
- user upsert repository 작성

전략:

- 기존 기능을 하나씩 포팅
- 한 번에 전부 바꾸지 말고 읽기/쓰기 경로를 단계적으로 옮김

완료 기준:

- 핵심 API가 Postgres repository를 사용

## Phase 4. 인증 결합

목표:

- Postgres `users`와 인증 흐름을 연결

할 일:

- 토큰 검증 결과로 `users` upsert
- 보호 API에서 `current_user.id` 사용
- 모든 문서/작업 쿼리에 `user_id` 조건 추가

완료 기준:

- 멀티유저 데이터 격리 보장

## Phase 5. 데이터 이전

목표:

- SQLite 기존 데이터를 Postgres로 옮김

전제:

- 공개 출시 전이면 기존 데이터가 많지 않을 가능성이 높다

권장 전략:

- 초기 단계라면 **완전한 자동 이전보다, 1회성 import 스크립트**로 충분

이전 대상:

- `documents`
- `ingest_jobs`

필요 조건:

- 기존 데이터 소유자를 임시 사용자 하나로 귀속

작업 방식:

1. SQLite read-only 오픈
2. 임시 사용자 생성
3. `documents`를 해당 사용자 기준으로 insert
4. `ingest_jobs`를 해당 사용자 기준으로 insert
5. row count 검증
6. 샘플 spot check

완료 기준:

- row 수 일치
- 핵심 샘플 데이터 일치

## Phase 6. API 경로 완전 전환

목표:

- 서비스 코드에서 SQLite 제거

할 일:

- `db.py` 의존 제거
- startup 자동 schema 생성 제거
- SQLite 관련 환경 변수 제거

완료 기준:

- 애플리케이션이 Postgres 없이는 동작하지 않음

## Phase 7. 운영 안정화

목표:

- 프로덕션 운영 수준 확보

할 일:

- connection pool 튜닝
- 슬로우 쿼리 확인
- 인덱스 점검
- 백업/복구 시뮬레이션

완료 기준:

- 스테이징에서 안정 운영 가능

## 11. 데이터 이전 스크립트 정책

별도 스크립트 파일을 둔다.

권장 위치:

- `backend/scripts/migrate_sqlite_to_postgres.py`

스크립트 원칙:

- 읽기 원본은 SQLite
- 쓰기 대상은 Postgres
- dry-run 지원
- row count 출력
- 실패 시 트랜잭션 롤백

로그 항목:

- migrated documents count
- migrated ingest_jobs count
- skipped rows count
- duplicate rows count
- started_at
- finished_at

## 12. 인덱스 및 제약조건 계획

`documents`

- unique `(user_id, url)`
- index `(user_id, is_pinned desc, id desc)`

`ingest_jobs`

- unique `(request_id)`
- index `(user_id, status, updated_at desc)`
- index `(user_id, normalized_url)`
- partial unique `(user_id, idempotency_key, normalized_url)` where `idempotency_key is not null`

`users`

- unique `(auth_subject)`
- unique `(email)`

## 13. 테스트 계획

## 13.1 단위 테스트

- repository CRUD
- unique constraint 동작
- null/invalid input 처리

## 13.2 통합 테스트

- migration 적용 후 API 정상 동작
- 인증 사용자 기준 문서 분리
- ingest job 생성/조회/완료 흐름

## 13.3 데이터 이전 테스트

- SQLite fixture -> Postgres import
- row count 비교
- 랜덤 샘플 값 비교
- duplicate URL 처리 확인

## 13.4 성능 확인

- 문서 목록 조회
- ingest jobs polling 조회
- 동일 사용자 다중 요청 시 안정성

## 14. 롤백 계획

전환 실패 시 아래 순서를 따른다.

1. 프로덕션 트래픽 차단 또는 읽기 전용 전환
2. 신규 Postgres 배포 비활성화
3. 이전 안정 버전으로 롤백
4. SQLite 백업본 유지 상태 확인
5. 실패 원인 분석 후 재시도

중요:

- SQLite 원본은 전환 완료 전까지 삭제하지 않는다
- 첫 프로덕션 전환은 maintenance window를 잡고 진행한다

## 15. 구현 작업 티켓 초안

1. `requirements.txt`에 `sqlalchemy`, `alembic`, `psycopg` 추가
2. `DATABASE_URL` 기반 설정 추가
3. SQLAlchemy engine/session 모듈 작성
4. Alembic 초기화
5. 초기 Postgres schema migration 작성
6. users/documents/ingest_jobs repository 작성
7. health check를 Postgres 기반으로 전환
8. SQLite -> Postgres import 스크립트 작성
9. 기존 API를 repository 기반으로 전환
10. SQLite 코드 제거

## 16. 완료 기준

아래가 되면 Postgres 전환 완료로 본다.

- 앱 서버가 Postgres를 사용한다
- Alembic migration으로 스키마를 재현할 수 있다
- 문서/ingest 데이터가 Postgres에 저장된다
- SQLite 의존 runtime 코드가 제거된다
- 스테이징에서 인증 포함 전체 플로우가 동작한다

## 17. 후속 문서

다음으로 필요한 문서:

- `docs/auth-api-contract.md`
- `docs/app-store-launch-checklist.md`
- `docs/observability-and-ops-plan.md`
