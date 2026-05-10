export type EcoGrade = '뉴비팬' | '에코팬' | '그린팬' | '에코히어로' | '클린레전드';

export interface EcoGradeMeta {
  name: EcoGrade;
  points: string;
  actions: string;
  emoji: string;
  bg: string;
  text: string;
  border: string;
  desc: string;
}

export interface EcoGradeProgress {
  next: EcoGrade;
  needed: number;
  current: number;
  max: number;
}

export const ECO_GRADE_META: Record<EcoGrade, EcoGradeMeta> = {
  뉴비팬: {
    name: '뉴비팬',
    points: '0 ~ 99P',
    actions: '0회',
    emoji: '🌱',
    bg: '#F3F4F6',
    text: '#6B7280',
    border: '#E5E7EB',
    desc: '야구 직관을 시작했어요! 환경 행동으로 등급을 올려보세요.',
  },
  에코팬: {
    name: '에코팬',
    points: '100 ~ 499P',
    actions: '5회 이상',
    emoji: '🍃',
    bg: '#EFF6FF',
    text: '#3B82F6',
    border: '#BFDBFE',
    desc: '환경 행동에 관심을 갖기 시작했어요.',
  },
  그린팬: {
    name: '그린팬',
    points: '500 ~ 999P',
    actions: '20회 이상',
    emoji: '🌿',
    bg: '#E2FAE9',
    text: '#13923F',
    border: '#C0F5D3',
    desc: '꾸준히 환경을 생각하는 야구팬이에요.',
  },
  에코히어로: {
    name: '에코히어로',
    points: '1000 ~ 2999P',
    actions: '50회 이상',
    emoji: '⚡',
    bg: '#FFF8E6',
    text: '#B07800',
    border: '#FFE082',
    desc: '야구장 환경의 수호자! 많은 팬들에게 귀감이 되어요.',
  },
  클린레전드: {
    name: '클린레전드',
    points: '3000P 이상',
    actions: '100회 이상',
    emoji: '🏆',
    bg: '#FFF3F3',
    text: '#E53E3E',
    border: '#FCA5A5',
    desc: '야구장 환경 역사에 이름을 남긴 전설!',
  },
};

export const ECO_GRADE_LIST = Object.values(ECO_GRADE_META);

export function getEcoGrade(points: number): EcoGrade {
  if (points >= 3000) return '클린레전드';
  if (points >= 1000) return '에코히어로';
  if (points >= 500) return '그린팬';
  if (points >= 100) return '에코팬';
  return '뉴비팬';
}

export function getNextGradePoints(points: number): EcoGradeProgress {
  if (points >= 3000) return { next: '클린레전드', needed: 0, current: points, max: points };
  if (points >= 1000) return { next: '클린레전드', needed: 3000 - points, current: points - 1000, max: 2000 };
  if (points >= 500) return { next: '에코히어로', needed: 1000 - points, current: points - 500, max: 500 };
  if (points >= 100) return { next: '그린팬', needed: 500 - points, current: points - 100, max: 400 };
  return { next: '에코팬', needed: 100 - points, current: points, max: 100 };
}
