# KML 구조 (2026-10-15)

```
KML/
├─ README.md
├─ battle/
│  ├─ index.html        # 체장왕전 공개
│  ├─ admin.html        # 체장왕전 관리
│  └─ ibb/
│     ├─ index.html     # 인천브리더배틀 공개 (구 ibb.html)
│     └─ admin.html     # 인천브리더배틀 관리 (구 ibb-admin.html)
└─ docs/
   └─ STRUCTURE.md
```

## 마이그레이션 상태
- 체장왕전과 IBB HTML은 KML로 복사했으며 Beetle_Log 원본은 유지합니다.
- 체장왕전 이미지 4개는 Beetle_Log/main raw URL을 임시 참조합니다.
- IBB 문서가 참조하는 `ibb-poster.png`, `ibb-poster.jpg`는 원본 저장소 파일 목록에도 확인되지 않았습니다. 따라서 포스터 링크는 정상 표시를 보장하지 않으며 이미지 확보/수정이 필요합니다.
- 기존 Supabase 연결은 변경하지 않았습니다. 실제 조회/쓰기 및 관리자 인증 검증이 필요합니다.
- GitHub Pages 배포·실기기 확인·기존 URL 리다이렉트는 미완료입니다.

## 완료 조건
1. KML GitHub Pages 배포와 네 페이지 렌더링 확인
2. 체장왕전 이미지 자체 이관 및 IBB 포스터 자산 확보
3. 모든 페이지 상대 링크 및 Supabase 읽기/쓰기와 권한 확인
4. 기존 공개 URL의 링크 전환 또는 리다이렉트
5. 확인 후 Beetle_Log의 중복 페이지 정리
