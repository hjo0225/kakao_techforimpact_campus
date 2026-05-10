export type AvatarCap = 'green' | 'navy' | 'gold';
export type AvatarJersey = 'home' | 'away' | 'eco';
export type AvatarPose = 'cheer' | 'pickup' | 'share';
export type AvatarBackdrop = 'clubhouse' | 'field' | 'night';

export interface AvatarConfig {
  cap: AvatarCap;
  jersey: AvatarJersey;
  pose: AvatarPose;
  backdrop: AvatarBackdrop;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  cap: 'green',
  jersey: 'eco',
  pose: 'cheer',
  backdrop: 'clubhouse',
};

export const CAP_OPTIONS: { key: AvatarCap; label: string; caption: string; color: string }[] = [
  { key: 'green', label: '그린 캡', caption: '기본 응원', color: '#1AB852' },
  { key: 'navy', label: '네이비 캡', caption: '원정 경기', color: '#173B63' },
  { key: 'gold', label: '골드 캡', caption: 'MVP 무드', color: '#D89B00' },
];

export const JERSEY_OPTIONS: { key: AvatarJersey; label: string; caption: string; primary: string; secondary: string }[] = [
  { key: 'home', label: '홈', caption: '화이트 홈킷', primary: '#FFFFFF', secondary: '#1AB852' },
  { key: 'away', label: '원정', caption: '네이비 원정킷', primary: '#DCE7F8', secondary: '#173B63' },
  { key: 'eco', label: '에코', caption: '리유즈 한정', primary: '#E2FAE9', secondary: '#13923F' },
];

export const POSE_OPTIONS: { key: AvatarPose; label: string; caption: string; emoji: string }[] = [
  { key: 'cheer', label: '응원', caption: '득점 순간', emoji: '🙌' },
  { key: 'pickup', label: '수거', caption: '반납 완료', emoji: '♻️' },
  { key: 'share', label: '공유', caption: '직관 카드', emoji: '📸' },
];

export const BACKDROP_OPTIONS: {
  key: AvatarBackdrop;
  label: string;
  caption: string;
  background: string;
  accent: string;
}[] = [
  {
    key: 'clubhouse',
    label: '클럽하우스',
    caption: 'MY 기본',
    background: 'linear-gradient(180deg, #F4FFF7 0%, #EAF7FF 100%)',
    accent: '#13923F',
  },
  {
    key: 'field',
    label: '그라운드',
    caption: '응원석 밝은 톤',
    background: 'linear-gradient(180deg, #E9F8EF 0%, #D9F4C7 100%)',
    accent: '#1AB852',
  },
  {
    key: 'night',
    label: '나이트게임',
    caption: '야간 직관',
    background: 'linear-gradient(180deg, #172A45 0%, #235E62 100%)',
    accent: '#FBBF24',
  },
];

export const AVATAR_PRESETS: { key: string; label: string; caption: string; config: AvatarConfig }[] = [
  {
    key: 'home-cheer',
    label: '홈 응원단',
    caption: 'MY 화면에 가장 깔끔한 기본 조합',
    config: { cap: 'green', jersey: 'home', pose: 'cheer', backdrop: 'field' },
  },
  {
    key: 'eco-return',
    label: '에코 루틴',
    caption: '다회용기 인증 플로우에 어울림',
    config: { cap: 'green', jersey: 'eco', pose: 'pickup', backdrop: 'clubhouse' },
  },
  {
    key: 'away-share',
    label: '원정 기록러',
    caption: '직관 카드 공유용 차분한 톤',
    config: { cap: 'navy', jersey: 'away', pose: 'share', backdrop: 'night' },
  },
];

export function getAvatarParts(config: AvatarConfig) {
  return {
    cap: CAP_OPTIONS.find((option) => option.key === config.cap) ?? CAP_OPTIONS[0],
    jersey: JERSEY_OPTIONS.find((option) => option.key === config.jersey) ?? JERSEY_OPTIONS[0],
    pose: POSE_OPTIONS.find((option) => option.key === config.pose) ?? POSE_OPTIONS[0],
    backdrop: BACKDROP_OPTIONS.find((option) => option.key === config.backdrop) ?? BACKDROP_OPTIONS[0],
  };
}

export function isSameAvatarConfig(a: AvatarConfig, b: AvatarConfig) {
  return a.cap === b.cap
    && a.jersey === b.jersey
    && a.pose === b.pose
    && a.backdrop === b.backdrop;
}
