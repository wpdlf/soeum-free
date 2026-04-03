import Link from 'next/link';

export function Header() {
  return (
    <header className="h-14 border-b border-neutral-200 bg-white flex items-center px-4 lg:px-6 shrink-0">
      <Link href="/" className="text-lg font-bold text-blue-900 tracking-tight">
        소음프리
      </Link>
      <nav className="ml-8 flex gap-4">
        <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">메인</Link>
        <Link href="/compare" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">지역 비교</Link>
      </nav>
    </header>
  );
}
