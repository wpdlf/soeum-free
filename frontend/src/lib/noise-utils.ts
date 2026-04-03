import type { NoiseLevel, NoiseColor } from '@/types';
import { colors } from './design-tokens';

// Design Ref: §2.5 — 기존 app.py 로직 보존: >70/60-70/50-60/<50
export function getNoiseLevel(avgNoise: number): NoiseLevel {
  if (avgNoise > 70) return 'very_loud';
  if (avgNoise > 60) return 'loud';
  if (avgNoise > 50) return 'normal';
  return 'quiet';
}

export function getNoiseColor(avgNoise: number): NoiseColor {
  if (avgNoise > 70) return 'black';
  if (avgNoise > 60) return 'red';
  if (avgNoise > 50) return 'yellow';
  return 'green';
}

export function getNoiseHexColor(avgNoise: number): string {
  const level = getNoiseLevel(avgNoise);
  const map: Record<NoiseLevel, string> = {
    quiet: colors.noise.quiet,
    normal: colors.noise.normal,
    loud: colors.noise.loud,
    very_loud: colors.noise.veryLoud,
  };
  return map[level];
}

export function getNoiseBgColor(avgNoise: number): string {
  const level = getNoiseLevel(avgNoise);
  const map: Record<NoiseLevel, string> = {
    quiet: colors.noiseBg.quiet,
    normal: colors.noiseBg.normal,
    loud: colors.noiseBg.loud,
    very_loud: colors.noiseBg.veryLoud,
  };
  return map[level];
}

export function getNoiseLabel(level: NoiseLevel): string {
  const map: Record<NoiseLevel, string> = {
    quiet: '조용',
    normal: '보통',
    loud: '시끄러움',
    very_loud: '매우 시끄러움',
  };
  return map[level];
}

export function getCircleRadius(avgNoise: number): number {
  return avgNoise * 10;
}
