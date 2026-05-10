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
