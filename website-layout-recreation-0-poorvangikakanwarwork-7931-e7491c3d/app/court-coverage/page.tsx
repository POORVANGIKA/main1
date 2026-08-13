'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { CourtHeatmap } from '@/components/court-heatmap'

export default function CourtCoveragePage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedVideo, setUploadedVideo] = useState<{ videoUrl: string; fileName: string } | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const UPLOAD_URL = '/api/analyze/video'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      await handleFileUpload(file)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file')
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      const uploadUrl = UPLOAD_URL
      const formData = new FormData()
      formData.append('video', file)
      formData.append('analysis_id', `${Date.now()}-${file.name}`)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || response.statusText || 'Backend upload failed')
      }

      const backendOrigin = new URL(uploadUrl, window.location.origin).origin

      const normalizeOutputFile = (outputFile: any, origin: string) => {
        if (!outputFile) return null
        if (typeof outputFile === 'string') {
          const url = outputFile.startsWith('/') ? `${origin}${outputFile}` : outputFile
          return { name: url.split('/').pop(), url, type: url.split('.').pop()?.toLowerCase() }
        }
        if (typeof outputFile === 'object' && outputFile.url) {
          const outputUrl = outputFile.url.startsWith('/') ? `${origin}${outputFile.url}` : outputFile.url
          return {
            name: outputFile.name || outputUrl.split('/').pop(),
            url: outputUrl,
            type: outputFile.type || outputUrl.split('.').pop()?.toLowerCase(),
          }
        }
        return null
      }

      const mediaUrls = result.media_urls || {}
      const outputFiles = Object.values(mediaUrls)
        .filter((url) => typeof url === 'string' && url)
        .map((url) => normalizeOutputFile(url, backendOrigin))
        .filter(Boolean)

      const normalizedResult = {
        analysisId: result.analysis_id || result.analysisId || null,
        videoFileName: file.name,
        analysisData: {
          processing_time_ms: result.data?.processing_time_ms ?? null,
          top_player_tracking: result.data?.top_player_tracking ?? null,
          bottom_player_tracking: result.data?.bottom_player_tracking ?? null,
        },
        outputFiles,
        message: result.message || 'Video uploaded successfully',
        analysisError: result.analysis_error || null,
      }

      setUploadedVideo({
        videoUrl: uploadUrl,
        fileName: file.name,
      })
      setAnalysisResult(normalizedResult)
    } catch (err) {
      console.error('[v0] Error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const loadDemoAnalysis = () => {
    setAnalysisResult({
      videoFileName: 'Demo Badminton Match - Top Player Analysis',
      analysisData: {
        total_frames_analyzed: 2500,
        average_coverage_percentage: 72.4,
        primary_zones: '4, 5, 8, 9',
        movement_speed_avg: '4.2 m/s',
        zone_transitions: 847,
      },
      topPlayerZoneCoverage: [
        { zone: 1, coverage: 12, color: 'rgba(20, 184, 166, 0.3)' },
        { zone: 2, coverage: 18, color: 'rgba(20, 184, 166, 0.4)' },
        { zone: 3, coverage: 14, color: 'rgba(20, 184, 166, 0.35)' },
        { zone: 4, coverage: 45, color: 'rgba(20, 184, 166, 1)' },
        { zone: 5, coverage: 52, color: 'rgba(20, 184, 166, 1)' },
        { zone: 6, coverage: 38, color: 'rgba(20, 184, 166, 0.8)' },
        { zone: 7, coverage: 8, color: 'rgba(20, 184, 166, 0.2)' },
        { zone: 8, coverage: 48, color: 'rgba(20, 184, 166, 1)' },
        { zone: 9, coverage: 55, color: 'rgba(20, 184, 166, 1)' },
        { zone: 10, coverage: 42, color: 'rgba(20, 184, 166, 0.85)' },
        { zone: 11, coverage: 5, color: 'rgba(20, 184, 166, 0.15)' },
        { zone: 12, coverage: 15, color: 'rgba(20, 184, 166, 0.35)' },
        { zone: 13, coverage: 22, color: 'rgba(20, 184, 166, 0.45)' },
        { zone: 14, coverage: 28, color: 'rgba(20, 184, 166, 0.55)' },
        { zone: 15, coverage: 18, color: 'rgba(20, 184, 166, 0.4)' },
        { zone: 16, coverage: 8, color: 'rgba(20, 184, 166, 0.2)' },
      ],
      bottomPlayerZoneCoverage: [
        { zone: 1, coverage: 15, color: 'rgba(20, 184, 166, 0.35)' },
        { zone: 2, coverage: 22, color: 'rgba(20, 184, 166, 0.45)' },
        { zone: 3, coverage: 18, color: 'rgba(20, 184, 166, 0.4)' },
        { zone: 4, coverage: 35, color: 'rgba(20, 184, 166, 0.7)' },
        { zone: 5, coverage: 40, color: 'rgba(20, 184, 166, 0.8)' },
        { zone: 6, coverage: 32, color: 'rgba(20, 184, 166, 0.65)' },
        { zone: 7, coverage: 12, color: 'rgba(20, 184, 166, 0.3)' },
        { zone: 8, coverage: 38, color: 'rgba(20, 184, 166, 0.75)' },
        { zone: 9, coverage: 45, color: 'rgba(20, 184, 166, 0.9)' },
        { zone: 10, coverage: 36, color: 'rgba(20, 184, 166, 0.72)' },
        { zone: 11, coverage: 8, color: 'rgba(20, 184, 166, 0.2)' },
        { zone: 12, coverage: 20, color: 'rgba(20, 184, 166, 0.42)' },
        { zone: 13, coverage: 28, color: 'rgba(20, 184, 166, 0.55)' },
        { zone: 14, coverage: 34, color: 'rgba(20, 184, 166, 0.68)' },
        { zone: 15, coverage: 25, color: 'rgba(20, 184, 166, 0.5)' },
        { zone: 16, coverage: 12, color: 'rgba(20, 184, 166, 0.3)' },
      ],
    })
  }

  return (
    <div style={{ backgroundColor: '#0a0e27', minHeight: '100vh' }} className="pt-20 pb-20">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm flex items-center gap-2 mb-4" style={{ color: '#64748B' }}>
            <span>←</span> Back to home
          </Link>
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#ffffff' }}>
            Court Coverage Analyzer
          </h1>
          <p style={{ color: '#CBD5E1' }}>
            Upload a badminton video to analyze court coverage, player movement patterns, and zone utilization with AI-powered insights.
          </p>
        </div>

        {/* Backend URL Input */}
        <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#14B8A6' }}>
              Upload target
            </p>
            <p className="text-sm text-slate-300">
              Using local API endpoint: <code className="text-xs">/api/analyze/video</code>
            </p>
          </div>
        </div>

        {/* Upload Area or Results */}
        {!analysisResult ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="mb-12 p-12 rounded-lg border-2 border-dashed transition-all cursor-pointer"
            style={{
              borderColor: isDragging ? '#14B8A6' : '#1e293b',
              backgroundColor: isDragging ? 'rgba(20, 184, 166, 0.05)' : '#0f172a',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
              className="hidden"
            />

            <div className="text-center">
              <div className="text-5xl mb-4">🎬</div>
              {isProcessing ? (
                <>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#ffffff' }}>
                    Processing Your Video...
                  </h3>
                  <p style={{ color: '#CBD5E1' }}>
                    Analyzing court coverage and player movement patterns
                  </p>
                  <div className="mt-6 flex justify-center">
                    <div
                      className="w-8 h-8 rounded-full animate-spin"
                      style={{
                        borderTop: '2px solid #14B8A6',
                        borderRight: '2px solid transparent',
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#ffffff' }}>
                    Drag and drop your video here
                  </h3>
                  <p style={{ color: '#CBD5E1' }}>
                    or click to select a file
                  </p>
                  <p className="text-xs mt-4" style={{ color: '#64748B' }}>
                    Supported formats: MP4, MOV, AVI, WebM
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid #dc2626' }}>
                <p className="text-sm" style={{ color: '#fca5a5' }}>
                  {error}
                </p>
                <button
                  onClick={loadDemoAnalysis}
                  className="mt-3 text-sm font-semibold px-4 py-2 rounded transition-all"
                  style={{ backgroundColor: '#14B8A6', color: '#0F172A' }}
                >
                  Try Demo Analysis Instead
                </button>
              </div>
            )}

            {!error && !isProcessing && (
              <div className="mt-6 pt-6 border-t" style={{ borderColor: '#1e293b' }}>
                <button
                  onClick={loadDemoAnalysis}
                  className="text-sm font-semibold px-4 py-2 rounded transition-all"
                  style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)', color: '#14B8A6', border: '1px solid #14B8A6' }}
                >
                  Try Demo Analysis
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Results Header */}
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>
                {analysisResult.analysisData ? 'Analysis Complete' : 'Video Uploaded'}
              </h2>
              <p style={{ color: '#CBD5E1' }}>
                Video: {analysisResult.videoFileName}
              </p>
              {analysisResult.message && (
                <p className="mt-2" style={{ color: '#94a3b8' }}>
                  {analysisResult.message}
                </p>
              )}
              {analysisResult.analysisError && (
                <p className="mt-2 text-sm" style={{ color: '#fca5a5' }}>
                  Analysis unavailable: {analysisResult.analysisError}
                </p>
              )}
            </div>

            {/* Heatmap */}
            {analysisResult.topPlayerZoneCoverage && analysisResult.bottomPlayerZoneCoverage && (
              <CourtHeatmap
                topPlayerZones={analysisResult.topPlayerZoneCoverage}
                bottomPlayerZones={analysisResult.bottomPlayerZoneCoverage}
              />
            )}

            {/* Output files */}
            {analysisResult.outputFiles?.length ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                  Generated Output Files
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisResult.outputFiles.map((file: any) => {
                    const lower = (file.type || file.name || '').toString().toLowerCase()
                    const isImage = lower === 'png' || lower === 'jpg' || lower === 'jpeg'
                    const isVideo = lower === 'mp4' || lower === 'mov'

                    return (
                      <div key={file.url || file.name} className="p-4 rounded-lg" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                        <p className="text-sm font-semibold mb-2" style={{ color: '#94a3b8' }}>
                          {file.name || file.url?.split('/').pop()}
                        </p>
                        {isImage ? (
                          <img src={file.url} alt={file.name || 'Output image'} className="w-full rounded-lg" />
                        ) : isVideo ? (
                          <video controls className="w-full rounded-lg">
                            <source src={file.url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <a href={file.url} target="_blank" rel="noreferrer" className="text-sm text-teal-400">
                            Download file
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* Stats */}
            {analysisResult.analysisData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(analysisResult.analysisData).map(([key, value]) => (
                  <div key={key} className="p-6 rounded-lg" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>
                      {key.toUpperCase().replace(/_/g, ' ')}
                    </p>
                    <p className="text-2xl font-bold" style={{ color: '#14B8A6' }}>
                      {typeof value === 'number' ? value.toFixed(2) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setAnalysisResult(null)
                  setUploadedVideo(null)
                  setError(null)
                }}
                className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: '#14B8A6', color: '#0F172A' }}
              >
                Analyze Another Video
              </button>
              <Link
                href="/my-progress"
                className="px-6 py-3 rounded-lg font-semibold transition-all text-center"
                style={{ backgroundColor: '#1a1a2e', color: '#14B8A6', border: '1px solid #14B8A6' }}
              >
                View All Analyses
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
