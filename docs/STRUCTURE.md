# KML 구조 (2026-10-15)

```
KML/
├─ README.md
├─ battle/
│  ├─ index.html    # 2026 체장왕전 공개 페이지 (기존 battle.html)
│  └─ admin.html    # 체장왕전 관리자 페이지 (기존 battle-admin.html)
└─ docs/
   └─ STRUCTURE.md
```

## 의존성 / 이관 유의
- 4개 이미지 `battle-poster.jpg`, `battle-clash-1.jpg`, `battle-clash-2.jpg`, `battle-clash-3.jpg`는 현재 원본 Beetle_Log/main의 raw URL을 이용합니다. 별도 복사 완료 전 원본을 제거하지 마세요.
- 배틀 페이지의 Supabase 연결과 데이터 구조는 현재 기존 프로젝트를 참조합니다. 실제 CRUD 및 관리자 인증 테스트 전 DB 이전을 시도하지 마세요.
- `ibb.html`, `ibb-admin.html`은 별도 인천브리더배틀이므로 이번 이관 범위에서 제외했습니다.
- GitHub Pages 활성화/실기기 검증 및 외부 링크 갱신은 아직 완료하지 않았습니다.
- 사용자 페이지: `battle/index.html`, 관리자 페이지: `battle/admin.html`.

## 마이그레이션 완료 조건
1. KML GitHub Pages 배포 후 모바일/데스크톱 렌더링 확인
2. 이미지 및 관리자 진입 링크 검증
3. Supabase 읽기/쓰기 및 권한 검증
4. 기존 공개 URL 리다이렉트 또는 안내 페이지 배치
5. 원본 이미지 KML 이관 및 경로 변경 이후에만 Beetle_Log에서 중복 페이지 제거
