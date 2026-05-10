import { Lock } from 'lucide-react';
import { BottomNav } from '../BottomNav';
import { useNavigation } from '../../navigation';
import { Button, Screen, ScreenHeader } from '../design-system';

interface LockedScreenProps {
  tabName: string;
}

export function LockedScreen({ tabName }: LockedScreenProps) {
  const { navigate } = useNavigation();

  return (
    <Screen>
      <ScreenHeader />

      <div className="cb-empty-state">
        <div className="cb-empty-state__icon">
          <Lock size={30} color="#3DDB6D" strokeWidth={2} />
        </div>

        <h3 className="cb-empty-state__title">
          경기를 먼저 선택해주세요
        </h3>
        <p className="cb-empty-state__body">
          관람할 경기를 선택하면<br />{tabName} 기능이 활성화됩니다
        </p>

        <Button
          onClick={() => navigate('game-select')}
          size="lg"
          className="cb-empty-state__action"
        >
          관람할 경기 선택하기
        </Button>

        <p className="cb-empty-state__hint">
          기록 · 랭킹·혜택 · 프로그램은<br />경기 선택 없이도 이용 가능합니다
        </p>
      </div>

      <BottomNav />
    </Screen>
  );
}
