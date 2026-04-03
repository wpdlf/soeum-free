export const colors = {
  primary: { 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a5f' },
  noise: {
    quiet: '#22c55e',
    normal: '#eab308',
    loud: '#ef4444',
    veryLoud: '#171717',
  },
  noiseBg: {
    quiet: 'rgba(34, 197, 94, 0.35)',
    normal: 'rgba(234, 179, 8, 0.35)',
    loud: 'rgba(239, 68, 68, 0.35)',
    veryLoud: 'rgba(23, 23, 23, 0.35)',
  },
  construction: { permitted: '#f59e0b', inProgress: '#ef4444', completed: '#6b7280' },
  realEstate: { sale: '#8b5cf6', jeonse: '#06b6d4', monthly: '#f97316' },
} as const;
