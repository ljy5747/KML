# KML · 국균연구소 웹

왕사슴벌레 계보 및 성충·교배 라인 관리. Google OAuth + 승인 계정 목록 + Supabase RLS.

## BeetleLog 연결 (2026-10-22)

KML 웹과 BeetleLog 앱은 **같은 KML 성충·라인 테이블**을 조회하고 기록합니다.

- KML 웹: 로그인 → MY PAGE → 내 성충 / 내 라인
- BeetleLog 앱: 같은 Google 계정으로 로그인 → 설정 → **국균연구소 KML 연동** → KML 성충·라인 열기
- 한쪽에서 신규 성충·라인을 등록하면 상대쪽 KML 목록을 다시 열거나 새로고침하여 조회할 수 있습니다.
- 기존 BeetleLog `beetlelog_data` JSON(여러 종의 개인 사육기록)은 **변경하지 않았습니다**.
- KML 데이터 센터에서 본인 BeetleLog Google 계정 레코드에 대한 **읽기 전용 연결 확인**을 할 수 있습니다.

**아직 미구현:** BeetleLog 개인 성충/라인을 KML로 선별 이전하는 기능, 개인 탭과 KML 탭의 기록 자동 병합, 병갈이 기록 양방향 동기화, KML 엑셀 업로드. 단순 KML 공동 목록의 양방향 등록·조회와 혼동하지 마세요.

## 파일 구조

- `index.html`, `styles.css`, `app.js`: KML 웹(GitHub Pages)
- `docs/SETUP.md`: 승인 계정/Google OAuth 설정
- `docs/SCHEMA_REFERENCE.sql`: 초기 DB 구조 참고
- 기존 `battle/` 페이지 유지

## 보안

승인된 Google 계정만 KML 정보를 조회할 수 있도록 RLS로 제한했습니다. 일반 브리더는 자신이 소유하는 성충과 자신이 생성한 라인을 편집하고, 전체 브리더 명단은 관리자만 조회할 수 있습니다. 일반 브리더에게 필요한 작성자/소유자 닉네임은 제한된 조회를 사용합니다. 웹 소스는 공개되지만 DB가 공개되는 것은 아닙니다.
