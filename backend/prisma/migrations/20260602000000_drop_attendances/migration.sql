-- 경기 선택(직관 의향) 기능 제거 — attendances 테이블 폐기
-- DropTable (CASCADE로 FK 제약도 함께 제거)
DROP TABLE IF EXISTS "attendances" CASCADE;
