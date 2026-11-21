import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import {
  Film, Music, Upload, Download, Loader2, X, Play,
  AlertCircle, CheckCircle2, Link as LinkIcon, RefreshCw,
  Sparkles, FileVideo, FileAudio, Check, Info, ArrowRight
} from 'lucide-react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { saveAs } from 'file-saver';
import { isLocalServer } from '../../utils/installerBridge';

type MediaTab = 'video' | 'audio' | 'url';

const VIDEO_FORMATS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'gif'] as const;
const AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus'] as const;

type VideoFmt = (typeof VIDEO_FORMATS)[number];
type AudioFmt = (typeof AUDIO_FORMATS)[number];

interface ConvertJob {
  id: string;
  fileName: string;
  originalSize: number;
  status: 'waiting' | 'converting' | 'done' | 'error';
  progress: number;
  outputBlob?: Blob;
  outputName?: string;
  errorMsg?: string;
}

// ─── In-App URL Downloader Task State ─────────────────────────────────────────
interface DownloadTask {
  id: string;
  status: 'idle' | 'downloading' | 'processing' | 'done' | 'error';
  progress: number;
  speed: string;
  eta: string;
  stage: string;
  fileName: string;
  fileSize: number;
  error?: string;
}

const SUPPORTED_SITES = [
  'YouTube', 'TikTok', 'Twitter / X', 'Instagram', 'SoundCloud',
  'Reddit', 'Bilibili', 'Vimeo', 'Twitch Clips', 'Pinterest',
  'Facebook', 'Dailymotion', '그 외 100+ 사이트',
];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const MediaConverterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MediaTab>('video');
  const [videoJobs, setVideoJobs] = useState<ConvertJob[]>([]);
  const [audioJobs, setAudioJobs] = useState<ConvertJob[]>([]);
  const [videoOutputFmt, setVideoOutputFmt] = useState<VideoFmt>('mp4');
  const [audioOutputFmt, setAudioOutputFmt] = useState<AudioFmt>('mp3');

  // ── In-App URL downloader state ─────────────────────────────────────────────
  const [urlInput, setUrlInput] = useState('');
  const [urlMode, setUrlMode] = useState<'auto' | 'audio'>('auto');
  const [urlQuality, setUrlQuality] = useState<'max' | '1080' | '720' | '480' | '360'>('1080');
  const [downloadTask, setDownloadTask] = useState<DownloadTask | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const ffmpegLoadedRef = useRef(false);
  const videoDrop = useRef<HTMLDivElement>(null);
  const audioDrop = useRef<HTMLDivElement>(null);

  const jobs = activeTab === 'video' ? videoJobs : audioJobs;
  const setJobs = activeTab === 'video' ? setVideoJobs : setAudioJobs;

  // Load FFmpeg for local file conversions
  const loadFFmpeg = useCallback(async (): Promise<FFmpeg> => {
    if (ffmpegRef.current && ffmpegLoadedRef.current) return ffmpegRef.current;

    setIsLoading(true);
    setLoadingMsg('FFmpeg 엔진 로딩 중... (최초 1회만, 약 20~60초 소요)');

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegLoadedRef.current = true;
    setIsLoading(false);
    setLoadingMsg('');
    return ffmpeg;
  }, []);

  const addFiles = (files: File[]) => {
    const newJobs: ConvertJob[] = files.map((f) => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      fileName: f.name,
      originalSize: f.size,
      status: 'waiting',
      progress: 0,
      _file: f,
    } as ConvertJob & { _file: File }));
    setJobs((prev) => [...prev, ...newJobs]);
    return newJobs;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) addFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const updateJob = (id: string, patch: Partial<ConvertJob>, isVideo?: boolean) => {
    const setter = isVideo !== undefined ? (isVideo ? setVideoJobs : setAudioJobs) : setJobs;
    setter((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const convertAll = async () => {
    const waitingJobs = jobs.filter((j) => j.status === 'waiting');
    if (!waitingJobs.length) return;

    let ffmpeg: FFmpeg;
    try {
      ffmpeg = await loadFFmpeg();
    } catch (err: any) {
      alert(`FFmpeg 로드 실패: ${err.message}\n\n네트워크 연결을 확인하세요.`);
      return;
    }

    const outputFmt = activeTab === 'video' ? videoOutputFmt : audioOutputFmt;
    const isVid = activeTab === 'video';

    for (const job of waitingJobs) {
      // @ts-ignore
      const file: File = (job as any)._file;
      if (!file) continue;

      updateJob(job.id, { status: 'converting', progress: 0 }, isVid);

      const progressHandler = ({ progress }: { progress: number }) => {
        updateJob(job.id, { progress: Math.round(progress * 100) }, isVid);
      };
      ffmpeg.on('progress', progressHandler);

      try {
        const inputName = `input_${job.id}.${file.name.split('.').pop()}`;
        const outputName = `output_${job.id}.${outputFmt}`;

        await ffmpeg.writeFile(inputName, await fetchFile(file));

        const args: string[] = ['-i', inputName];

        // Format-specific args
        if (outputFmt === 'gif') {
          args.push('-vf', 'fps=15,scale=480:-1:flags=lanczos', '-loop', '0');
        } else if (outputFmt === 'mp3') {
          args.push('-q:a', '2');
        } else if (outputFmt === 'wav') {
          args.push('-ar', '44100', '-ac', '2');
        } else if (outputFmt === 'ogg') {
          args.push('-q:a', '5', '-c:a', 'libvorbis');
        } else if (outputFmt === 'opus') {
          args.push('-c:a', 'libopus', '-b:a', '128k');
        } else if (outputFmt === 'aac' || outputFmt === 'm4a') {
          args.push('-c:a', 'aac', '-b:a', '192k');
        } else if (outputFmt === 'flac') {
          args.push('-c:a', 'flac');
        }

        args.push('-y', outputName);

        await ffmpeg.exec(args);

        const data = await ffmpeg.readFile(outputName);
        const blob = new Blob([data as any], {
          type: isVid
            ? outputFmt === 'gif' ? 'image/gif' : `video/${outputFmt}`
            : `audio/${outputFmt}`,
        });

        const baseName = file.name.replace(/\.[^.]+$/, '');
        updateJob(job.id, {
          status: 'done',
          progress: 100,
          outputBlob: blob,
          outputName: `${baseName}_converted.${outputFmt}`,
        }, isVid);

        // cleanup
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch (err: any) {
        updateJob(job.id, { status: 'error', errorMsg: err.message }, isVid);
      } finally {
        ffmpeg.off('progress', progressHandler);
      }
    }
  };

  const downloadJob = (job: ConvertJob) => {
    if (job.outputBlob && job.outputName) {
      saveAs(job.outputBlob, job.outputName);
    }
  };

  const downloadAll = () => {
    jobs.filter((j) => j.status === 'done').forEach((j) => downloadJob(j));
  };

  const clearDone = () => {
    setJobs((prev) => prev.filter((j) => j.status !== 'done'));
  };

  // ── In-App URL Downloader Logic (100% Native Local Bridge) ───────────────────
  const handleUrlDownload = async () => {
    const url = urlInput.trim();
    if (!url) return;

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    setDownloadTask({
      id: '',
      status: 'downloading',
      progress: 5,
      speed: '',
      eta: '',
      stage: '작업 요청 생성 중...',
      fileName: '',
      fileSize: 0,
    });

    try {
      const res = await fetch('/api/media-download/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          mode: urlMode,
          quality: urlQuality,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '다운로드 작업을 시작하지 못했습니다.');
      }

      const taskId = data.taskId;
      setDownloadTask((prev) =>
        prev
          ? {
              ...prev,
              id: taskId,
              stage: '미디어 정보 분석 및 고속 다운로드 시작...',
              progress: 10,
            }
          : null
      );

      // Poll status every 600ms
      pollingRef.current = setInterval(async () => {
        try {
          const sRes = await fetch(`/api/media-download/status?taskId=${taskId}`);
          if (!sRes.ok) return;
          const sData = await sRes.json();

          setDownloadTask({
            id: taskId,
            status: sData.status,
            progress: sData.progress || 0,
            speed: sData.speed || '',
            eta: sData.eta || '',
            stage: sData.stage || '',
            fileName: sData.fileName || '',
            fileSize: sData.fileSize || 0,
            error: sData.error,
          });

          if (sData.status === 'done') {
            if (pollingRef.current) clearInterval(pollingRef.current);

            // Trigger immediate browser download directly inside the app
            const dlLink = document.createElement('a');
            dlLink.href = `/api/media-download/file?taskId=${taskId}`;
            dlLink.download = sData.fileName || (urlMode === 'audio' ? 'download.mp3' : 'download.mp4');
            document.body.appendChild(dlLink);
            dlLink.click();
            document.body.removeChild(dlLink);
          } else if (sData.status === 'error') {
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        } catch {
          // ignore transient poll error
        }
      }, 600);
    } catch (err: any) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setDownloadTask({
        id: '',
        status: 'error',
        progress: 0,
        speed: '',
        eta: '',
        stage: '',
        fileName: '',
        fileSize: 0,
        error: err.message || '다운로드 요청 중 알 수 없는 오류가 발생했습니다.',
      });
    }
  };

  const triggerDirectDownload = (taskId: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = `/api/media-download/file?taskId=${taskId}`;
    a.download = fileName || (urlMode === 'audio' ? 'audio.mp3' : 'video.mp4');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetUrlDownload = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setDownloadTask(null);
    setUrlInput('');
  };

  const acceptType = activeTab === 'video' ? 'video/*' : 'audio/*';
  const formats = activeTab === 'video' ? VIDEO_FORMATS : AUDIO_FORMATS;
  const outputFmt = activeTab === 'video' ? videoOutputFmt : audioOutputFmt;
  const setOutputFmt = activeTab === 'video'
    ? (v: string) => setVideoOutputFmt(v as VideoFmt)
    : (v: string) => setAudioOutputFmt(v as AudioFmt);

  const isDownloading = downloadTask?.status === 'downloading' || downloadTask?.status === 'processing';

  return (
    <div className="space-y-6 pb-20">
      <NotionPageHeader
        icon="🎬"
        title="미디어 변환기"
        description="영상·음악 포맷 변환부터 URL 다이렉트 MP4/MP3 다운로드까지. 모든 처리는 외부 이동 없이 브라우저 내에서 안전하게 완결됩니다."
        tags={[
          { label: '영상 변환 (6가지 형식)' },
          { label: '오디오 변환 (7가지 형식)' },
          { label: 'URL 다이렉트 다운로드 (외부 이동 X)' },
          { label: 'YouTube, TikTok, Twitter 등 100+ 사이트' },
        ]}
      />

      {/* Tab Selector */}
      <div className="flex overflow-x-auto no-scrollbar items-center gap-1.5 border-b border-[#e9e9e7] dark:border-[#2f2f2f] pb-3 text-xs">
        <button
          onClick={() => setActiveTab('video')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTab === 'video'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <Film className="w-3.5 h-3.5 shrink-0" />
          <span>영상 변환기</span>
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTab === 'audio'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <Music className="w-3.5 h-3.5 shrink-0" />
          <span>오디오 변환기</span>
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTab === 'url'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
          <span>URL 다운로드</span>
        </button>
      </div>

      {/* ── URL DOWNLOADER TAB ─────────────────────────────────────────────── */}
      {activeTab === 'url' && (
        <div className="space-y-5">
          {/* 배포 환경 안내 배너 */}
          {!isLocalServer() && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold">URL 다운로드는 로컬 PC 실행 전용 기능입니다</p>
                <p className="text-amber-700 dark:text-amber-400">
                  이 기능은 PC에서 <strong>실행하기.bat</strong>으로 로컬 서버를 구동할 때만 사용 가능합니다.
                  영상·오디오 <strong>파일 변환</strong>은 위 탭(영상/오디오 변환기)에서 클라우드 없이 브라우저만으로 사용하실 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* Main Card */}
          <div className={`p-6 bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-2xl space-y-5 ${!isLocalServer() ? 'opacity-50 pointer-events-none select-none' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#f7f6f3] dark:bg-[#282828] rounded-xl">
                  <LinkIcon className="w-5 h-5 text-[#37352f] dark:text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#37352f] dark:text-white flex items-center gap-2">
                    영상/음악 URL 다이렉트 다운로드
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                      사이트 내 완결 처리
                    </span>
                  </h3>
                  <p className="text-xs text-[#787774] mt-0.5">
                    외부 사이트 이동 없이 브라우저 내에서 직접 고화질 MP4 영상이나 고음질 MP3 음원으로 내려받습니다.
                  </p>
                </div>
              </div>

              {downloadTask && (
                <button
                  onClick={resetUrlDownload}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#787774] hover:text-[#37352f] dark:hover:text-white border border-[#e9e9e7] dark:border-[#333] rounded-lg transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>초기화</span>
                </button>
              )}
            </div>

            {/* URL Input */}
            <div className="relative">
              <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaa]" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isDownloading && handleUrlDownload()}
                placeholder="https://youtube.com/watch?v=... 또는 TikTok, Twitter(X), Instagram 링크 붙여넣기"
                disabled={isDownloading}
                className="w-full pl-10 pr-10 py-3 text-sm rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-50"
              />
              {urlInput && !isDownloading && (
                <button
                  onClick={() => setUrlInput('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-black dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Options Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#787774]">다운로드 형식</label>
                <div className="flex rounded-xl bg-[#f7f6f3] dark:bg-[#282828] p-1 gap-1">
                  <button
                    disabled={isDownloading}
                    onClick={() => setUrlMode('auto')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      urlMode === 'auto'
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                        : 'text-[#787774] hover:text-[#37352f] dark:hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>MP4 (영상+음성)</span>
                  </button>
                  <button
                    disabled={isDownloading}
                    onClick={() => setUrlMode('audio')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      urlMode === 'audio'
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                        : 'text-[#787774] hover:text-[#37352f] dark:hover:text-white'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>MP3 (고음질 음원)</span>
                  </button>
                </div>
              </div>

              {urlMode === 'auto' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#787774]">영상 최대 해상도</label>
                  <select
                    value={urlQuality}
                    disabled={isDownloading}
                    onChange={(e) => setUrlQuality(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#191919] text-[#37352f] dark:text-white h-[38px] focus:outline-none"
                  >
                    <option value="max">최고화질 (원본 그대로 / 4K·2K)</option>
                    <option value="1080">1080p (Full HD - 권장)</option>
                    <option value="720">720p (HD 빠른 다운로드)</option>
                    <option value="480">480p</option>
                    <option value="360">360p</option>
                  </select>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={handleUrlDownload}
              disabled={isDownloading || !urlInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl text-sm transition hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>로컬 엔진 처리 중...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{urlMode === 'audio' ? 'MP3 음원 추출 및 다운로드' : 'MP4 영상 다운로드'}</span>
                </>
              )}
            </button>

            {/* Live Progress Card */}
            {isDownloading && downloadTask && (
              <div className="p-5 rounded-2xl bg-[#faf9f6] dark:bg-[#191919] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 text-black dark:text-white animate-spin" />
                    <div>
                      <span className="text-xs font-bold text-[#37352f] dark:text-white">
                        {downloadTask.status === 'processing' ? '오디오/비디오 인코딩 처리 중...' : '미디어 다운로드 진행 중'}
                      </span>
                      <p className="text-[11px] text-[#787774] mt-0.5">{downloadTask.stage}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#37352f] dark:text-white">
                    {downloadTask.progress.toFixed(1)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-[#e9e9e7] dark:bg-[#2f2f2f] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black dark:bg-white rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(4, downloadTask.progress)}%` }}
                  />
                </div>

                {/* Badges / Metrics */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#787774]">
                  {downloadTask.speed && (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333]">
                      속도: <b className="text-[#37352f] dark:text-white font-mono">{downloadTask.speed}</b>
                    </span>
                  )}
                  {downloadTask.eta && (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333]">
                      남은 시간: <b className="text-[#37352f] dark:text-white font-mono">{downloadTask.eta}</b>
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333]">
                    100% 로컬 다이렉트 변환
                  </span>
                </div>
              </div>
            )}

            {/* Success Card */}
            {downloadTask?.status === 'done' && (
              <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3.5 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      변환 및 다운로드가 완료되었습니다!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      브라우저 다운로드 폴더에 자동 저장되었습니다.
                    </p>
                  </div>
                </div>

                {/* File info */}
                <div className="p-3.5 bg-white dark:bg-[#1f1f1f] border border-emerald-200/70 dark:border-emerald-800/60 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {downloadTask.fileName.endsWith('.mp3') ? (
                      <Music className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Film className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#37352f] dark:text-white truncate">
                        {downloadTask.fileName}
                      </p>
                      <p className="text-[11px] text-[#787774] font-mono">
                        {formatBytes(downloadTask.fileSize)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => triggerDirectDownload(downloadTask.id, downloadTask.fileName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>다시 다운로드</span>
                    </button>
                    <button
                      onClick={resetUrlDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f7f6f3] dark:bg-[#282828] text-[#37352f] dark:text-white font-semibold text-xs rounded-lg border border-[#e9e9e7] dark:border-[#333] hover:bg-[#efefed] dark:hover:bg-[#333] transition"
                    >
                      <span>다른 링크 변환</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Card */}
            {downloadTask?.status === 'error' && (
              <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-red-900 dark:text-red-200">
                      다운로드 처리 중 오류가 발생했습니다
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed font-mono">
                      {downloadTask.error}
                    </p>
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                      * 연령 제한 콘텐츠, 비공개 영상 또는 잘못된 URL인지 확인 후 다시 시도해 주세요.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleUrlDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>다시 시도</span>
                  </button>
                  <button
                    onClick={resetUrlDownload}
                    className="px-3 py-1.5 bg-white dark:bg-[#282828] border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 font-semibold text-xs rounded-lg hover:bg-red-50 transition"
                  >
                    다른 링크 입력
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Supported Sites & Security Notice */}
          <div className="p-5 bg-[#faf9f6] dark:bg-[#191919] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#787774] shrink-0" />
                <h4 className="font-bold text-xs text-[#37352f] dark:text-white">지원 사이트 및 다운로드 안내</h4>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                100% 로컬 다이렉트 변환
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_SITES.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] rounded-lg text-xs font-medium text-[#37352f] dark:text-[#d3d3d3]"
                >
                  {s}
                </span>
              ))}
            </div>

            <p className="text-[11px] text-[#787774] leading-relaxed">
              • 외부 제3자 웹사이트나 광고 사이트로 이동하지 않고, 자체 로컬 엔진을 통해 브라우저로 바로 다운로드됩니다.
              <br />
              • 각 콘텐츠 제공자의 이용약관을 준수하여 개인적인 소장 및 오프라인 감상 용도로만 사용하시길 권장합니다.
            </p>
          </div>
        </div>
      )}

      {/* ── FFmpeg LOADING OVERLAY FOR LOCAL FILES ────────────────────────────── */}
      {isLoading && activeTab !== 'url' && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{loadingMsg}</p>
        </div>
      )}

      {/* ── LOCAL FILE CONVERTER (VIDEO & AUDIO) ──────────────────────────────── */}
      {activeTab !== 'url' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Settings */}
          <div className="md:col-span-1 space-y-4">
            {/* Output Format */}
            <div className="p-5 bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-[#37352f] dark:text-white flex items-center gap-2">
                {activeTab === 'video' ? <Film className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                출력 형식 선택
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {(formats as readonly string[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setOutputFmt(fmt)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                      outputFmt === fmt
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#333]'
                    }`}
                  >
                    .{fmt}
                  </button>
                ))}
              </div>

              {activeTab === 'video' && outputFmt === 'gif' && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg">
                  ⚠️ GIF는 15fps, 480px 너비로 최적화됩니다. 파일 크기가 클 수 있습니다.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={convertAll}
                disabled={isLoading || !jobs.some((j) => j.status === 'waiting')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl text-sm transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  activeTab === 'video' ? <Film className="w-4 h-4" /> : <Music className="w-4 h-4" />
                )}
                {activeTab === 'video' ? '영상' : '오디오'} 변환 시작
              </button>

              {jobs.some((j) => j.status === 'done') && (
                <>
                  <button
                    onClick={downloadAll}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    완료 파일 모두 다운로드
                  </button>
                  <button
                    onClick={clearDone}
                    className="w-full py-2 text-xs text-[#787774] hover:text-[#37352f] dark:hover:text-white transition"
                  >
                    완료 항목 목록에서 제거
                  </button>
                </>
              )}
            </div>

            {/* Info box */}
            <div className="p-4 bg-[#faf9f6] dark:bg-[#191919] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-2xl text-[11px] text-[#787774] space-y-1.5">
              <p className="font-bold text-[#37352f] dark:text-white">⚙️ 처리 방식 안내</p>
              <p>• FFmpeg WebAssembly 엔진을 사용합니다.</p>
              <p>• 최초 실행 시 엔진 로딩에 최대 1분 소요됩니다.</p>
              <p>• 모든 처리는 브라우저 내에서만 이루어집니다.</p>
              <p>• 대용량 파일(500MB↑)은 시간이 걸릴 수 있습니다.</p>
            </div>
          </div>

          {/* Right: Drop Zone + File List */}
          <div className="md:col-span-2 space-y-4">
            {/* Drop Zone */}
            <div
              ref={activeTab === 'video' ? videoDrop : audioDrop}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative border-2 border-dashed border-[#d3d3d3] dark:border-[#444] rounded-2xl p-10 flex flex-col items-center gap-4 text-center bg-[#faf9f6] dark:bg-[#191919] hover:border-black dark:hover:border-white transition-colors cursor-pointer"
              onClick={() => document.getElementById(`media-file-input-${activeTab}`)?.click()}
            >
              <input
                id={`media-file-input-${activeTab}`}
                type="file"
                multiple
                accept={acceptType}
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#2a2a2a] border border-[#e9e9e7] dark:border-[#333] flex items-center justify-center shadow-sm">
                {activeTab === 'video' ? (
                  <Film className="w-8 h-8 text-[#787774]" />
                ) : (
                  <Music className="w-8 h-8 text-[#787774]" />
                )}
              </div>
              <div>
                <p className="font-bold text-[#37352f] dark:text-white">
                  {activeTab === 'video' ? '영상 파일을 드래그 & 드롭하거나 클릭하여 선택' : '오디오 파일을 드래그 & 드롭하거나 클릭하여 선택'}
                </p>
                <p className="text-xs text-[#787774] mt-1">
                  {activeTab === 'video'
                    ? 'MP4, WEBM, AVI, MOV, MKV, GIF 등'
                    : 'MP3, WAV, OGG, FLAC, AAC, M4A 등'}
                  {' '}• 여러 파일 동시 선택 가능
                </p>
              </div>
            </div>

            {/* File List */}
            {jobs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#787774] px-1">
                  <span>{jobs.length}개 파일</span>
                  <button onClick={() => setJobs([])} className="hover:text-red-500 transition">전체 삭제</button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3.5 bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {job.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                          {job.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                          {job.status === 'converting' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
                          {job.status === 'waiting' && <Play className="w-4 h-4 text-[#787774] shrink-0" />}
                          <span className="text-xs font-semibold text-[#37352f] dark:text-white truncate">{job.fileName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-[#787774]">{formatBytes(job.originalSize)}</span>
                          {job.status === 'done' && (
                            <button
                              onClick={() => downloadJob(job)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-lg transition"
                            >
                              <Download className="w-3 h-3" />
                              저장
                            </button>
                          )}
                          {job.status !== 'converting' && (
                            <button
                              onClick={() => removeJob(job.id)}
                              className="p-1 text-[#aaa] hover:text-red-500 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {job.status === 'converting' && (
                        <div className="space-y-1">
                          <div className="h-1.5 bg-[#efefed] dark:bg-[#333] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-blue-500 text-right">{job.progress}%</p>
                        </div>
                      )}

                      {job.status === 'error' && (
                        <p className="text-[11px] text-red-500 mt-1">{job.errorMsg}</p>
                      )}

                      {job.status === 'done' && (
                        <p className="text-[11px] text-emerald-600 mt-1">✓ {job.outputName} 변환 완료</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
