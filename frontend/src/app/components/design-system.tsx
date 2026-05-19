import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../classNames';
import { StatusBar } from './StatusBar';

type ScreenProps = HTMLAttributes<HTMLDivElement>;

export function Screen({ className, ...props }: ScreenProps) {
  return <div className={cx('cb-screen', className)} {...props} />;
}

interface ScreenHeaderProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function ScreenHeader({ title, eyebrow, description, actions, className }: ScreenHeaderProps) {
  const hasTitleBlock = title || eyebrow || description;

  return (
    <header className={cx('cb-screen-header', className)}>
      <StatusBar />
      {hasTitleBlock && (
        actions ? (
          <div className="cb-screen-header__row">
            <div>
              {eyebrow && <p className="cb-eyebrow">{eyebrow}</p>}
              {title && <h2 className="cb-title cb-title--compact">{title}</h2>}
              {description && <p className="cb-description">{description}</p>}
            </div>
            {actions}
          </div>
        ) : (
          <div className="cb-screen-header__body">
            {eyebrow && <p className="cb-eyebrow">{eyebrow}</p>}
            {title && <h2 className="cb-title">{title}</h2>}
            {description && <p className="cb-description">{description}</p>}
          </div>
        )
      )}
    </header>
  );
}

interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  stack?: boolean;
}

export function ScrollArea({ className, padded = true, stack = false, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cx('cb-scroll', padded && 'cb-scroll--padded', stack && 'cb-stack', className)}
      {...props}
    />
  );
}

export function ActionBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('cb-action-bar', className)} {...props} />;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'soft' | 'secondary' | 'ghost' | 'kakao';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'cb-button',
        `cb-button--${variant}`,
        `cb-button--${size}`,
        fullWidth && 'cb-button--full',
        className
      )}
      {...props}
    />
  );
}

/* ============================================================
   Display Title — chunky 3D outlined gradient
   ============================================================ */

interface DisplayTitleProps {
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

/** 헤더용 3D outlined chunky title. Galmuri14 위에 outline + drop shadow + gradient. */
export function DisplayTitle({ size = 'md', children, className }: DisplayTitleProps) {
  return (
    <h2 className={cx('cb-display-title', `cb-display-title--${size}`, className)}>
      {children}
    </h2>
  );
}

/* ============================================================
   Counter — scoreboard LED style
   ============================================================ */

interface ScoreCounterProps {
  home: number;
  away: number;
  homeLabel?: string;
  awayLabel?: string;
  className?: string;
}

/** 점수판 ("A 0 vs B 5"). dark navy bg + cream LED text. */
export function ScoreCounter({ home, away, homeLabel = 'A', awayLabel = 'B', className }: ScoreCounterProps) {
  return (
    <div className={cx('cb-counter cb-counter--score', className)} role="status" aria-label={`${homeLabel} ${home} ${awayLabel} ${away}`}>
      <div className="cb-counter__side">
        <span className="cb-counter__label">{homeLabel}</span>
        <span className="cb-counter__num">{home}</span>
      </div>
      <span className="cb-counter__vs" aria-hidden="true">VS</span>
      <div className="cb-counter__side">
        <span className="cb-counter__label">{awayLabel}</span>
        <span className="cb-counter__num">{away}</span>
      </div>
    </div>
  );
}

interface InningCounterProps {
  inning: number;
  half?: 'top' | 'bottom';
  className?: string;
}

/** 회 표시 ("Bottom 5th"). */
const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
export function InningCounter({ inning, half = 'top', className }: InningCounterProps) {
  return (
    <div className={cx('cb-counter cb-counter--inning', className)} role="status">
      <span>{half === 'top' ? 'Top' : 'Bottom'}</span>
      <span style={{ fontSize: 16 }}>{ORDINAL[inning] ?? `${inning}th`}</span>
    </div>
  );
}

interface BSOCounterProps {
  balls: number;
  strikes: number;
  outs: number;
  className?: string;
}

/** Ball/Strike/Out LED 카운터. balls 0~3, strikes 0~2, outs 0~2. */
export function BSOCounter({ balls, strikes, outs, className }: BSOCounterProps) {
  return (
    <div className={cx('cb-counter cb-counter--bso', className)} role="status" aria-label={`Balls ${balls} Strikes ${strikes} Outs ${outs}`}>
      <div className="cb-counter__bso-row">
        <span className="cb-counter__bso-label">B</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx('cb-counter__led', i < balls && 'cb-counter__led--on')} />
        ))}
      </div>
      <div className="cb-counter__bso-row">
        <span className="cb-counter__bso-label">S</span>
        {[0, 1].map((i) => (
          <span key={i} className={cx('cb-counter__led', i < strikes && 'cb-counter__led--on')} />
        ))}
      </div>
      <div className="cb-counter__bso-row">
        <span className="cb-counter__bso-label">O</span>
        {[0, 1].map((i) => (
          <span key={i} className={cx('cb-counter__led', i < outs && 'cb-counter__led--red')} />
        ))}
      </div>
    </div>
  );
}

interface OutCounterProps {
  className?: string;
}

/** 단일 "Out" 카운터 박스. */
export function OutCounter({ className }: OutCounterProps) {
  return <div className={cx('cb-counter cb-counter--out', className)}>Out</div>;
}

type GameState = 'OUT' | 'BALL' | 'STRIKE' | 'HIT' | 'RUN';

interface GameStateTagProps {
  state: GameState;
  className?: string;
}

/** 야구 game-state 미니 태그 (cb-card 위에 올라가는 작은 chip). */
export function GameStateTag({ state, className }: GameStateTagProps) {
  return (
    <span className={cx('cb-game-state-tag', `cb-game-state-tag--${state.toLowerCase()}`, className)}>
      {state}
    </span>
  );
}
