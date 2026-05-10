import type { CSSProperties } from 'react';
import { getTeamBrand } from '../teamBrand';

interface TeamBadgeProps {
  teamName: string | null | undefined;
  size?: number;
  showName?: boolean;
}

export function TeamBadge({ teamName, size = 34, showName = false }: TeamBadgeProps) {
  const team = getTeamBrand(teamName);
  const style = {
    '--team-badge-size': `${size}px`,
    '--team-primary': team.primary,
    '--team-secondary': team.secondary,
    '--team-foreground': team.foreground,
  } as CSSProperties & Record<'--team-badge-size' | '--team-primary' | '--team-secondary' | '--team-foreground', string>;

  return (
    <span
      aria-label={`${team.name} 배지`}
      className="cb-team-badge"
      style={style}
    >
      <span className="cb-team-badge__mark">
        {team.code}
      </span>
      {showName && (
        <span className="cb-team-badge__name">
          {team.name}
        </span>
      )}
    </span>
  );
}
