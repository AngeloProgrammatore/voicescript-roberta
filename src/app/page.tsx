"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Mic,
  Square,
  ChevronDown,
  Check,
  Copy,
  ArrowLeft,
  Loader2,
  RotateCcw,
} from "lucide-react";

/* ───────── types ───────── */
type Step = 1 | 2 | 3;
type Duration = "2" | "10" | "";
type Language = "it" | "en" | "pt" | "";

interface SelectProps {
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

/* ───────── custom select ───────── */
function Select({ label, value, placeholder, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="flex-1 min-w-[200px]" ref={ref}>
      <label className="block text-sm font-medium mb-2 tracking-wide" style={{ fontFamily: "var(--font-body)" }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-left transition-all hover:border-[var(--color-teal)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/30"
      >
        <span className={selected ? "text-[var(--color-dark)]" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-auto min-w-[200px] bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-[var(--color-teal-light)] transition-colors flex items-center justify-between"
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-4 h-4 text-[var(--color-teal)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── stepper ───────── */
function Stepper({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-12">
      {[1, 2, 3].map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              s <= current ? "bg-[var(--color-teal)] scale-110" : "bg-gray-300"
            }`}
          />
          {i < 2 && (
            <div
              className={`w-16 h-[2px] transition-all duration-300 ${
                s < current ? "bg-[var(--color-teal)]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ───────── format time ───────── */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ───────── MAIN PAGE ───────── */
export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [duration, setDuration] = useState<Duration>("");
  const [language, setLanguage] = useState<Language>("");

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Processing
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [copied, setCopied] = useState(false);

  /* ── Step 1 → 2 ── */
  const handleContinue = () => {
    if (!duration) {
      toast.error("Seleziona la durata del video");
      return;
    }
    if (!language) {
      toast.error("Seleziona la lingua");
      return;
    }
    setStep(2);
  };

  /* ── Recording ── */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try to use webm, fallback to whatever is available
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(1000); // collect data every second for reliability
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      toast.error("Impossibile accedere al microfono. Controlla i permessi del browser.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /* ── Process audio: transcribe → generate ── */
  const processAudio = useCallback(async () => {
    if (!audioBlob) return;

    // Step 1: Transcribe
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json();
        throw new Error(err.error || "Errore nella trascrizione");
      }

      const { text } = await transcribeRes.json();
      setTranscribedText(text);
      setIsTranscribing(false);

      // Step 2: Generate script
      setIsGenerating(true);
      const generateRes = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, duration, language }),
      });

      if (!generateRes.ok) {
        const err = await generateRes.json();
        throw new Error(err.error || "Errore nella generazione");
      }

      const { script } = await generateRes.json();
      setGeneratedScript(script);
      setIsGenerating(false);
      setStep(3);
    } catch (error: unknown) {
      setIsTranscribing(false);
      setIsGenerating(false);
      const msg = error instanceof Error ? error.message : "Errore durante l'elaborazione";
      toast.error(msg);
    }
  }, [audioBlob, duration, language]);

  /* ── Copy ── */
  const copyScript = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    toast.success("Script copiato negli appunti!");
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Reset ── */
  const resetAll = () => {
    setStep(1);
    setDuration("");
    setLanguage("");
    setAudioBlob(null);
    setRecordingTime(0);
    setTranscribedText("");
    setGeneratedScript("");
    setIsRecording(false);
    setIsTranscribing(false);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <header className="w-full py-6 px-6 flex items-center justify-center border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-teal)" }}
          >
            Dott.ssa Roberta Costanzo
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1" style={{ fontFamily: "var(--font-body)" }}>
            Dalla tua voce, uno script video professionale
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-2xl">
          <Stepper current={step} />

          {/* STEP 1: Configuration */}
          {step === 1 && (
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-full bg-[var(--color-teal)] text-white text-xs flex items-center justify-center font-medium">
                  1
                </span>
                <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[var(--color-muted)]">
                  Configurazione
                </span>
              </div>

              <h2
                className="text-3xl md:text-4xl font-medium mt-4 mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Prepara il tuo script
              </h2>
              <p className="text-[var(--color-muted)] mb-8">
                Scegli la durata del video e la lingua dello script
              </p>

              <div className="flex flex-col sm:flex-row gap-4 relative">
                <Select
                  label="Durata"
                  value={duration}
                  placeholder="Scegli durata"
                  options={[
                    { value: "2", label: "2 min — Instagram" },
                    { value: "10", label: "10 min — YouTube" },
                  ]}
                  onChange={(v) => setDuration(v as Duration)}
                />
                <Select
                  label="Lingua"
                  value={language}
                  placeholder="Scegli lingua"
                  options={[
                    { value: "it", label: "Italiano" },
                    { value: "en", label: "English" },
                    { value: "pt", label: "Portugues Brasileiro" },
                  ]}
                  onChange={(v) => setLanguage(v as Language)}
                />
              </div>

              <button
                onClick={handleContinue}
                className="mt-8 px-8 py-3 rounded-full text-white font-medium transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ background: "var(--color-teal)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-teal-dark)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-teal)")}
              >
                Continua
              </button>
            </div>
          )}

          {/* STEP 2: Recording */}
          {step === 2 && !isTranscribing && !isGenerating && (
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-full bg-[var(--color-teal)] text-white text-xs flex items-center justify-center font-medium">
                  2
                </span>
                <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[var(--color-muted)]">
                  Registrazione
                </span>
              </div>

              <h2
                className="text-3xl md:text-4xl font-medium mt-4 mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Registra il tuo messaggio
              </h2>
              <p className="text-[var(--color-muted)] mb-8">
                Parla liberamente — qualsiasi durata va bene, lo adatteremo noi
              </p>

              {/* Recording area */}
              <div className="flex flex-col items-center gap-6 py-8">
                {/* Timer */}
                <div
                  className="text-5xl font-light tracking-wider tabular-nums"
                  style={{ fontFamily: "var(--font-heading)", color: isRecording ? "var(--color-teal)" : "var(--color-dark)" }}
                >
                  {formatTime(recordingTime)}
                </div>

                {/* Record / Stop button */}
                <div className="relative">
                  {isRecording && (
                    <div
                      className="absolute inset-0 rounded-full animate-pulse-ring"
                      style={{ background: "var(--color-teal)", opacity: 0.3 }}
                    />
                  )}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className="relative w-20 h-20 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
                    style={{
                      background: isRecording ? "#ef4444" : "var(--color-teal)",
                    }}
                  >
                    {isRecording ? (
                      <Square className="w-7 h-7" fill="white" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </button>
                </div>

                <p className="text-sm text-[var(--color-muted)]">
                  {isRecording
                    ? "Registrazione in corso... clicca per fermare"
                    : audioBlob
                    ? `Registrazione completata (${formatTime(recordingTime)})`
                    : "Clicca per iniziare la registrazione"}
                </p>

                {/* Action buttons after recording */}
                {audioBlob && !isRecording && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        setAudioBlob(null);
                        setRecordingTime(0);
                      }}
                      className="px-6 py-2.5 rounded-full border border-gray-300 text-[var(--color-dark)] font-medium transition-all hover:border-[var(--color-teal)] hover:text-[var(--color-teal)]"
                    >
                      <span className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Riregistra
                      </span>
                    </button>
                    <button
                      onClick={processAudio}
                      className="px-8 py-2.5 rounded-full text-white font-medium transition-all hover:shadow-lg active:scale-[0.98]"
                      style={{ background: "var(--color-teal)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-teal-dark)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-teal)")}
                    >
                      Genera Script
                    </button>
                  </div>
                )}
              </div>

              {/* Back button */}
              <button
                onClick={() => setStep(1)}
                className="mt-4 flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-teal)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Torna alla configurazione
              </button>
            </div>
          )}

          {/* STEP 2b: Processing */}
          {(isTranscribing || isGenerating) && (
            <div className="animate-fade-in-up flex flex-col items-center py-16 gap-6">
              <Loader2 className="w-12 h-12 animate-spin" style={{ color: "var(--color-teal)" }} />
              <div className="text-center">
                <h3
                  className="text-2xl font-medium mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {isTranscribing ? "Trascrizione in corso..." : "Generazione script..."}
                </h3>
                <p className="text-[var(--color-muted)] text-sm">
                  {isTranscribing
                    ? "Stiamo convertendo la tua voce in testo con Whisper"
                    : "Claude sta creando il tuo script video"}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Result */}
          {step === 3 && (
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-full bg-[var(--color-teal)] text-white text-xs flex items-center justify-center font-medium">
                  3
                </span>
                <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[var(--color-muted)]">
                  Il tuo Script
                </span>
              </div>

              <h2
                className="text-3xl md:text-4xl font-medium mt-4 mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Script pronto!
              </h2>
              <p className="text-[var(--color-muted)] mb-6">
                Ecco il tuo script video da {duration} minuti in{" "}
                {language === "it" ? "italiano" : language === "en" ? "inglese" : "portoghese"}
              </p>

              {/* Transcribed text (collapsible) */}
              {transcribedText && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-[var(--color-muted)] hover:text-[var(--color-teal)] transition-colors">
                    Mostra testo trascritto originale
                  </summary>
                  <div className="mt-2 p-4 bg-white rounded-xl border border-gray-100 text-sm text-gray-600 leading-relaxed max-h-40 overflow-y-auto">
                    {transcribedText}
                  </div>
                </details>
              )}

              {/* Generated script */}
              <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="prose prose-gray max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-[var(--color-dark)]" style={{ fontFamily: "var(--font-body)" }}>
                    {generatedScript}
                  </div>
                </div>

                <button
                  onClick={copyScript}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--color-teal-light)] transition-colors group"
                  title="Copia script"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-[var(--color-teal)]" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-teal)]" />
                  )}
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={resetAll}
                  className="px-6 py-2.5 rounded-full border border-gray-300 text-[var(--color-dark)] font-medium transition-all hover:border-[var(--color-teal)] hover:text-[var(--color-teal)]"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Nuovo script
                  </span>
                </button>
                <button
                  onClick={copyScript}
                  className="px-8 py-2.5 rounded-full text-white font-medium transition-all hover:shadow-lg active:scale-[0.98]"
                  style={{ background: "var(--color-teal)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-teal-dark)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-teal)")}
                >
                  <span className="flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    {copied ? "Copiato!" : "Copia script"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-gray-100">
        <p className="text-xs text-[var(--color-muted)]" style={{ fontFamily: "var(--font-body)" }}>
          Dott.ssa Roberta Costanzo — Script video con intelligenza artificiale
        </p>
      </footer>
    </div>
  );
}
