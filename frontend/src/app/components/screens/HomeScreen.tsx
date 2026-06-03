import { VisitCard } from './VisitCard';

// 홈 = 통합 카메라 화면. 상단 토글(인증/직관카드)로 같은 카메라에서 모드 전환.
// 인증: 촬영 → AI 분석/확정 / 직관카드: 촬영 → 프레임 합성 → 저장.
export function HomeScreen() {
  return <VisitCard />;
}
