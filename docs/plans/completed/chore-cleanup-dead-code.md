# chore: 죽은 코드 정리 (핸드오버 전)

> 카카오 전시용 GitHub 레포 핸드오버 전, 미사용 코드 제거. 빌드·테스트(`scripts/verify.sh`) 통과 유지.

## 범위

1. **`frontend/debug-v2.cjs`** — 임시 디버그 스크립트(untracked) 삭제
2. **RETURN(반납) 인증 죽은 코드 제거 → USE 인증만 남김**
   - 프론트: `verifyApi.ts`(`CertificationMode`/`modeToKind`/`'RETURN'` 유니온), `VisitCard.tsx`(`vMode`)
   - 백엔드: `verify.dto.ts`(`VerifyKind.RETURN`), `verify.service.ts`(RETURN 분기·`hasRecentUse`·`SCORE_RETURN`·12h 윈도우), `verify.service.spec.ts`(RETURN 테스트 2건)
   - 문서: `api-spec.md`, `CHANGELOG.md`
3. **미사용 아바타 엔드포인트 제거** (프론트 호출 0)
   - `users.controller.ts`(`PATCH /me/avatar`), `users.service.ts`(`updateAvatar`, `/me` 응답의 `avatarConfig`), `dto/update-avatar.dto.ts` 삭제
   - 문서: `api-spec.md`
   - **DB 컬럼(`users.avatarConfig`)·Prisma enum은 유지** (마이그레이션 리스크 회피)

## 비범위

- DB 스키마/마이그레이션 변경 없음 (kind enum, avatarConfig 컬럼 유지)
- 반납 인증을 되살릴 가능성은 git 히스토리로 충분

## 검증

- `cd backend && npm run build && npm test`
- `cd frontend && npm run build`
