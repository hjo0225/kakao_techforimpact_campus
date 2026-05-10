export interface TeamBrand {
  name: string;
  shortName: string;
  code: string;
  primary: string;
  secondary: string;
  foreground: string;
}

export const KBO_TEAMS: TeamBrand[] = [
  { name: 'LG 트윈스', shortName: 'LG', code: 'LG', primary: '#C3042F', secondary: '#1F2937', foreground: '#FFFFFF' },
  { name: '두산 베어스', shortName: '두산', code: 'DS', primary: '#131230', secondary: '#D71920', foreground: '#FFFFFF' },
  { name: 'SSG 랜더스', shortName: 'SSG', code: 'SSG', primary: '#CE0E2D', secondary: '#FDB913', foreground: '#FFFFFF' },
  { name: 'KT 위즈', shortName: 'KT', code: 'KT', primary: '#111827', secondary: '#EF4444', foreground: '#FFFFFF' },
  { name: '키움 히어로즈', shortName: '키움', code: 'KW', primary: '#6F263D', secondary: '#C4A76A', foreground: '#FFFFFF' },
  { name: 'NC 다이노스', shortName: 'NC', code: 'NC', primary: '#0C2340', secondary: '#C99700', foreground: '#FFFFFF' },
  { name: '한화 이글스', shortName: '한화', code: 'HH', primary: '#F37321', secondary: '#111827', foreground: '#FFFFFF' },
  { name: '롯데 자이언츠', shortName: '롯데', code: 'LT', primary: '#002955', secondary: '#D71920', foreground: '#FFFFFF' },
  { name: '삼성 라이온즈', shortName: '삼성', code: 'SS', primary: '#0066B3', secondary: '#C7D2FE', foreground: '#FFFFFF' },
  { name: 'KIA 타이거즈', shortName: 'KIA', code: 'KIA', primary: '#D71920', secondary: '#111827', foreground: '#FFFFFF' },
];

const FALLBACK_TEAM: TeamBrand = {
  name: '팀 미선택',
  shortName: '팀',
  code: 'CB',
  primary: '#13923F',
  secondary: '#3DDB6D',
  foreground: '#FFFFFF',
};

export function getTeamBrand(teamName: string | null | undefined): TeamBrand {
  if (!teamName) return FALLBACK_TEAM;
  return KBO_TEAMS.find((team) => team.name === teamName || teamName.includes(team.shortName)) ?? FALLBACK_TEAM;
}
