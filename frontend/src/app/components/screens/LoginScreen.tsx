import landingBg from '../../../assets/landing-bg.png';
import landingLogo from '../../../assets/landing-logo.svg';
import { useNavigation } from '../../navigation';
import { Button } from '../design-system';

export function LoginScreen() {
  const { navigate } = useNavigation();

  return (
    <div className="cb-login-screen">
      <img src={landingBg} alt="" aria-hidden="true" className="cb-login-bg" />
      <img src={landingLogo} alt="용기낼깡" className="cb-login-logo" />

      <div className="cb-login-actions">
        <Button
          onClick={() => navigate('onboarding')}
          variant="kakao"
          size="lg"
          fullWidth
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2C5.58 2 2 4.91 2 8.5c0 2.26 1.45 4.25 3.63 5.38l-.92 3.34c-.07.27.22.48.45.33L9.5 15.1c.16.02.33.02.5.02 4.42 0 8-2.91 8-6.5S14.42 2 10 2z"
              fill="var(--cb-kakao-text)"
            />
          </svg>
          카카오로 시작하기
        </Button>
      </div>
    </div>
  );
}
