import { useState } from 'react';
import { useApp } from '../../AppContext';
import { ChevronRight } from 'lucide-react';
import { useNavigation } from '../../navigation';
import { KBO_TEAMS } from '../../teamBrand';
import { TeamBadge } from '../TeamBadge';
import { cx } from '../../classNames';
import { ActionBar, Button, Screen, ScreenHeader, ScrollArea } from '../design-system';
import { useAuthStore } from '../../../store/authStore';

export function TeamSelectScreen() {
  const { navigate } = useNavigation();
  const { setSelectedTeam } = useApp();
  const setTeam = useAuthStore((s) => s.setTeam);
  const [selected, setSelected] = useState<string | null>(null);

  const handleStart = () => {
    if (!selected) return;
    setSelectedTeam(selected);
    setTeam(selected);
    navigate('home');
  };

  return (
    <Screen>
      <ScreenHeader
        title="응원팀을 선택해주세요"
        description="팀 환경 리그 순위 연동을 위해 필수로 선택합니다"
      />

      <ScrollArea>
        <div className="cb-team-grid">
          {KBO_TEAMS.map((team) => {
            const isSelected = selected === team.name;
            return (
              <button
                key={team.name}
                onClick={() => setSelected(isSelected ? null : team.name)}
                className={cx('cb-team-card', isSelected && 'is-selected')}
              >
                <div className="cb-team-card__badge">
                  <TeamBadge teamName={team.name} size={34} />
                </div>
                <p className="cb-team-card__name">
                  {team.name}
                </p>
                {isSelected && (
                  <div className="cb-check-dot">✓</div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <ActionBar>
        <Button
          onClick={handleStart}
          variant={selected ? 'primary' : 'soft'}
          size="lg"
          fullWidth
          disabled={!selected}
        >
          {selected ? `${selected}으로 계속하기` : '팀 선택 후 계속하기'}
          <ChevronRight size={16} />
        </Button>
      </ActionBar>
    </Screen>
  );
}
