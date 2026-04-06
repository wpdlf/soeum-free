'use client';

import { useState } from 'react';

interface Construction {
  id: number;
  projectName: string;
  address: string;
  status: string;
}

const PAGE_SIZE = 5;

export function ConstructionList({ items }: { items: Construction[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, PAGE_SIZE);
  const remaining = items.length - PAGE_SIZE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map(c => (
        <div key={c.id} style={{ padding: 10, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
          <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{c.projectName}</p>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 6px', fontSize: 12 }}>{c.address}</p>
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            backgroundColor: c.status === 'in_progress' ? '#fee2e2' : '#fef3c7',
            color: c.status === 'in_progress' ? '#b91c1c' : '#a16207',
          }}>
            {c.status === 'in_progress' ? '진행중' : '허가'}
          </span>
        </div>
      ))}
      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            padding: '8px 0', border: '1px solid var(--border-color)', borderRadius: 8,
            backgroundColor: 'var(--card-bg)', color: 'var(--link-color)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {remaining}건 더보기
        </button>
      )}
      {showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(false)}
          style={{
            padding: '8px 0', border: '1px solid var(--border-color)', borderRadius: 8,
            backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          접기
        </button>
      )}
    </div>
  );
}
