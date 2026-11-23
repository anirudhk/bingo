import React from 'react';
import type { UnitConfig } from '../../types/game';
import { UNIT_TONE_CLASSES, type UnitTone } from '../../constants/unitTones';

export type { UnitTone };

interface UnitHeaderProps {
  unit: UnitConfig;
  /** 1-based unit number. */
  unitNumber: number;
  completedCount: number;
  totalCount: number;
  tone: UnitTone;
}

export const UnitHeader: React.FC<UnitHeaderProps> = ({
  unit,
  unitNumber,
  completedCount,
  totalCount,
  tone,
}) => {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const t = UNIT_TONE_CLASSES[tone];

  return (
    <div className="px-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${t.chip}`}
          >
            Unit {unitNumber}
          </span>
          <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {unit.title}
          </h2>
          {unit.shortDesc && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{unit.shortDesc}</p>
          )}
        </div>
        <span className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-slate-400 dark:text-slate-500">
          {completedCount}/{totalCount}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${t.solid}`}
          style={{ width: `${percent}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
};
