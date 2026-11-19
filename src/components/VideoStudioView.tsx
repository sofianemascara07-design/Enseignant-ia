import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  FileText,
  Film,
  Loader2,
  MessageCircle,
  Music,
  Play,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  Wand2,
} from 'lucide-react';
import { LevelType } from '../types';
import { buildApiHeaders, getApiBase, parseJsonSafe } from '../utils/authHeaders';

export interface LearnEnglishSongItem {
  id: string;
  title: string;
  level: LevelType;
  category: 'Chanson' | 'Vocabulaire' | 'Routine' | 'Histoire';
  topicFr: string;
  keywords: string[];
  url: string;
  emoji: string;
}

export interface VideoScene {
  sceneNumber: number;
  headlineEn: string;
  spokenLineEn: string;
  translationFr: string;
  pronunciationTip: string;
  emoji: string;
  accentHex: string;
  durationSec: number;
}

export interface EducationalVideoProject {
  title: string;
  subtitle: string;
  scenes: VideoScene[];
  vocabularyList: { english: string; french: string; phonetic: string }[];
  classroomActivityMarkdown: string;
}

interface VideoStudioViewProps {
  userEmail?: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLicensed: boolean;
  adminToken?: string | null;
  licenseCode: string | null;
  trialsUsed: number;
  maxTrials: number;
  onIncrementTrial: () => void;
  onOpenActivationModal: () => void;
  onRequestSignIn: () => void;
  onSendWorksheetToAtelier: (params: {
    title: string;
    level: LevelType;
    contentMarkdown: string;
  }) => void;
}

const DEFAULT_EXTRA_LINKS = [
  { label: 'Chansons (Songs)', url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs' },
  { label: 'Histoires animées', url: 'https://learnenglishkids.britishcouncil.org/listen-watch/short-stories' },
  { label: 'Vidéos Grammaire', url: 'https://learnenglishkids.britishcouncil.org/grammar-vocabulary/grammar-videos' },
  { label: 'Video Zone', url: 'https://learnenglishkids.britishcouncil.org/listen-watch/video-zone' },
];

const STARTER_PROJECT: EducationalVideoProject = {
  title: 'Hello & Classroom Greetings',
  subtitle: 'Séquence 1 · 1AM · Inspiré British Council LearnEnglish Kids',
  scenes: [
    {
      sceneNumber: 1,
      headlineEn: 'Welcome to English Class!',
      spokenLineEn: 'Hello, hello, hello! Good morning, pupils! How are you today?',
      translationFr: 'Bonjour, bonjour ! Bonjour les élèves ! Comment allez-vous aujourd’hui ?',
      pronunciationTip: 'Prononcez bien le /h/ doux dans "Hello" et "How".',
      emoji: '👋',
      accentHex: '#047857',
      durationSec: 7,
    },
    {
      sceneNumber: 2,
      headlineEn: 'Ask & Answer Politely',
      spokenLineEn: 'I am fine, thank you! What is your name? My name is Amine.',
      translationFr: 'Je vais bien, merci ! Quel est ton prénom ? Je m’appelle Amine.',
      pronunciationTip: 'Faites la liaison fluide : "What is" / "I am fine".',
      emoji: '🗣️',
      accentHex: '#2563EB',
      durationSec: 8,
    },
    {
      sceneNumber: 3,
      headlineEn: 'Sing the Greeting Rhythm',
      spokenLineEn: 'Clap your hands, one, two, three! Nice to meet you, sing with me!',
      translationFr: 'Frappez dans vos mains, un, deux, trois ! Enchanté de te rencontrer, chante avec moi !',
      pronunciationTip: 'Marquez le rythme sur "one, two, three" avec les élèves.',
      emoji: '🎵',
      accentHex: '#7C3AED',
      durationSec: 8,
    },
    {
      sceneNumber: 4,
      headlineEn: 'Check Your Schoolbag',
      spokenLineEn: 'Open your schoolbag: a pen, a book, a copybook! Ready to learn!',
      translationFr: 'Ouvrez votre cartable : un stylo, un livre, un cahier ! Prêts à apprendre !',
      pronunciationTip: 'Distinguez "book" (livre) et "copybook" (cahier).',
      emoji: '🎒',
      accentHex: '#D97706',
      durationSec: 8,
    },
    {
      sceneNumber: 5,
      headlineEn: 'Your Turn to Speak!',
      spokenLineEn: 'Turn to your friend and say: Hello! Nice to meet you!',
      translationFr: 'Tournez-vous vers votre camarade et dites : Bonjour ! Enchanté !',
      pronunciationTip: 'Activité en binôme : chaque élève se présente à l’oral.',
      emoji: '🌟',
      accentHex: '#0F766E',
      durationSec: 7,
    },
  ],
  vocabularyList: [
    { english: 'Hello / Good morning', french: 'Bonjour', phonetic: '/həˈləʊ/' },
    { english: 'How are you?', french: 'Comment vas-tu ?', phonetic: '/haʊ ɑː juː/' },
    { english: 'Nice to meet you', french: 'Enchanté(e)', phonetic: '/naɪs tə miːt juː/' },
    { english: 'Schoolbag', french: 'Cartable', phonetic: '/ˈskuːlbæɡ/' },
    { english: 'Clap your hands', french: 'Frappe dans tes mains', phonetic: '/klæp jɔː hændz/' },
    { english: 'Ready to learn', french: 'Prêt(e) à apprendre', phonetic: '/ˈredi tə lɜːn/' },
  ],
  classroomActivityMarkdown: `## Classroom Song Worksheet · 1AM (Greetings)\n\n**Warm-up:** Watch & listen to the song video.\n\n**Task 1 — Listen and tick (☑):**\n- ☐ Hello, how are you?\n- ☐ My name is ...\n- ☐ Open your schoolbag.\n\n**Task 2 — Sing & act in pairs:** Introduce yourself to your classmate.`,
};

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawSceneFrame(
  ctx: CanvasRenderingContext2D,
  project: EducationalVideoProject,
  sceneIndex: number,
  sceneProgress: number,
  creditEmail: string,
  level: LevelType
) {
  const w = 1280;
  const h = 720;
  const scene = project.scenes[sceneIndex] || project.scenes[0];
  const accent = scene?.accentHex || '#047857';

  // Crisp slate backdrop
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, h);

  // Subtle top accent band
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, 12);

  // Card frame
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(56, 48, w - 112, h - 126, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top Header Row: Brand + Scene counter + Level badge
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(92, 82, 220, 42, 10);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SCÈNE ${sceneIndex + 1} / ${project.scenes.length}`, 202, 110);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Madrassati CEM · ${level} Anglais · LearnEnglish Kids`, 334, 110);

  // Big visual emoji badge with subtle bounce
  const bounce = Math.sin(sceneProgress * Math.PI * 2) * 5;
  ctx.font = '96px "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(scene.emoji || '🎵', 200, 320 + bounce);

  // English Headline
  ctx.textAlign = 'left';
  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
  const headLines = wrapCanvasText(ctx, scene.headlineEn, 860);
  headLines.slice(0, 2).forEach((ln, idx) => {
    ctx.fillText(ln, 320, 220 + idx * 42);
  });

  // Main Spoken / Karaoké English Line
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
  const spokenLines = wrapCanvasText(ctx, `“${scene.spokenLineEn}”`, 860);
  spokenLines.slice(0, 3).forEach((ln, idx) => {
    ctx.fillText(ln, 320, 315 + idx * 54);
  });

  // French Translation Pill Box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.beginPath();
  ctx.roundRect(92, 495, w - 184, 86, 14);
  ctx.fill();
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '500 23px system-ui, -apple-system, sans-serif';
  const frLines = wrapCanvasText(ctx, `FR : ${scene.translationFr}`, w - 230);
  frLines.slice(0, 2).forEach((ln, idx) => {
    ctx.fillText(ln, 118, 530 + idx * 30);
  });

  // Pronunciation Tip
  ctx.fillStyle = '#FCD34D';
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(`💡 Conseil : ${scene.pronunciationTip}`, 94, 616);

  // Progress bar at bottom of card
  const overallProgress = (sceneIndex + sceneProgress) / Math.max(1, project.scenes.length);
  ctx.fillStyle = '#334155';
  ctx.fillRect(56, h - 56, w - 112, 8);
  ctx.fillStyle = accent;
  ctx.fillRect(56, h - 56, (w - 112) * Math.min(1, overallProgress), 8);

  // Credit Footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 17px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(project.title, 56, h - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Enseignants CEM · ${creditEmail}`, w - 56, h - 20);
  ctx.textAlign = 'left';
}

function base64ToBlob(b64: string, mimeType: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({
  userEmail,
  isAuthenticated,
  isAdmin,
  isLicensed,
  adminToken,
  licenseCode,
  trialsUsed,
  maxTrials,
  onIncrementTrial,
  onOpenActivationModal,
  onRequestSignIn,
  onSendWorksheetToAtelier,
}) => {
  const hasProOrAdmin = Boolean(isAdmin || isLicensed);
  const displayEmail = userEmail || 'sofianemascara07@gmail.com';

  // British Council Catalog
  const [songs, setSongs] = useState<LearnEnglishSongItem[]>([]);
  const [extraLinks, setExtraLinks] = useState<{ label: string; url: string }[]>(DEFAULT_EXTRA_LINKS);
  const [levelFilter, setLevelFilter] = useState<'ALL' | LevelType>('ALL');

  // Video Generator Form
  const [topic, setTopic] = useState('Hello, hello, hello — Classroom Greetings');
  const [selectedSongTitle, setSelectedSongTitle] = useState('Hello, hello, hello');
  const [level, setLevel] = useState<LevelType>('1AM');
  const [videoStyle, setVideoStyle] = useState<'song' | 'vocab' | 'dialogue' | 'grammar'>('song');
  const [voiceName, setVoiceName] = useState<'Kore' | 'Puck' | 'Zephyr'>('Kore');
  const [withAiVoice, setWithAiVoice] = useState(true);

  const [project, setProject] = useState<EducationalVideoProject>(STARTER_PROJECT);
  const [sceneAudioMap, setSceneAudioMap] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generatingVoiceIdx, setGeneratingVoiceIdx] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Canvas Player & WebM Export
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playbackStopRef = useRef<boolean>(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecordingWebm, setIsRecordingWebm] = useState(false);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = getApiBase();
    fetch(`${apiBase}/api/videos/learnenglish-catalog`)
      .then((r) => parseJsonSafe<{ songs?: LearnEnglishSongItem[]; extraLinks?: { label: string; url: string }[] }>(r))
      .then((d) => {
        if (Array.isArray(d.songs)) setSongs(d.songs);
        if (Array.isArray(d.extraLinks)) setExtraLinks(d.extraLinks);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSceneFrame(ctx, project, activeSceneIdx, 0.35, displayEmail, level);
  }, [project, activeSceneIdx, displayEmail, level]);

  const stopPlayback = () => {
    playbackStopRef.current = true;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      playbackStopRef.current = true;
      if (activeAudioRef.current) activeAudioRef.current.pause();
    };
  }, []);

  const handleGenerateVideoProject = async () => {
    if (!hasProOrAdmin && trialsUsed >= maxTrials) {
      onOpenActivationModal();
      return;
    }
    stopPlayback();
    setGenerating(true);
    setErrorMsg(null);
    setInfoMsg(null);
    setExportedVideoUrl(null);
    setSceneAudioMap({});

    try {
      const apiBase = getApiBase();
      const headers = await buildApiHeaders({ licenseCode, trialsUsed, adminToken });
      const res = await fetch(`${apiBase}/api/ai/generate-educational-video`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: topic.trim(),
          level,
          videoStyle,
          referenceTitle: selectedSongTitle,
        }),
      });
      const data = await parseJsonSafe<EducationalVideoProject & { error?: string; locked?: boolean }>(res);
      if (!res.ok) {
        if (res.status === 402 || data.locked) onOpenActivationModal();
        throw new Error(data.error || 'Impossible de générer la vidéo éducative.');
      }

      const cleanProject: EducationalVideoProject = {
        title: data.title || topic.trim(),
        subtitle: data.subtitle || `Vidéo Anglais CEM · ${level}`,
        scenes: Array.isArray(data.scenes) && data.scenes.length > 0 ? data.scenes : STARTER_PROJECT.scenes,
        vocabularyList: Array.isArray(data.vocabularyList) ? data.vocabularyList : [],
        classroomActivityMarkdown: data.classroomActivityMarkdown || '',
      };
      setProject(cleanProject);
      setActiveSceneIdx(0);
      if (!hasProOrAdmin) onIncrementTrial();

      if (withAiVoice && cleanProject.scenes.length > 0) {
        const nextAudio: Record<number, string> = {};
        for (let i = 0; i < cleanProject.scenes.length; i++) {
          setGeneratingVoiceIdx(i);
          try {
            const ttsRes = await fetch(`${apiBase}/api/ai/tts-english`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                text: cleanProject.scenes[i].spokenLineEn,
                voiceName,
                style:
                  videoStyle === 'song'
                    ? 'Melodic, rhythmic, cheerful British English teacher singing for school kids'
                    : 'Clear, encouraging British English middle school teacher',
              }),
            });
            if (ttsRes.ok) {
              const ttsData = await parseJsonSafe<{ audioBase64?: string; mimeType?: string }>(ttsRes);
              if (ttsData.audioBase64) {
                const blob = base64ToBlob(ttsData.audioBase64, ttsData.mimeType || 'audio/wav');
                nextAudio[i] = URL.createObjectURL(blob);
              }
            }
          } catch {
            // Continue smoothly if one scene TTS fails
          }
        }
        setSceneAudioMap(nextAudio);
        setGeneratingVoiceIdx(null);
      }
      setInfoMsg('Vidéo éducative prête ! Lisez l’aperçu ou téléchargez le fichier vidéo (.webm) pour votre classe.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la création vidéo.');
    } finally {
      setGenerating(false);
      setGeneratingVoiceIdx(null);
    }
  };

  const handleGenerateVoiceForAllScenes = async () => {
    if (!hasProOrAdmin && trialsUsed >= maxTrials) {
      onOpenActivationModal();
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    const apiBase = getApiBase();
    const headers = await buildApiHeaders({ licenseCode, trialsUsed, adminToken });
    const nextAudio: Record<number, string> = { ...sceneAudioMap };
    try {
      for (let i = 0; i < project.scenes.length; i++) {
        setGeneratingVoiceIdx(i);
        const ttsRes = await fetch(`${apiBase}/api/ai/tts-english`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: project.scenes[i].spokenLineEn,
            voiceName,
          }),
        });
        const ttsData = await parseJsonSafe<{ audioBase64?: string; mimeType?: string; error?: string }>(ttsRes);
        if (!ttsRes.ok) {
          throw new Error(ttsData.error || 'Synthèse vocale IA indisponible.');
        }
        if (ttsData.audioBase64) {
          const blob = base64ToBlob(ttsData.audioBase64, ttsData.mimeType || 'audio/wav');
          nextAudio[i] = URL.createObjectURL(blob);
        }
      }
      setSceneAudioMap(nextAudio);
      setInfoMsg('Voix anglaise IA générée pour toutes les scènes !');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur génération voix anglaise.');
    } finally {
      setGeneratingVoiceIdx(null);
    }
  };

  const runScenePlayback = async (recordWebm: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    stopPlayback();
    playbackStopRef.current = false;
    setIsPlaying(true);
    if (recordWebm) {
      setIsRecordingWebm(true);
      setExportedVideoUrl(null);
    }

    let recorder: MediaRecorder | null = null;
    let audioCtx: AudioContext | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;
    const recordedChunks: Blob[] = [];

    try {
      if (recordWebm && typeof MediaRecorder !== 'undefined') {
        const videoStream = canvas.captureStream(30);
        try {
          const AudioContextCtor =
            window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtx = new AudioContextCtor();
          audioDest = audioCtx.createMediaStreamDestination();
          const combined = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioDest.stream.getAudioTracks(),
          ]);
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : 'video/webm';
          recorder = new MediaRecorder(combined, { mimeType });
        } catch {
          recorder = new MediaRecorder(videoStream, { mimeType: 'video/webm' });
        }
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
        };
        recorder.start(250);
      }

      for (let i = 0; i < project.scenes.length; i++) {
        if (playbackStopRef.current) break;
        setActiveSceneIdx(i);
        const scene = project.scenes[i];
        const durationMs = Math.max(4500, Math.min(12000, (scene.durationSec || 7) * 1000));
        const audioUrl = sceneAudioMap[i];

        if (audioUrl) {
          if (recordWebm && audioCtx && audioDest) {
            try {
              const resp = await fetch(audioUrl);
              const arr = await resp.arrayBuffer();
              const decoded = await audioCtx.decodeAudioData(arr);
              const src = audioCtx.createBufferSource();
              src.buffer = decoded;
              src.connect(audioDest);
              src.connect(audioCtx.destination);
              src.start();
            } catch {
              // Ignore single scene decode error
            }
          } else {
            const audioEl = new Audio(audioUrl);
            activeAudioRef.current = audioEl;
            audioEl.play().catch(() => {});
          }
        } else if (!recordWebm && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(scene.spokenLineEn);
          utter.lang = 'en-GB';
          utter.rate = 0.92;
          window.speechSynthesis.speak(utter);
        }

        const start = performance.now();
        await new Promise<void>((resolve) => {
          const tick = () => {
            if (playbackStopRef.current) {
              resolve();
              return;
            }
            const elapsed = performance.now() - start;
            const progress = Math.min(1, elapsed / durationMs);
            drawSceneFrame(ctx, project, i, progress, displayEmail, level);
            if (progress >= 1) {
              resolve();
            } else {
              requestAnimationFrame(tick);
            }
          };
          requestAnimationFrame(tick);
        });
      }

      if (recorder && recorder.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          recorder!.onstop = () => resolve();
          recorder!.stop();
        });
        const finalBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(finalBlob);
        setExportedVideoUrl(url);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'madrassati-video'}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setInfoMsg('Vidéo éducative téléchargée au format .webm avec succès !');
      }
    } finally {
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
      setIsPlaying(false);
      setIsRecordingWebm(false);
    }
  };

  const filteredSongs = songs.filter((s) => levelFilter === 'ALL' || s.level === levelFilter);

  const whatsappVideoShareHref = `https://wa.me/?text=${encodeURIComponent(
    `Salam chers collègues d’Anglais CEM,\nJe partage avec vous cette ressource vidéo éducative (${level}) :\n📌 ${project.title}\n🔗 British Council Songs : https://learnenglishkids.britishcouncil.org/listen-watch/songs\n\nPréparé via Madrassati CEM (${displayEmail}).`
  )}`;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top British Council LearnEnglish Kids Portal Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Music className="w-3.5 h-3.5" />
              <span>British Council · LearnEnglish Kids</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Email actif : {displayEmail}</span>
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Studio Vidéos Éducatives Anglais (1AM–4AM)
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl">
            Accédez aux chansons et vidéos du British Council LearnEnglish Kids et créez vos propres vidéos éducatives animées (avec voix anglaise IA + traduction FR + fiche imprimable) pour les enseignants d’anglais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isAuthenticated && (
            <button
              type="button"
              onClick={onRequestSignIn}
              className="h-10 px-4 border border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold rounded-lg"
            >
              Connecter Gmail
            </button>
          )}
          <a
            href="https://learnenglishkids.britishcouncil.org/listen-watch/songs"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 whitespace-nowrap"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ouvrir LearnEnglish Kids (Songs)</span>
          </a>
        </div>
      </div>

      {/* Quick Links Strip */}
      <div className="flex flex-wrap items-center gap-2">
        {extraLinks.map((lnk) => (
          <a
            key={lnk.url}
            href={lnk.url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{lnk.label}</span>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: British Council Catalog + Video Creator Form */}
        <aside className="lg:col-span-5 space-y-5">
          {/* AI Video Creator Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Film className="w-4 h-4 text-emerald-700" />
                <span>Créer une vidéo éducative IA</span>
              </h2>
              <span className="text-[11px] font-semibold text-emerald-700">1280×720 HD · .webm</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Thème, chanson ou titre de leçon (Anglais CEM)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Daily routines, Brush bus, Feelings..."
                className="w-full h-10 px-3 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Niveau CEM</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as LevelType)}
                  className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="1AM">1AM</option>
                  <option value="2AM">2AM</option>
                  <option value="3AM">3AM</option>
                  <option value="4AM">4AM</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Format vidéo</label>
                <select
                  value={videoStyle}
                  onChange={(e) => setVideoStyle(e.target.value as 'song' | 'vocab' | 'dialogue' | 'grammar')}
                  className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="song">Chanson &amp; Karaoké</option>
                  <option value="vocab">Vocabulaire illustré</option>
                  <option value="dialogue">Dialogue de classe</option>
                  <option value="grammar">Grammaire PIASP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Voix anglaise</label>
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value as 'Kore' | 'Puck' | 'Zephyr')}
                  className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Kore">Kore (Féminine claire)</option>
                  <option value="Puck">Puck (Masculine dynamique)</option>
                  <option value="Zephyr">Zephyr (Douce / narration)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 pt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withAiVoice}
                  onChange={(e) => setWithAiVoice(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span>Générer voix audio IA</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleGenerateVideoProject}
              disabled={generating || !topic.trim()}
              className="w-full h-10 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>
                {generatingVoiceIdx !== null
                  ? `Synthèse voix scène ${generatingVoiceIdx + 1}/${project.scenes.length}...`
                  : generating
                    ? 'Création du scénario vidéo...'
                    : 'Générer la vidéo éducative complète'}
              </span>
            </button>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}
            {infoMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5">
                <Check className="w-4 h-4 shrink-0" />
                <span>{infoMsg}</span>
              </div>
            )}
          </div>

          {/* Curated British Council Songs Picker */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Chansons British Council ({filteredSongs.length})
              </h2>
              <div className="flex items-center gap-1">
                {(['ALL', '1AM', '2AM', '3AM', '4AM'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold ${
                      levelFilter === lvl
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl === 'ALL' ? 'Tous' : lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {filteredSongs.map((song) => (
                <div key={song.id} className="p-3 space-y-2 hover:bg-slate-50/70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{song.emoji}</span>
                        <span className="truncate">{song.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{song.topicFr}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold font-mono-tabular shrink-0">
                      {song.level}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <a
                      href={song.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-2.5 border border-slate-200 hover:bg-white text-slate-700 text-[11px] font-semibold rounded-md inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>British Council</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSongTitle(song.title);
                        setTopic(`${song.title} — ${song.keywords.join(', ')}`);
                        setLevel(song.level);
                        setVideoStyle(song.category === 'Histoire' ? 'dialogue' : 'song');
                      }}
                      className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-md inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Charger dans Studio Vidéo</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Live 16:9 Classroom Canvas Video Studio & WebM Exporter */}
        <section className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">{project.title}</h2>
                <p className="text-xs text-slate-500">{project.subtitle}</p>
              </div>
              <span className="text-xs font-mono-tabular px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold">
                {Object.keys(sceneAudioMap).length}/{project.scenes.length} pistes audio IA
              </span>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="w-full h-auto block aspect-video"
              />
            </div>

            {/* Scene Selector Strip */}
            <div className="flex flex-wrap items-center gap-1.5">
              {project.scenes.map((sc, idx) => (
                <button
                  key={sc.sceneNumber}
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setActiveSceneIdx(idx);
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border ${
                    activeSceneIdx === idx
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{sc.emoji}</span>
                  <span>Scène {idx + 1}</span>
                </button>
              ))}
            </div>

            {/* Playback & Export Action Strip */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isPlaying ? (
                <button
                  type="button"
                  onClick={stopPlayback}
                  className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Arrêter</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => runScenePlayback(false)}
                  className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Lire en plein écran</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleGenerateVoiceForAllScenes}
                disabled={generatingVoiceIdx !== null}
                className="h-10 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
              >
                {generatingVoiceIdx !== null ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span>Générer voix IA (.wav)</span>
              </button>

              <button
                type="button"
                onClick={() => runScenePlayback(true)}
                disabled={isRecordingWebm || isPlaying}
                className="h-10 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2"
              >
                {isRecordingWebm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isRecordingWebm ? 'Enregistrement vidéo...' : 'Télécharger Vidéo (.webm)'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSendWorksheetToAtelier({
                    title: `${project.title} — Fiche Vidéo`,
                    level,
                    contentMarkdown:
                      project.classroomActivityMarkdown ||
                      `## ${project.title}\n\n${project.scenes
                        .map((s) => `### Scene ${s.sceneNumber}: ${s.headlineEn}\n> ${s.spokenLineEn}\n*${s.translationFr}*`)
                        .join('\n\n')}`,
                  })
                }
                className="h-10 px-3.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Fiche d’activité (Atelier)</span>
              </button>

              <a
                href={whatsappVideoShareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-3.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white text-white" />
                <span>Partager WhatsApp</span>
              </a>
            </div>

            {exportedVideoUrl && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
                <span>Fichier vidéo prêt à projeter en classe ou envoyer aux enseignants :</span>
                <a
                  href={exportedVideoUrl}
                  download={`${project.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'madrassati-video'}.webm`}
                  className="font-bold underline"
                >
                  Retélécharger la vidéo (.webm)
                </a>
              </div>
            )}
          </div>

          {/* Editable Scenes & Vocabulary Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Scènes &amp; Paroles éditables ({project.scenes.length})
            </h3>
            <div className="space-y-3">
              {project.scenes.map((sc, idx) => (
                <div
                  key={sc.sceneNumber}
                  className="p-3.5 rounded-xl border border-slate-200 space-y-2 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {sc.emoji} Scène {idx + 1} · {sc.headlineEn}
                    </span>
                    {sceneAudioMap[idx] && (
                      <audio controls src={sceneAudioMap[idx]} className="h-7 max-w-[210px]" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={sc.spokenLineEn}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProject((prev) => ({
                        ...prev,
                        scenes: prev.scenes.map((item, sIdx) =>
                          sIdx === idx ? { ...item, spokenLineEn: val } : item
                        ),
                      }));
                    }}
                    className="w-full h-9 px-2.5 text-xs font-medium border border-slate-200 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={sc.translationFr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProject((prev) => ({
                        ...prev,
                        scenes: prev.scenes.map((item, sIdx) =>
                          sIdx === idx ? { ...item, translationFr: val } : item
                        ),
                      }));
                    }}
                    className="w-full h-8 px-2.5 text-xs text-slate-600 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              ))}
            </div>

            {project.vocabularyList.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Vocabulaire clé de la vidéo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {project.vocabularyList.map((v, idx) => (
                    <div
                      key={`${v.english}-${idx}`}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{v.english}</span>
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span className="text-slate-600">{v.french}</span>
                      </div>
                      <span className="font-mono-tabular text-[11px] text-emerald-700">{v.phonetic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
