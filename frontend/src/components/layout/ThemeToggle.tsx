'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? '라이트 모드' : '다크 모드'}
      style={{
        width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: dark ? '#334155' : '#f5f5f5',
        color: dark ? '#fbbf24' : '#525252',
        fontSize: 18, transition: 'all 0.2s',
      }}
    >
      {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
    </button>
  );
}
