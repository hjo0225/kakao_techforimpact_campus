import { useState } from 'react';
import { useApp, type GameInfo } from '../../AppContext';
import { X, CheckCircle } from 'lucide-react';
import { useNavigation } from '../../navigation';
import { TeamBadge } from '../TeamBadge';
import { cx } from '../../classNames';
import { Button, Screen, ScreenHeader, ScrollArea } from '../design-system';

const GAMES: GameInfo[] = [
  { home: 'LG', away: '두산', venue: '잠실 야구장', time: '18:30', inning: '7회말', score: '5 : 3' },
  { home: 'SSG', away: 'KT', venue: '인천 SSG랜더스필드', time: '18:30', inning: '5회초', score: '2 : 1' },
  { home: 'NC', away: '한화', venue: '창원 NC파크', time: '18:30', inning: '3회말', score: '0 : 2' },
  { home: '롯데', away: '키움', venue: '사직 야구장', time: '18:30', inning: '6회초', score: '4 : 4' },
];

const DATE_TABS = ['오늘', '내일', '날짜 선택'];

export function GameSelectScreen() {
  const { navigate } = useNavigation();
  const { selectedTeam, setSelectedGame } = useApp();
  const [activeDate, setActiveDate] = useState(0);

  const isFavorite = (game: GameInfo) =>
    selectedTeam && (game.home.includes(selectedTeam.split(' ')[0]) || game.away.includes(selectedTeam.split(' ')[0]));

  const handleSelect = (game: GameInfo) => {
    setSelectedGame(game);
    navigate('home');
  };

  return (
    <Screen>
      <ScreenHeader
        title="관람 경기 선택"
        actions={(
          <button
            type="button"
            onClick={() => navigate('home')}
            className="cb-icon-button"
            aria-label="닫기"
          >
            <X size={22} />
          </button>
        )}
      />

      <div className="cb-chip-row" role="tablist" aria-label="경기 날짜">
        {DATE_TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeDate === i}
            onClick={() => setActiveDate(i)}
            className={cx('cb-chip', activeDate === i && 'is-active')}
          >
            {tab}
          </button>
        ))}
      </div>

      <ScrollArea stack>
        <p className="cb-game-date">
          2026.04.10 (금) · KBO 리그
        </p>

        {GAMES.map((game, i) => {
          const fav = isFavorite(game);
          return (
            <div
              key={i}
              className={cx('cb-game-card', fav && 'is-favorite')}
            >
              <div className="cb-game-card__head">
                <div>
                  <div className="cb-game-card__match">
                    <div className="cb-game-card__teams">
                      <TeamBadge teamName={game.home} size={28} />
                      <TeamBadge teamName={game.away} size={28} />
                    </div>
                    <span className="cb-game-card__title">
                      {game.home} vs {game.away}
                    </span>
                    {fav && (
                      <span className="cb-badge">
                        응원팀
                      </span>
                    )}
                  </div>
                  <p className="cb-game-card__meta">{game.venue} · {game.time}</p>
                </div>
              </div>
              <Button
                onClick={() => handleSelect(game)}
                variant={fav ? 'primary' : 'secondary'}
                fullWidth
              >
                <CheckCircle size={15} />
                이 경기 선택
              </Button>
            </div>
          );
        })}
      </ScrollArea>

      <div className="cb-footer-note">
        <p>
          선택한 경기는 종료 1시간 후 자동으로 해제됩니다
        </p>
      </div>
    </Screen>
  );
}
