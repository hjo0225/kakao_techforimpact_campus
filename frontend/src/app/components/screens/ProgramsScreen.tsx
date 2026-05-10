import { BottomNav } from '../BottomNav';
import { Calendar, Users, Zap, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigation } from '../../navigation';

const PARTNER = {
  name: '서울환경연합',
  role: '파트너 단체',
  emoji: '🌿',
};

const PROGRAMS = [
  {
    title: '구장 클린업 데이',
    schedule: '매월 첫째 주 토요일',
    pts: '+50P',
    age: '전 연령',
    emoji: '🧹',
    color: '#E2FAE9',
    borderColor: '#C0F5D3',
    action: '참여 신청',
  },
  {
    title: '제로 웨이스트 야구단',
    schedule: '격주 일요일',
    pts: '+30P/회',
    age: '성인',
    emoji: '♻️',
    color: '#F0F4FF',
    borderColor: '#C7D4FF',
    action: '모임 참여',
  },
  {
    title: '어린이 에코 스쿨',
    schedule: '경기 당일 11시',
    pts: '무료',
    age: '초등학생',
    emoji: '🌱',
    color: '#FFF8E6',
    borderColor: '#FFE082',
    action: '교육 신청',
  },
];

const UPCOMING = [
  { date: '4/12 (토)', event: '구장 클린업 데이', badge: '모집중' },
  { date: '4/20 (일)', event: '제로 웨이스트 야구단', badge: '마감임박' },
  { date: '4/26 (토)', event: '구장 클린업 데이', badge: '예정' },
];

export function ProgramsScreen() {
  const { navigate } = useNavigation();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F2FBF5' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 'max(46px, env(safe-area-inset-top, 0px))', paddingLeft: '14px', paddingRight: '14px', paddingBottom: '8px', gap: 4 }}>
          <button
            onClick={() => navigate('home')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={20} color="#374151" />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', flex: 1 }}>환경 프로그램</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>9:41</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Partner Card */}
        <div style={{
          background: 'linear-gradient(135deg, #3DDB6D, #13923F)',
          borderRadius: 20,
          padding: '16px',
          display: 'flex', alignItems: 'center', gap: 14,
          color: '#fff',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, flexShrink: 0,
          }}>
            {PARTNER.emoji}
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>파트너 단체</p>
            <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>{PARTNER.name}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              환경 보호 프로그램을 함께 운영합니다
            </p>
          </div>
        </div>

        {/* Programs */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>참여 프로그램</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PROGRAMS.map((prog, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: '16px',
                  border: `1.5px solid ${prog.borderColor}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: prog.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                    border: `1px solid ${prog.borderColor}`,
                  }}>
                    {prog.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                      {prog.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} color="#9CA3AF" />
                        <span style={{ fontSize: 11, color: '#6B7280' }}>{prog.schedule}</span>
                      </div>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#D1D5DB', display: 'inline-block' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={11} color="#9CA3AF" />
                        <span style={{ fontSize: 11, color: '#6B7280' }}>{prog.age}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Zap size={11} color="#3DDB6D" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#13923F' }}>{prog.pts}</span>
                    </div>
                  </div>
                </div>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #3DDB6D, #1AB852)',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 3px 8px rgba(61,219,109,0.30)',
                }}>
                  {prog.action}
                  <ChevronRight size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>다가오는 일정</p>
          <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {UPCOMING.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < UPCOMING.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: '#E2FAE9',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 9, color: '#3DDB6D', fontWeight: 700 }}>{item.date.split(' ')[1].replace('(','').replace(')','')}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#13923F' }}>{item.date.split('/')[1].split(' ')[0]}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.event}</p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '4px 10px', borderRadius: 8,
                  background: item.badge === '모집중' ? '#E2FAE9' : item.badge === '마감임박' ? '#FFF3F3' : '#F4F4F4',
                  color: item.badge === '모집중' ? '#13923F' : item.badge === '마감임박' ? '#E53E3E' : '#9CA3AF',
                  border: `1px solid ${item.badge === '모집중' ? '#C0F5D3' : item.badge === '마감임박' ? '#FCA5A5' : '#E5E7EB'}`,
                }}>
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
