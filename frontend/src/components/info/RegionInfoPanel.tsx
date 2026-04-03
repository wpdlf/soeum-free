'use client';

import { useState } from 'react';
import type { InfoTab, RegionDetail } from '@/types';
import { NoiseTab } from './NoiseTab';
import { ConstructionTab } from './ConstructionTab';
import { RealEstateTab } from './RealEstateTab';
import { Card } from '@/components/ui/Card';

interface Props {
  regionDetail: RegionDetail | null;
  isLoading: boolean;
}

const TABS: { key: InfoTab; label: string }[] = [
  { key: 'noise', label: '소음' },
  { key: 'construction', label: '공사장' },
  { key: 'realEstate', label: '부동산' },
];

export function RegionInfoPanel({ regionDetail, isLoading }: Props) {
  const [activeTab, setActiveTab] = useState<InfoTab>('noise');

  if (isLoading) {
    return <Card className="animate-pulse"><div className="h-32 bg-neutral-200 rounded-lg" /></Card>;
  }

  if (!regionDetail) {
    return (
      <Card>
        <p className="text-sm text-neutral-400 text-center py-8">
          지도에서 지역을 클릭하세요
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      {/* Region header */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-lg font-semibold">{regionDetail.region.dongName}</h3>
        <p className="text-sm text-neutral-500">{regionDetail.region.districtName}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'noise' && <NoiseTab noise={regionDetail.noise} />}
        {activeTab === 'construction' && (
          <ConstructionTab
            totalCount={regionDetail.constructionCount}
            activeConstructions={regionDetail.activeConstructions}
          />
        )}
        {activeTab === 'realEstate' && (
          <RealEstateTab
            realEstate={regionDetail.realEstate}
            districtName={regionDetail.region.districtName}
            dongName={regionDetail.region.dongName}
          />
        )}
      </div>
    </Card>
  );
}
