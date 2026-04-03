'use client';
import Script from 'next/script';

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;

export function KakaoMapScript() {
  return (
    <Script
      src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`}
      strategy="afterInteractive"
      onLoad={() => {
        if (window.kakao?.maps) {
          window.kakao.maps.load(() => {
            window.dispatchEvent(new Event('kakao-maps-loaded'));
          });
        }
      }}
    />
  );
}
