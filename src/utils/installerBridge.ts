/**
 * Bridge to launch the real native Windows Setup Wizard window (installer_wizard.pyw)
 *
 * - 로컬 dev 서버 (npm run dev) : /api/launch-installer 호출 → pythonw.exe 실행
 * - 정적 배포 환경 (GitHub Pages, Netlify 등) : API 없음 → false 반환 (UI에서 대체 안내)
 */

/** 현재 로컬 Vite dev 서버에서 실행 중인지 여부 */
export function isLocalServer(): boolean {
  const { hostname, port } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    port === '3000' ||
    port === '5173'
  );
}

export async function launchNativeInstaller(): Promise<boolean> {
  // 정적 배포 환경이면 API가 없으므로 즉시 false 반환
  if (!isLocalServer()) return false;

  try {
    const res = await fetch('/api/launch-installer');
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
    return false;
  } catch (err) {
    console.error('Failed to launch native installer:', err);
    return false;
  }
}

