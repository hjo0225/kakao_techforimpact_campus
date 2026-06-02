import { ReportScreen } from './ReportScreen';

// 홈 = 카메라 화면. 맨 위 용도 설정(인증/직관카드) + 아래 카메라 프레임.
// ReportScreen이 용도에 따라 인증 플로우 / 직관카드 플로우를 보여준다.
export function HomeScreen() {
  return <ReportScreen />;
}
