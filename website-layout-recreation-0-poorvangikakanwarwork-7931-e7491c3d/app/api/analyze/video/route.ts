import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { promises as fsPromises } from 'fs'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'

const PROJECT_ROOT = process.cwd()
const UPLOAD_DIR = path.join(PROJECT_ROOT, 'backend_uploads')
const OUTPUT_BASE_DIR = path.join(PROJECT_ROOT, 'backend_analysis')
const PUBLIC_OUTPUT_BASE_DIR = path.join(PROJECT_ROOT, 'public', 'static', 'output')
const PIPELINE_SCRIPT = path.join(PROJECT_ROOT, 'components', 'backend', 'court analysis', 'court_detection_pipeline.py')
const REFERENCE_IMAGE = path.join(PROJECT_ROOT, 'components', 'backend', 'court analysis', 'referenceimage.png')
const PYTHON_EXEC = process.env.PYTHON || process.env.PYTHON3 || 'python'

async function ensureDirectories() {
  await fsPromises.mkdir(UPLOAD_DIR, { recursive: true })
  await fsPromises.mkdir(OUTPUT_BASE_DIR, { recursive: true })
  await fsPromises.mkdir(PUBLIC_OUTPUT_BASE_DIR, { recursive: true })
}

async function removeIfExists(targetPath: string) {
  if (await fsPromises.stat(targetPath).catch(() => null)) {
    await fsPromises.rm(targetPath, { recursive: true, force: true })
  }
}

async function clearDirectory(targetPath: string) {
  const entries = await fsPromises.readdir(targetPath).catch(() => [])
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(targetPath, entry)
      await fsPromises.rm(entryPath, { recursive: true, force: true })
    })
  )
}

async function runPythonPipeline(args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(PYTHON_EXEC, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr })
    })
  })
}

function buildStaticUrl(analysisId: string, fileName: string) {
  return `/static/output/${encodeURIComponent(analysisId)}/${encodeURIComponent(fileName)}`
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories()

    const formData = await request.formData()
    const file = formData.get('video')
    if (!(file instanceof File)) {
      return NextResponse.json({ status: 'error', message: 'A video file is required' }, { status: 400 })
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ status: 'error', message: 'Uploaded file must be a video' }, { status: 400 })
    }

    const analysisId = formData.get('analysis_id')?.toString() || randomUUID()
    const savedVideoName = `${analysisId}-${file.name}`
    const savedVideoPath = path.join(UPLOAD_DIR, savedVideoName)
    const outputDir = path.join(OUTPUT_BASE_DIR, analysisId)
    const publicOutputDir = path.join(PUBLIC_OUTPUT_BASE_DIR, analysisId)

    await clearDirectory(UPLOAD_DIR)
    await clearDirectory(OUTPUT_BASE_DIR)
    await clearDirectory(PUBLIC_OUTPUT_BASE_DIR)
    await fsPromises.mkdir(outputDir, { recursive: true })
    await fsPromises.mkdir(publicOutputDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await fsPromises.writeFile(savedVideoPath, buffer)

    if (!fs.existsSync(PIPELINE_SCRIPT)) {
      return NextResponse.json({ status: 'error', message: 'Python pipeline script not found' }, { status: 500 })
    }

    const args = [
      PIPELINE_SCRIPT,
      '--video',
      savedVideoPath,
      '--ref-image',
      REFERENCE_IMAGE,
      '--output-dir',
      outputDir,
      '--no-debug',
    ]

    const skipVideo = formData.get('generate_video')?.toString() === 'false'
    if (skipVideo) {
      args.push('--no-video')
    }

    const yoloModel = formData.get('yolo_model')?.toString()
    if (yoloModel) {
      args.push('--yolo-model', yoloModel)
    }

    const startTime = Date.now()
    const result = await runPythonPipeline(args)
    const elapsedMs = Date.now() - startTime
    if (result.code !== 0) {
      return NextResponse.json({ status: 'error', message: result.stderr || result.stdout || 'Python pipeline execution failed' }, { status: 500 })
    }

    const topDataPath = path.join(outputDir, 'top_player_data.json')
    const bottomDataPath = path.join(outputDir, 'bottom_player_data.json')
    const fullCourtImagePath = path.join(outputDir, 'full_court_32_zone_map.png')
    const trackedHeatmapPath = path.join(outputDir, 'tracked_heatmap.mp4')

    if (!(await fsPromises.stat(topDataPath).catch(() => null))) {
      return NextResponse.json({ status: 'error', message: 'Pipeline completed but top_player_data.json is missing' }, { status: 500 })
    }

    if (!(await fsPromises.stat(bottomDataPath).catch(() => null))) {
      return NextResponse.json({ status: 'error', message: 'Pipeline completed but bottom_player_data.json is missing' }, { status: 500 })
    }

    const topPlayerTracking = JSON.parse(await fsPromises.readFile(topDataPath, 'utf8'))
    const bottomPlayerTracking = JSON.parse(await fsPromises.readFile(bottomDataPath, 'utf8'))

    const mediaUrls: Record<string, string | null> = {
      full_court_heatmap: null,
      top_zone_map: null,
      bottom_zone_map: null,
      video: null,
    }

    const expectedOutputs = [
      { source: fullCourtImagePath, target: 'full_court_32_zone_map.png', key: 'full_court_heatmap' },
      { source: path.join(outputDir, 'top_player_16_zone_map.png'), target: 'top_player_16_zone_map.png', key: 'top_zone_map' },
      { source: path.join(outputDir, 'bottom_player_16_zone_map.png'), target: 'bottom_player_16_zone_map.png', key: 'bottom_zone_map' },
      { source: trackedHeatmapPath, target: 'tracked_heatmap.mp4', key: 'video' },
    ]

    for (const item of expectedOutputs) {
      if (await fsPromises.stat(item.source).catch(() => null)) {
        await fsPromises.copyFile(item.source, path.join(publicOutputDir, item.target))
        mediaUrls[item.key] = buildStaticUrl(analysisId, item.target)
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        top_player_tracking: topPlayerTracking,
        bottom_player_tracking: bottomPlayerTracking,
        processing_time_ms: elapsedMs,
      },
      media_urls: mediaUrls,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unexpected server error',
      },
      { status: 500 }
    )
  }
}
