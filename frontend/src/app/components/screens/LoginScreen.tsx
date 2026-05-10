import logoImg from '../../../imports/image.png';
import { useNavigation } from '../../navigation';
import { Button } from '../design-system';

export function LoginScreen() {
  const { navigate } = useNavigation();

  return (
    <div className="cb-login-screen">
      <div className="cb-login-brand">
        <img
          src={logoImg}
          alt="클린업 트리오 로고"
          className="cb-login-logo"
        />

        <p className="cb-login-title">
          클린업 트리오
        </p>
        <p className="cb-login-copy">
          응원팀과 함께 야구장을 클린하게
        </p>
      </div>

      <div className="cb-login-actions">
        <Button
          onClick={() => navigate('onboarding')}
          variant="kakao"
          size="lg"
          fullWidth
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C5.58 2 2 4.91 2 8.5c0 2.26 1.45 4.25 3.63 5.38l-.92 3.34c-.07.27.22.48.45.33L9.5 15.1c.16.02.33.02.5.02 4.42 0 8-2.91 8-6.5S14.42 2 10 2z" fill="#3C1E1E" />
          </svg>
          카카오로 시작하기
        </Button>
      </div>
    </div>
  );
}
