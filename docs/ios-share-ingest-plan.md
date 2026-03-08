# iOS Share to Ingest Plan

작성일: 2026-03-07  
대상: `frontend/` iPhone 앱  
목표: iPhone 공유 시트에서 `ARCHIVE-URL`을 선택하면 앱이 열리고, 공유된 링크를 수집 요청으로 쌓을 수 있게 만든다.

## 1. 목표 정의

사용자 흐름:

1. Safari, Chrome, 기타 앱에서 링크 공유
2. iOS 공유 시트에서 `ARCHIVE-URL` 선택
3. ARCHIVE-URL 앱 실행
4. 공유된 URL이 앱에 전달됨
5. 사용자가 확인 후 `수집 시작`
6. ingest job 생성 후 홈 화면 목록에 반영

이번 작업의 MVP 범위:

- `URL 1개` 공유만 우선 지원
- 공유 후 앱을 열어 `Home` 화면 입력창에 URL을 미리 채움
- 사용자가 직접 `수집 시작` 버튼을 누르는 방식

MVP에서 제외:

- 여러 링크 동시 공유
- 이미지, 파일, HTML 조각 공유
- extension 화면 안에서 직접 API 호출
- Android 공유 인텐트 동시 지원

## 2. 현재 상태

이미 준비된 것:

- URL scheme 존재: `snapurl`
- iOS Linking bridge 연결됨
- 앱 홈 화면에 URL 입력 + ingest 생성 흐름 존재

관련 파일:

- `frontend/app.json`
- `frontend/ios/SnapURL/Info.plist`
- `frontend/ios/SnapURL/AppDelegate.mm`
- `frontend/src/screens/HomeScreen.tsx`
- `frontend/src/navigation/RootNavigator.tsx`

부족한 것:

- iOS 공유 시트에 앱을 노출하는 `Share Extension`
- extension과 본 앱 사이의 안전한 데이터 전달 통로
- 앱 시작 시 공유 payload를 읽어서 홈 화면에 반영하는 로직

## 3. 권장 아키텍처

MVP 권장 흐름:

1. iOS Share Extension이 공유된 URL을 받음
2. extension이 URL을 App Group 저장소에 기록
3. extension이 `snapurl://ingest-from-share` 딥링크로 본 앱 실행 시도
4. 본 앱이 시작되면 App Group 저장소에서 공유 payload를 읽음
5. `HomeScreen` 입력창에 URL을 prefill
6. 사용자가 `수집 시작`

이 구조를 선택하는 이유:

- 공유 시트 노출은 Share Extension 없이는 불가능
- extension에서 바로 API 호출하면 인증, 실패 복구, 중복 처리 복잡도가 커짐
- 앱에서 최종 확인 후 요청하는 방식이 가장 단순하고 안전함

## 4. 세부 작업 계획

### 4.1 Share Extension 추가

작업:

- iOS 프로젝트에 Share Extension target 추가
- extension이 `public.url`, `public.plain-text`를 받을 수 있게 설정
- `NSExtensionActivationRule` 구성

산출물:

- `frontend/ios/` 하위에 Share Extension target
- extension용 `Info.plist`
- extension 진입 코드

완료 기준:

- 실제 iPhone 공유 시트에서 `ARCHIVE-URL`이 보인다

### 4.2 App Group 구성

작업:

- 메인 앱과 Share Extension에 동일한 App Group entitlement 추가
- 예: `group.com.snapurl.app`
- 공유 payload를 App Group `UserDefaults` 또는 공유 파일에 기록

권장:

- MVP는 `UserDefaults(suiteName:)`에 단일 payload 저장

산출물:

- 메인 앱 entitlement
- extension entitlement
- 공용 저장 키

완료 기준:

- extension이 저장한 URL을 본 앱이 읽을 수 있다

### 4.3 공유 payload 계약 정의

공유 데이터 형식:

```ts
type SharedIngestPayload = {
  url: string;
  receivedAt: string;
  source?: string;
};
```

원칙:

- URL 1개만 저장
- 읽은 뒤 즉시 소비하고 삭제
- 잘못된 데이터면 무시

완료 기준:

- extension과 앱이 동일한 데이터 형식을 사용한다

### 4.4 본 앱 딥링크 처리

작업:

- `NavigationContainer` linking 설정 또는 앱 루트에서 `Linking.getInitialURL`, URL 이벤트 처리
- `snapurl://ingest-from-share` 수신 시 공유 payload 읽기
- 앱 cold start / background / foreground 모두 대응

관련 위치:

- `frontend/src/navigation/RootNavigator.tsx`
- 필요하면 `frontend/App.tsx`

완료 기준:

- 딥링크 호출 시 앱이 공유 payload 소비 루틴을 실행한다

### 4.5 Home 화면 prefill 연결

작업:

- `HomeScreen`에 외부 공유 URL 주입 경로 추가
- 공유 URL이 있으면 input value 설정
- 필요 시 1회성 배너 또는 안내 문구 표시

권장 UX:

- 자동 수집보다 prefill 후 사용자가 직접 확인하고 요청

관련 위치:

- `frontend/src/screens/HomeScreen.tsx`

완료 기준:

- 공유 후 앱이 열리면 URL이 입력창에 들어가 있다

### 4.6 ingest 요청 및 후처리

작업:

- 기존 `createIngestJob` 흐름 재사용
- 성공 시 ingest jobs invalidate
- prefill 처리 후 중복 실행 방지

완료 기준:

- 공유된 URL도 기존 수동 입력과 동일하게 ingest job 생성

## 5. 구현 순서

1. iOS Share Extension target 생성
2. App Group entitlement 연결
3. extension에서 URL 저장
4. 딥링크로 본 앱 실행
5. RN 앱에서 공유 payload 읽기
6. `HomeScreen` prefill
7. 실제 기기 테스트

## 6. 리스크와 판단

### 리스크 1. Expo 관리 범위

이 기능은 JS만으로 끝나지 않는다.  
`frontend/ios` 네이티브 프로젝트 수정이 필요하다.

판단:

- 현재는 이미 `ios/` 디렉터리가 있으므로 bare/native 수정으로 가는 것이 맞다.

### 리스크 2. 공유 시트에서 앱 실행 안정성

extension에서 본 앱 호출은 iOS 정책과 타이밍에 민감하다.

판단:

- MVP는 “저장 후 딥링크 실행”으로 단순화
- 실패 시에도 payload는 남아 있어야 함

### 리스크 3. 중복 처리

공유 후 앱이 여러 번 열리거나 payload가 재소비될 수 있다.

판단:

- payload에 `receivedAt` 추가
- 읽은 후 즉시 삭제
- 같은 payload 재처리 방지 플래그 고려

### 리스크 4. URL이 아닌 공유 데이터

plain text나 복합 공유에서 URL 파싱이 실패할 수 있다.

판단:

- MVP는 URL 우선
- plain text는 URL 1개 추출 시만 허용

## 7. 테스트 계획

실기기 기준 테스트:

1. Safari 페이지 공유 → ARCHIVE-URL 진입 → Home prefill 확인
2. Chrome URL 공유 → 동일 동작 확인
3. 메모 앱 텍스트 공유 → URL 포함 시만 동작 확인
4. 앱 종료 상태에서 공유 → cold start 처리 확인
5. 앱 백그라운드 상태에서 공유 → resume 처리 확인
6. 잘못된 URL 공유 → 무시 또는 오류 안내 확인
7. 같은 링크 연속 공유 → 중복 처리 확인

## 8. 완료 기준

다음이 모두 되면 MVP 완료:

- iPhone 공유 시트에서 `ARCHIVE-URL`이 보임
- 링크 공유 시 앱이 열림
- `Home` 입력창에 링크가 채워짐
- 사용자가 `수집 시작`을 누르면 ingest job이 생성됨
- 홈 화면 진행 현황에 바로 반영됨

## 9. 구현 메모

예상 수정 파일:

- `frontend/app.json`
- `frontend/ios/SnapURL/Info.plist`
- `frontend/ios/SnapURL/AppDelegate.mm`
- `frontend/src/navigation/RootNavigator.tsx`
- `frontend/src/screens/HomeScreen.tsx`

추가 생성 가능 파일:

- iOS Share Extension 관련 파일들
- 공유 payload bridge 또는 native module
- shared ingest 유틸
