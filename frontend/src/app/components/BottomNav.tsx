import { useState } from 'react';
import { Home, Map, ScanLine, UserCircle, Trophy, Lock, type LucideIcon } from 'lucide-react';
import { useApp } from '../AppContext';
import { GameRequiredModal } from './GameRequiredModal';
import { useNavigation, type Route } from '../navigation';
import { cx } from '../classNames';

const tabs: Array<{ label: string; icon: LucideIcon; path: Route; requiresGame?: boolean }> = [
  { label: '홈',   icon: Home,       path: 'home' },
  { label: '인증', icon: ScanLine,   path: 'report', requiresGame: true },
  { label: '지도', icon: Map,        path: 'map' },
  { label: '리그', icon: Trophy,     path: 'ranking' },
  { label: 'MY',   icon: UserCircle, path: 'account' },
];

export function BottomNav() {
  const { currentRoute, navigate } = useNavigation();
  const { selectedGame } = useApp();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <GameRequiredModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={() => {
          setShowModal(false);
          navigate('game-select');
        }}
      />
      <nav className="cb-bottom-nav" aria-label="주요 화면">
        {tabs.map((tab) => {
          const isLocked = tab.requiresGame && !selectedGame;
          const isActive = currentRoute === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                if (isLocked) {
                  setShowModal(true);
                } else {
                  navigate(tab.path);
                }
              }}
              className={cx('cb-bottom-nav__item', isActive && 'is-active', isLocked && 'is-locked')}
            >
              <span className="cb-bottom-nav__icon">
                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isLocked && (
                  <Lock
                    size={8}
                    fill="currentColor"
                    className="cb-bottom-nav__lock"
                  />
                )}
              </span>
              <span className="cb-bottom-nav__label">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
