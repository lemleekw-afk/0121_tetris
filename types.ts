
export interface GameObject {
  id: string;
  word: string;
  col: number;
  row: number;
  status: 'moving' | 'fixed' | 'exploding';
  color: string;
}

export interface Ranking {
  name: string;
  score: number;
}

export const COLUMNS = 6;
export const ROWS = 10;
export const FALL_DURATION = 1000; // 전체 낙하 시간 1초로 단축
export const SPAWN_DELAY = 1000; // 생성 대기 시간 1초로 단축

// 시각적으로 명확히 구분 가능한 고대비 색상 10종
export const COLOR_PALETTE = [
  'bg-red-600',    // 빨강
  'bg-blue-600',   // 파랑
  'bg-yellow-500', // 노랑
  'bg-green-600',  // 초록
  'bg-purple-600', // 보라
  'bg-orange-500', // 오렌지
  'bg-cyan-500',   // 청록
  'bg-pink-500',   // 핑크
  'bg-lime-500',   // 라임
  'bg-teal-600'    // 테일
];

export const FALLBACK_WORDS = [
  '나무', '바다', '하늘', '구름', '햇살', '파도', '모래', '숲속', '노래', '미소'
];
