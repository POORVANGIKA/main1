const fs = require('fs')
const fsPromises = require('fs/promises')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = 8000
const UPLOAD_DIR = path.join(__dirname, 'backend_uploads')
const OUTPUT_BASE_DIR = path.join(__dirname, 'backend_analysis')
const PYTHON_EXEC = process.env.PYTHON || process.env.PYTHON3 || 'python'
const PIPELINE_SCRIPT = path.join(__dirname, 'components', 'backend', 'court analysis', 'court_detection_pipeline.py')
const REFERENCE_IMAGE = path.join(__dirname, 'public', 'court-coverage.png')

async function ensureDirectories() {
  await fsPromises.mkdir(UPLOAD_DIR, { recursive: true })
  await fsPromises.mkdir(OUTPUT_BASE_DIR, { recursive: true })
}

// Middleware
app.use(cors())
app.use(express.json())

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

const upload = multer({ storage })

function generateMockAnalysis() {
  return {
    analysis: {
      total_frames_analyzed: Math.floor(Math.random() * 2000 + 1500),
      average_coverage_percentage: parseFloat((Math.random() * 30 + 50).toFixed(2)),
      primary_zones: '4, 5, 8, 9',
      movement_speed_avg: parseFloat((Math.random() * 2 + 3).toFixed(2)),
      zone_transitions: Math.floor(Math.random() * 500 + 500),
    },
    zones: {
      top_player: { zones: 16, grid_size: [4, 4] },
      bottom_player: { zones: 16, grid_size: [4, 4] },
    },
    heatmap: {
      resolution: [1280, 720],
      zones_count: 32,
    },
    top_player_zones: Array.from({ length: 16 }, (_, i) => ({
      zone: i + 1,
      coverage: Math.floor(Math.random() * 55 + 5),
      color: `rgba(20, 184, 166, ${(Math.random() * 0.8 + 0.1).toFixed(2)})`,
    })),
    bottom_player_zones: Array.from({ length: 16 }, (_, i) => ({
      zone: i + 1,
      coverage: Math.floor(Math.random() * 55 + 5),
      color: `rgba(20, 184, 166, ${(Math.random() * 0.8 + 0.1).toFixed(2)})`,
    })),
    _mock: true,
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'Court analysis backend is running' })
})

app.get('/docs', (req, res) => {
  res.json({
    title: 'Badminton Court Analysis API',
    description: 'Backend for running the court detection pipeline over uploaded video files',
    endpoints: {
      'POST /analyze/video': 'Upload a video and run court analysis',
      'GET /health': 'Check server health',
    },
  })
})

app.post('/analyze/video', upload.single('video'), async (req, res) => {
  try {
    await ensureDirectories()

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No video file uploaded' })
    }

    const analysisId = req.body.analysis_id || req.body.analysisId || uuidv4()
    const savedVideoPath = req.file.path
    const outputDir = path.join(OUTPUT_BASE_DIR, analysisId)

    await fsPromises.mkdir(outputDir, { recursive: true })

    console.log(`[Backend] Received video upload for analysis_id=${analysisId}`)
    console.log(`[Backend] Saved file to ${savedVideoPath}`)

    if (!fs.existsSync(PIPELINE_SCRIPT)) {
      throw new Error(`Pipeline script not found: ${PIPELINE_SCRIPT}`)
    }

    const args = [PIPELINE_SCRIPT, '--video', savedVideoPath, '--ref-image', REFERENCE_IMAGE, '--output-dir', outputDir, '--no-video', '--no-debug']
    if (req.body.yolo_model) {
      args.push('--yolo-model', req.body.yolo_model)
    }

    console.log(`[Backend] Running Python pipeline: ${PYTHON_EXEC} ${args.join(' ')}`)

    const child = spawn(PYTHON_EXEC, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    const exitCode = await new Promise((resolve, reject) => {
      child.on('close', resolve)
      child.on('error', reject)
    })

    if (exitCode !== 0) {
      console.error('[Backend] Python pipeline failed', stderr)
      return res.status(500).json({
        status: 'error',
        message: 'Python pipeline failed',
        error: stderr || stdout,
      })
    }

    const summaryPath = path.join(outputDir, 'analysis_summary.json')
    if (!fs.existsSync(summaryPath)) {
      throw new Error('Pipeline finished without producing analysis_summary.json')
    }

    const summary = JSON.parse(await fsPromises.readFile(summaryPath, 'utf-8'))

    res.json({
      status: 'success',
      analysis_id: analysisId,
      video_path: savedVideoPath,
      output_dir: outputDir,
      analysis: summary,
    })
  } catch (error) {
    console.error('[Backend] Error processing video:', error)
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unexpected backend error',
      details: error instanceof Error ? error.stack : undefined,
    })
  }
})

app.listen(PORT, () => {
  console.log(`Court analysis backend running on http://localhost:${PORT}`)
})
