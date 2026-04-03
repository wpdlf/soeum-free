interface Props {
  districtName: string;
  dongName: string;
}

export function NaverLinkButton({ districtName, dongName }: Props) {
  const url = `https://new.land.naver.com/search?query=${encodeURIComponent(districtName + ' ' + dongName)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full py-2.5 mt-3 text-sm font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
      </svg>
      네이버 부동산에서 매물 보기
    </a>
  );
}
