'use client'

import React from 'react'

interface ZoneData {
  zone: number
  coverage: number // 0-100
  touchPoints: number
}

interface HeatmapProps {
  topPlayerZones: ZoneData[]
  bottomPlayerZones: ZoneData[]
  title?: string
}

export function CourtHeatmap({ topPlayerZones, bottomPlayerZones, title = 'Court Coverage Heatmap' }: HeatmapProps) {
  // Get color based on coverage intensity
  const getZoneColor = (coverage: number) => {
    if (coverage === 0) return '#1a1a2e' // Dark
    if (coverage < 20) return '#0f3460' // Very dark blue
    if (coverage < 40) return '#16213e' // Dark blue
    if (coverage < 60) return '#14b8a6' // Teal
    if (coverage < 80) return '#0ea5a5' // Darker teal
    return '#06b6d4' // Bright cyan
  }

  const renderZoneGrid = (zones: ZoneData[], playerLabel: string) => {
    // Create 4x4 grid (zones 1-4 at net, 13-16 at baseline)
    const grid = Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 4 }, (_, col) => {
        const zoneNum = row * 4 + col + 1
        const zoneData = zones.find((z) => z.zone === zoneNum)
        const coverage = zoneData?.coverage || 0
        return { zoneNum, coverage, touchPoints: zoneData?.touchPoints || 0 }
      })
    )

    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold" style={{ color: '#14B8A6' }}>
          {playerLabel}
        </h3>
        <div className="flex flex-col gap-1 p-4 rounded-lg" style={{ backgroundColor: '#0a0e27' }}>
          {grid.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {row.map((zone) => (
                <div
                  key={zone.zoneNum}
                  className="w-12 h-12 rounded flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 relative group"
                  style={{ backgroundColor: getZoneColor(zone.coverage) }}
                  title={`Zone ${zone.zoneNum}: ${zone.coverage}% coverage, ${zone.touchPoints} touches`}
                >
                  <span className="text-xs font-bold text-white">{zone.zoneNum}</span>
                  <span className="text-xs text-white opacity-70">{zone.coverage}%</span>

                  {/* Tooltip */}
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap hidden group-hover:block z-10"
                    style={{ backgroundColor: '#0f172a', color: '#14b8a6', border: '1px solid #14b8a6' }}
                  >
                    {zone.touchPoints} touches
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6 rounded-lg" style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', border: '1px solid' }}>
      <h2 className="text-2xl font-bold mb-8" style={{ color: '#ffffff' }}>
        {title}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {renderZoneGrid(topPlayerZones, 'Top Player Coverage')}
        {renderZoneGrid(bottomPlayerZones, 'Bottom Player Coverage')}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid #1e293b' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: '#64748B' }}>
          COVERAGE INTENSITY
        </p>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: '#1a1a2e' }} />
            <span className="text-xs" style={{ color: '#CBD5E1' }}>
              No Activity
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: '#0f3460' }} />
            <span className="text-xs" style={{ color: '#CBD5E1' }}>
              Low (1-20%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: '#14b8a6' }} />
            <span className="text-xs" style={{ color: '#CBD5E1' }}>
              Medium (40-60%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: '#06b6d4' }} />
            <span className="text-xs" style={{ color: '#CBD5E1' }}>
              High (80%+)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
