import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const TEMP_BASE_DIR = path.join(ROOT_DIR, 'temp_media_downloads');

// Ensure base temp directory exists
if (!fs.existsSync(TEMP_BASE_DIR)) {
  fs.mkdirSync(TEMP_BASE_DIR, { recursive: true });
}

// Check for yt-dlp & ffmpeg locations on host
const YTDLP_PATH = fs.existsSync('C:\\Python314\\Scripts\\yt-dlp.exe')
  ? 'C:\\Python314\\Scripts\\yt-dlp.exe'
  : 'yt-dlp.exe';

const FFMPEG_DIR = 'C:\\Users\\aaron\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin';

interface TaskInfo {
  id: string;
  url: string;
  mode: 'auto' | 'audio';
  quality: string;
  status: 'pending' | 'downloading' | 'processing' | 'done' | 'error';
  progress: number;
  speed: string;
  eta: string;
  stage: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  error?: string;
  createdAt: number;
}

const tasks = new Map<string, TaskInfo>();

// Clean old files every 30 mins
setInterval(() => {
  const now = Date.now();
  for (const [id, task] of tasks.entries()) {
    if (now - task.createdAt > 1000 * 60 * 60) { // 1 hour old
      try {
        const taskDir = path.join(TEMP_BASE_DIR, id);
        if (fs.existsSync(taskDir)) {
          fs.rmSync(taskDir, { recursive: true, force: true });
        }
      } catch {}
      tasks.delete(id);
    }
  }
}, 1000 * 60 * 30);

export function registerMediaBridge(server: any) {
  // 1. Start download task: POST /api/media-download/start
  server.middlewares.use('/api/media-download/start', (req: any, res: any) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const url = (parsed.url || '').trim();
        const mode = parsed.mode === 'audio' ? 'audio' : 'auto';
        const quality = parsed.quality || '1080';

        if (!url) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'URL is required' }));
          return;
        }

        const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const taskDir = path.join(TEMP_BASE_DIR, taskId);
        fs.mkdirSync(taskDir, { recursive: true });

        const task: TaskInfo = {
          id: taskId,
          url,
          mode,
          quality,
          status: 'pending',
          progress: 0,
          speed: '',
          eta: '',
          stage: '작업 준비 중...',
          fileName: '',
          filePath: '',
          fileSize: 0,
          createdAt: Date.now(),
        };
        tasks.set(taskId, task);

        // Start yt-dlp process
        startTaskProcess(task, taskDir);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, taskId }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  // 2. Query task status: GET /api/media-download/status?taskId=...
  server.middlewares.use('/api/media-download/status', (req: any, res: any) => {
    const urlObj = new URL(req.url, 'http://localhost');
    const taskId = urlObj.searchParams.get('taskId');

    if (!taskId || !tasks.has(taskId)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Task not found' }));
      return;
    }

    const task = tasks.get(taskId)!;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      id: task.id,
      status: task.status,
      progress: task.progress,
      speed: task.speed,
      eta: task.eta,
      stage: task.stage,
      fileName: task.fileName,
      fileSize: task.fileSize,
      error: task.error,
    }));
  });

  // 3. Download finished file: GET /api/media-download/file?taskId=...
  server.middlewares.use('/api/media-download/file', (req: any, res: any) => {
    const urlObj = new URL(req.url, 'http://localhost');
    const taskId = urlObj.searchParams.get('taskId');

    if (!taskId || !tasks.has(taskId)) {
      res.statusCode = 404;
      res.end('File or Task not found');
      return;
    }

    const task = tasks.get(taskId)!;
    if (task.status !== 'done' || !task.filePath || !fs.existsSync(task.filePath)) {
      res.statusCode = 400;
      res.end('File is not ready yet');
      return;
    }

    const stat = fs.statSync(task.filePath);
    const ext = path.extname(task.fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.m4a') contentType = 'audio/mp4';
    else if (ext === '.opus') contentType = 'audio/opus';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.mkv') contentType = 'video/x-matroska';
    else if (ext === '.webm') contentType = 'video/webm';

    // Proper UTF-8 Content-Disposition
    const safeAscii = (task.fileName || 'download').replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(task.fileName || 'download');

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodedName}`,
    });

    const stream = fs.createReadStream(task.filePath);
    stream.pipe(res);
  });
}

function startTaskProcess(task: TaskInfo, taskDir: string) {
  const outputTemplate = path.join(taskDir, '%(title)s.%(ext)s');
  const args = [
    '--js-runtimes', 'node',
    '--windows-filenames',
    '--no-warnings',
    '--newline',
    '--no-playlist',
  ];

  if (fs.existsSync(FFMPEG_DIR)) {
    args.push('--ffmpeg-location', FFMPEG_DIR);
  }

  args.push('-o', outputTemplate);

  if (task.mode === 'audio') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    // Video
    let formatFilter = 'bv*+ba/b';
    if (task.quality === '1080') formatFilter = 'bv*[height<=1080]+ba/b';
    else if (task.quality === '720') formatFilter = 'bv*[height<=720]+ba/b';
    else if (task.quality === '480') formatFilter = 'bv*[height<=480]+ba/b';
    else if (task.quality === '360') formatFilter = 'bv*[height<=360]+ba/b';

    args.push('-f', formatFilter, '--merge-output-format', 'mp4');
  }

  args.push(task.url);

  task.status = 'downloading';
  task.stage = '영상 정보 확인 및 다운로드 시작...';

  // Note: shell: false avoids cmd.exe word splitting when paths have spaces!
  const child = spawn(YTDLP_PATH, args, {
    shell: false,
  });

  child.stdout.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract download progress
      // e.g. [download]  45.0% of   12.80MiB at   19.53MiB/s ETA 00:00
      const progressMatch = trimmed.match(/\[download\]\s+([\d.]+)%/);
      if (progressMatch) {
        task.status = 'downloading';
        task.progress = Math.min(99, Math.max(0, parseFloat(progressMatch[1])));

        const speedMatch = trimmed.match(/at\s+([^\s]+(?:\s+[^\s]+)?)/);
        if (speedMatch && !speedMatch[1].startsWith('ETA')) {
          task.speed = speedMatch[1];
        }
        const etaMatch = trimmed.match(/ETA\s+([^\s]+)/);
        if (etaMatch) {
          task.eta = etaMatch[1];
        }
        task.stage = `다운로드 중... ${task.progress.toFixed(1)}%${task.speed ? ` (${task.speed}` : ''}${task.eta ? `, 남은 시간: ${task.eta})` : ')'}`;
        continue;
      }

      // Check conversion stages
      if (trimmed.includes('[ExtractAudio]')) {
        task.status = 'processing';
        task.progress = 95;
        task.stage = '고음질 MP3 변환 중...';
      } else if (trimmed.includes('[Merger]')) {
        task.status = 'processing';
        task.progress = 95;
        task.stage = '비디오와 오디오 고화질 병합 중...';
      }
    }
  });

  let errorOutput = '';
  child.stderr.on('data', (chunk: Buffer) => {
    errorOutput += chunk.toString();
  });

  child.on('close', (code) => {
    if (code === 0) {
      try {
        // Find generated file in taskDir
        const files = fs.readdirSync(taskDir).filter(f => !f.endsWith('.part') && !f.endsWith('.ytdl') && !f.endsWith('.temp'));
        const targetFile = files.find(f => {
          if (task.mode === 'audio') return f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.opus');
          return f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm');
        }) || files[0];

        if (targetFile) {
          const filePath = path.join(taskDir, targetFile);
          const stat = fs.statSync(filePath);
          task.status = 'done';
          task.progress = 100;
          task.fileName = targetFile;
          task.filePath = filePath;
          task.fileSize = stat.size;
          task.stage = '변환 및 다운로드 완료!';
          return;
        }
      } catch (err: any) {
        task.status = 'error';
        task.error = '파일 확인 중 오류: ' + err.message;
        return;
      }
    }

    task.status = 'error';
    task.error = errorOutput.trim() || `프로세스 오류로 실패했습니다 (종료 코드 ${code})`;
  });

  child.on('error', (err) => {
    task.status = 'error';
    task.error = 'yt-dlp 실행 실패: ' + err.message;
  });
}
