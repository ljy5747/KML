# KML · 국균연구소 웹

KML v0.2: 왕사슴벌레 계보 및 성충·교배 라인 관리, Google OAuth + 승인 목록 + Supabase Row Level Security.

- `index.html`, `styles.css`, `app.js`: 정적 사이트 (GitHub Pages)
- `docs/SETUP.md`: 관리자 승인 계정 및 OAuth 리디렉트 설정 방법
- `docs/SCHEMA_REFERENCE.sql`: 적용한 KML 전용 DB 구조 참고본
- 기존 `battle/` 관련 파일은 그대로 유지

**배포 전:** `docs/SETUP.md`에 따라 KML URL을 Supabase Auth Redirect URLs에 추가하고 첫 관리자 Google 이메일을 승인해야 합니다. 승인 목록은 기본적으로 비어 있으며, 사이트는 로그인 후 허가된 회원에게만 데이터를 표시합니다.

이 버전은 DB 실사용을 위한 초기 구현입니다. Excel 업로드와 기존 BeetleLog 동기화는 아직 구현되지 않았습니다. 브라우저의 JS/HTML 파일은 공개될 수 있지만 DB에는 RLS가 설정되어 있습니다.