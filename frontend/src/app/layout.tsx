import './globals.css';
import { KakaoMapScript } from '@/components/map/KakaoMapScript';
import { Providers } from './providers';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export const metadata = {
  title: '소음프리 — 조용한 이사 지역 찾기',
  description: '소음·공사장·부동산 데이터를 결합하여 조용한 이사 지역을 찾아주는 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('theme');
              if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme:dark)').matches)) {
                document.documentElement.setAttribute('data-theme','dark');
              }
            } catch(e){}
          })();
        `}} />
      </head>
      <body>
        <KakaoMapScript />
        <Providers>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header */}
            <header style={{
              height: 56,
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--header-bg)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
              flexShrink: 0,
              transition: 'background-color 0.2s, border-color 0.2s',
            }}>
              <a href="/" style={{ fontSize: 20, fontWeight: 800, color: 'var(--logo-color)', textDecoration: 'none', letterSpacing: '-0.5px' }}>
                소음프리
              </a>
              <nav style={{ marginLeft: 32, display: 'flex', gap: 16, flex: 1 }}>
                <a href="/" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>메인</a>
                <a href="/compare" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>지역 비교</a>
              </nav>
              <ThemeToggle />
            </header>
            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
