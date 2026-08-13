import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FolderOpen, Video } from 'lucide-react'

const OUTPUT_BASE_DIR = path.join(process.cwd(), 'public', 'static', 'output')

async function getLatestAnalysisFolder() {
  if (!fs.existsSync(OUTPUT_BASE_DIR)) {
    return null
  }

  const entries = await fs.promises.readdir(OUTPUT_BASE_DIR, { withFileTypes: true })
  const directories = entries.filter((entry) => entry.isDirectory())

  if (directories.length === 0) {
    return null
  }

  const directoriesWithTime = await Promise.all(
    directories.map(async (entry) => {
      const stats = await fs.promises.stat(path.join(OUTPUT_BASE_DIR, entry.name))
      return { name: entry.name, mtime: stats.mtime.getTime() }
    })
  )

  const latest = directoriesWithTime.sort((a, b) => b.mtime - a.mtime)[0]?.name
  if (!latest) {
    return null
  }

  const files = await fs.promises.readdir(path.join(OUTPUT_BASE_DIR, latest))
  return {
    analysisId: latest,
    files,
  }
}

export default async function MyProgressPage() {
  const analysis = await getLatestAnalysisFolder()

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-24">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3 text-slate-500">
              <FolderOpen className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-[0.2em]">Analysis Output Viewer</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900">All Analysis Outputs</h1>
            <p className="mt-3 text-base text-slate-600">
              Browse the generated output files from the pipeline folder and preview images and videos for each analysis.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/court-coverage">
              <Button className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50">
                <ArrowLeft className="w-4 h-4 mr-2" /> Upload Another Video
              </Button>
            </Link>
          </div>
        </div>

        {!analysis ? (
          <Card className="p-10 text-center bg-white border border-slate-200">
            <Video className="mx-auto mb-4 w-12 h-12 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-900">No output files found yet</h2>
            <p className="mt-2 text-slate-600">Upload a video and run analysis to generate outputs in the output folder.</p>
          </Card>
        ) : (
          <Card className="bg-white border border-slate-200 p-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">Latest Analysis ID</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 break-all">{analysis.analysisId}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                {analysis.files.length} file{analysis.files.length === 1 ? '' : 's'} available
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {analysis.files.map((fileName) => {
                const fileUrl = `/static/output/${encodeURIComponent(analysis.analysisId)}/${encodeURIComponent(fileName)}`
                const lower = fileName.toLowerCase()
                if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
                  return (
                    <a
                      key={fileName}
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:ring-2 hover:ring-indigo-300"
                    >
                      <img src={fileUrl} alt={fileName} className="h-48 w-full object-cover" />
                      <div className="p-3 text-sm font-medium text-slate-800">{fileName}</div>
                    </a>
                  )
                }

                if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
                  return (
                    <div key={fileName} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={fileUrl}
                        className="h-48 w-full bg-black object-cover"
                      >
                        Your browser does not support video playback.
                      </video>
                      <div className="p-3 text-sm font-medium text-slate-800">
                        {fileName}
                        <div className="mt-2 text-xs text-slate-500">
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">
                            Open full video
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <a
                    key={fileName}
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    {fileName}
                  </a>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}
