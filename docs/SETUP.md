# KML v0.2 운영 시작 안내

## 현재 상태

- KML 웹 프론트엔드는 `index.html`, `styles.css`, `app.js` (GitHub Pages 루트)입니다.
- Supabase 기존 **BeetleLog** 프로젝트 안에 `kml_` 접두사의 분리된 테이블 7개를 신규 생성했습니다. 기존 `beetlelog_data`, 체장왕전 관련 테이블은 수정하지 않았습니다.
- **첫 관리자 계정 1개가 승인되었습니다.** 미승인 Google 계정은 KML 데이터에 접근할 수 없습니다.
- 시연용 가짜 성충 데이터는 서버로 이전하지 않았습니다.

## 관리자 및 브리더 승인

최초 관리자 계정은 승인 완료되었습니다. 추가 관리자가 필요한 경우에만 Supabase 대시보드 → SQL Editor에서 다음 SQL의 이메일을 바꿔 실행합니다.

```sql
insert into public.kml_allowed_emails (email, role, active)
values (lower('YOUR_GOOGLE_EMAIL@gmail.com'), 'admin', true)
on conflict (email) do update set role='admin', active=true;
```

다른 브리더 승인:

```sql
insert into public.kml_allowed_emails (email, role, active)
values (lower('MEMBER_GOOGLE_EMAIL@gmail.com'), 'member', true)
on conflict (email) do update set active=true;
```

차단:

```sql
update public.kml_allowed_emails set active=false
where email=lower('MEMBER_GOOGLE_EMAIL@gmail.com');
```

## Google 로그인 리디렉션 설정

같은 Supabase 프로젝트를 사용하는 기존 BeetleLog의 Site URL은 **변경하지 마세요**.

1. Supabase → Authentication → URL Configuration → **Redirect URLs** 에 실제 공개 KML URL을 추가합니다.
   - `https://ljy5747.github.io/KML/` (Pages 사용 시)
   - 기타 자체 도메인을 쓸 경우 해당 URL을 추가합니다.
2. Authentication → Providers → Google이 활성화되어 있는지 확인합니다.
3. GitHub Pages 배포 확인 후 승인 이메일로 로그인합니다.

참고: Google OAuth 앱의 인증 callback은 Supabase가 기존에 쓰는 `https://qybgsztoegkzqsdipili.supabase.co/auth/v1/callback`이며 KML 자체로 바꾸지 않습니다.

## 현재 작동 기능

- 승인된 Google 사용자만 서버 데이터 접근 (RLS)
- 브리더 프로필: Google 사진 기본 사용, 닉네임·자기소개 수정
- 성충 등록·수정·목록 검색·정렬 및 4세대 계통도
- 교배 라인 생성과 부모 연결
- 성충 상세 댓글 작성·삭제
- 소유자 이동 이력을 기록하는 서버 원자적 처리
- 이미 업로드된 라인 유충을 조회/CSV 다운로드하는 구조

## 미구현 / 주의사항

- 기존 BeetleLog의 데이터 가져오기·양방향 동기화는 **미구현**입니다. 기존 데이터에 영향이 없습니다.
- 엑셀 단일 시트 가져오기/라인 매칭 **미구현**입니다.
- 개체 이미지 업로드와 실시간 동시 편집·충돌 처리 **미구현**입니다.
- 로그인은 승인된 Google 계정으로 가능하지만 GitHub Pages의 **HTML/JS 소스는 공개**됩니다. 중요한 데이터 보호는 RLS가 수행합니다.
- 다른 브리더이 수정한 데이터를 즉시 반영하지 않습니다. 업데이트를 보려면 새로고침합니다.
- 성충·라인 삭제 기능은 제공하지 않습니다. 기록 보존을 위해서입니다.
- 첫 관리자 이메일 승인은 완료되었습니다. KML 전용 Google 로그인 URL 등록과 실계정 로그인 검증은 확인이 필요합니다.

## 차기 개발

1. 운영 계정 최초 로그인/관리자 회원 승인 UI
2. 엑셀 한 라인/한 시트 업로드 → 미리보기 → 수정 병합
3. BeetleLog 기존 데이터 중복 검사·이관·공통 DB 읽기/쓰기
4. 사진 업로드 및 계통도 편집 개선