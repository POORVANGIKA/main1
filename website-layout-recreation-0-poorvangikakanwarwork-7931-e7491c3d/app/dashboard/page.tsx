'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { getUserAnalyses, deleteAnalysis } from '@/app/actions/court-analysis'
import { Header } from '@/components/header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Video, Play, Trash2, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface Analysis {
  id: string
  videoFileName: string
  videoUrl: string
  analysisStatus: string
  createdAt: string | Date
  topPlayerZoneCoverage?: any
  bottomPlayerZoneCoverage?: any
}

export default function Dashboard() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      const sessionResponse = await authClient.getSession()
      const session = sessionResponse?.data
      if (!session?.user) {
        router.push('/sign-in')
        return
      }
      setUser(session.user)
      
      try {
        const userAnalyses = await getUserAnalyses()
        setAnalyses(
          (userAnalyses as any[]).map((analysis) => ({
            id: analysis.id,
            videoFileName: analysis.videoFileName,
            videoUrl: analysis.videoUrl,
            analysisStatus: analysis.analysisStatus,
            createdAt: analysis.createdAt,
            topPlayerZoneCoverage: analysis.topPlayerZoneCoverage,
            bottomPlayerZoneCoverage: analysis.bottomPlayerZoneCoverage,
          }))
        )
      } catch (error) {
        console.error('[v0] Failed to fetch analyses:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [router])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteAnalysis(id)
      setAnalyses(analyses.filter(a => a.id !== id))
    } catch (error) {
      console.error('[v0] Failed to delete analysis:', error)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse">Loading...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600">Manage your video analyses and court coverage reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="p-8 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Total Videos</h3>
              <Video className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analyses.length}</p>
          </Card>

          <Card className="p-8 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Processed</h3>
              <Play className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analyses.filter(a => a.analysisStatus === 'completed').length}
            </p>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Analyses</h2>
            <Button
              onClick={() => router.push('/court-coverage')}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Upload New Video
            </Button>
          </div>

          {analyses.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-gray-200">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No videos uploaded yet</p>
              <Button
                onClick={() => router.push('/court-coverage')}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Upload Your First Video
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {analyses.map((analysis) => (
                <Card key={analysis.id} className="p-6 bg-white border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{analysis.videoFileName}</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(analysis.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        {analysis.analysisStatus === 'completed' && (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">Completed</span>
                          </>
                        )}
                        {analysis.analysisStatus === 'processing' && (
                          <>
                            <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                            <span className="text-sm text-blue-600 font-medium">Processing</span>
                          </>
                        )}
                        {analysis.analysisStatus === 'failed' && (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600 font-medium">Failed</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(analysis.videoUrl, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={deleting === analysis.id}
                        onClick={() => handleDelete(analysis.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {analysis.analysisStatus === 'completed' && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-sm font-semibold text-gray-800">Analysis Outputs</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-lg overflow-hidden border border-gray-200">
                          <p className="px-3 py-2 text-xs font-semibold text-gray-500">Full Court Heatmap</p>
                          <img
                            src={`/static/output/${analysis.id}/full_court_32_zone_map.png`}
                            alt="Full court heatmap"
                            className="w-full h-40 object-cover"
                          />
                        </div>
                        <div className="rounded-lg overflow-hidden border border-gray-200">
                          <p className="px-3 py-2 text-xs font-semibold text-gray-500">Top Player Map</p>
                          <img
                            src={`/static/output/${analysis.id}/top_player_16_zone_map.png`}
                            alt="Top player zone map"
                            className="w-full h-40 object-cover"
                          />
                        </div>
                        <div className="rounded-lg overflow-hidden border border-gray-200">
                          <p className="px-3 py-2 text-xs font-semibold text-gray-500">Bottom Player Map</p>
                          <img
                            src={`/static/output/${analysis.id}/bottom_player_16_zone_map.png`}
                            alt="Bottom player zone map"
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <p className="px-3 py-2 text-xs font-semibold text-gray-500">Tracked Heatmap Video</p>
                        <video
                          controls
                          className="w-full h-60 bg-black"
                          src={`/static/output/${analysis.id}/tracked_heatmap.mp4`}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
