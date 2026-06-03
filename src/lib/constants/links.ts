export const IQ_OPTION_REGISTRATION_LINK =
  'https://iqoption.net/lp/mobile-partner-pwa/?aff=417345&aff_model=revenue';

export const IQ_OPTION_COPY_TRADING_LINK =
  'https://iqoption.com/pwa/copy-trading/user/178572482?aff=417345';

export const CONTROLCOPY_BASE_URL = 'https://controlcopyiq.com';

export function buildControlCopySignupLink(indicatorCode: string) {
  const normalizedCode = indicatorCode.trim().toUpperCase();
  return normalizedCode ? `${CONTROLCOPY_BASE_URL}/c/${normalizedCode}` : '';
}
