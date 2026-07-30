import { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Square, Clock, Trash2 } from 'lucide-react';

export interface TimestampEntry {
  start: number;
  end: number;
}

interface AudioTimestampEditorProps {
  audioSrc: string | null;
  text: string;
  onTextChange: (newText: string) => void;
  timestamps: TimestampEntry[];
  onTimestampsChange: (newTimestamps: TimestampEntry[]) => void;
  editorFontSize?: number;
  editorFontFamily?: string;
  isRTL?: boolean;
}

export default function AudioTimestampEditor({
  audioSrc,
  text,
  onTextChange,
  timestamps,
  onTimestampsChange,
  editorFontSize = 14,
  editorFontFamily = 'default',
  isRTL = false
}: AudioTimestampEditorProps) {
  const activeFontStyle = {
    fontSize: `${editorFontSize}px`,
    ...(editorFontFamily !== 'default' ? { fontFamily: editorFontFamily } : {})
  };
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtTimeRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Extract sentences dynamically based on multi-language sentence terminators
  const sentences = useMemo(() => {
    if (!text.trim()) return [];
    
    // Split by newlines first
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const result: string[] = [];

    for (const line of lines) {
      // Split each line by sentence terminators (.!?。！？؟؛) while keeping delimiters
      const sentenceRegex = /[^.!?。！？؟؛]+[.!?。！？؟؛]+/g;
      const matches = line.match(sentenceRegex);

      if (matches && matches.length > 0) {
        let reconstructedLength = 0;
        for (const match of matches) {
          result.push(match.trim());
          reconstructedLength += match.length;
        }
        // Push remaining trailing text if any
        if (reconstructedLength < line.length) {
          const remainder = line.slice(reconstructedLength).trim();
          if (remainder) result.push(remainder);
        }
      } else {
        result.push(line.trim());
      }
    }
    return result;
  }, [text]);

  const sourceOfTruthMapRef = useRef<Map<string, TimestampEntry>>(new Map());

  // Helper for sentence text similarity (Jaccard + substring overlap)
  const getSimilarity = (a: string, b: string): number => {
    const cleanA = a.trim().toLowerCase();
    const cleanB = b.trim().toLowerCase();
    if (cleanA === cleanB) return 1.0;
    if (!cleanA || !cleanB) return 0;
    
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
      return Math.min(cleanA.length, cleanB.length) / Math.max(cleanA.length, cleanB.length);
    }

    const wordsA = cleanA.split(/\s+/);
    const wordsB = cleanB.split(/\s+/);
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    let intersection = 0;
    for (const w of setA) {
      if (setB.has(w)) intersection++;
    }
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  };

  const isInitialSeededRef = useRef(false);

  // Seed Source of Truth map ONCE from initial loaded API timestamps prop
  useEffect(() => {
    if (!isInitialSeededRef.current && sentences.length > 0 && timestamps.length === sentences.length && timestamps.length > 0) {
      sentences.forEach((sent, idx) => {
        const key = sent.trim();
        if (timestamps[idx]) {
          sourceOfTruthMapRef.current.set(key, timestamps[idx]);
        }
      });
      isInitialSeededRef.current = true;
    }
  }, [sentences, timestamps]);

  // Render timestamp editor by resolving current sentences against Source of Truth baseline
  // Pure declarative matching without mutating sourceOfTruthMapRef during keystroke alignment
  useEffect(() => {
    if (sentences.length === 0) return;

    const sourceMap = sourceOfTruthMapRef.current;
    let needsUpdate = timestamps.length !== sentences.length;
    const updated: TimestampEntry[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sent = sentences[i].trim();
      
      // 1. Strict Exact Match against Source of Truth baseline
      if (sourceMap.has(sent)) {
        const cached = sourceMap.get(sent)!;
        updated.push(cached);
        if (!timestamps[i] || timestamps[i].start !== cached.start || timestamps[i].end !== cached.end) {
          needsUpdate = true;
        }
        continue;
      }

      // 2. Action: ADD (Brand new sentence inserted)
      // Generate temporary boundary for UI without polluting or corrupting sourceMap
      const prevEnd = i > 0 ? (updated[i - 1]?.end || 0) : 0;
      let newEnd = parseFloat((prevEnd + 2.0).toFixed(2));
      if (duration > 0 && newEnd > duration) {
        newEnd = parseFloat(duration.toFixed(2));
      }

      const newTs = {
        start: prevEnd,
        end: newEnd
      };
      updated.push(newTs);
      needsUpdate = true;
    }

    if (needsUpdate) {
      onTimestampsChange(updated);
    }
  }, [sentences, timestamps, duration, onTimestampsChange]);

  const handlePlayPause = () => {
    if (!audioRef.current || !audioSrc) return;
    stopAtTimeRef.current = null;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => console.error("Audio playback error:", e));
    }
  };

  const handleStop = () => {
    stopAtTimeRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleTimeSkip = (sec: number) => {
    stopAtTimeRef.current = null;
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + sec);
    }
  };

  const handlePlaySentence = (startSec: number, endSec: number) => {
    if (audioRef.current) {
      stopAtTimeRef.current = endSec > startSec ? endSec : null;
      audioRef.current.currentTime = startSec;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => console.error("Sentence playback error:", e));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    if (stopAtTimeRef.current !== null && time >= stopAtTimeRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopAtTimeRef.current = null;
    }
  };

  const handleSetStartTime = (index: number) => {
    if (!audioRef.current) return;
    const now = parseFloat(audioRef.current.currentTime.toFixed(2));
    const next = [...timestamps];
    if (!next[index]) next[index] = { start: 0, end: 0 };
    next[index] = { ...next[index], start: now };
    if (sentences[index]) sourceOfTruthMapRef.current.set(sentences[index].trim(), next[index]);

    // AUTO-LINK: Set End of previous sentence (index - 1) to match boundary
    if (index > 0 && sentences[index - 1]) {
      if (!next[index - 1]) next[index - 1] = { start: 0, end: 0 };
      next[index - 1] = { ...next[index - 1], end: Math.min(next[index - 1].start, now) };
      sourceOfTruthMapRef.current.set(sentences[index - 1].trim(), next[index - 1]);
    }

    onTimestampsChange(next);
  };

  const handleSetEndTime = (index: number) => {
    if (!audioRef.current) return;
    const now = parseFloat(audioRef.current.currentTime.toFixed(2));
    const next = [...timestamps];
    if (!next[index]) next[index] = { start: 0, end: 0 };
    next[index] = { ...next[index], end: now };
    if (sentences[index]) sourceOfTruthMapRef.current.set(sentences[index].trim(), next[index]);

    // AUTO-LINK: Set Start of next sentence (index + 1) to match boundary
    if (index + 1 < sentences.length) {
      if (!next[index + 1]) next[index + 1] = { start: 0, end: 0 };
      const nextEnd = Math.max(next[index + 1].end, now);
      next[index + 1] = { ...next[index + 1], start: now, end: nextEnd };
      if (sentences[index + 1]) sourceOfTruthMapRef.current.set(sentences[index + 1].trim(), next[index + 1]);
    }

    onTimestampsChange(next);
  };

  const handleStartInputChange = (index: number, val: string) => {
    const num = parseFloat(val);
    const next = [...timestamps];
    if (!next[index]) next[index] = { start: 0, end: 0 };
    const valNum = isNaN(num) ? 0 : num;
    next[index] = { ...next[index], start: valNum };
    if (sentences[index]) sourceOfTruthMapRef.current.set(sentences[index].trim(), next[index]);

    // AUTO-LINK: Set End of previous sentence (index - 1)
    if (index > 0 && sentences[index - 1]) {
      if (!next[index - 1]) next[index - 1] = { start: 0, end: 0 };
      next[index - 1] = { ...next[index - 1], end: valNum };
      sourceOfTruthMapRef.current.set(sentences[index - 1].trim(), next[index - 1]);
    }

    onTimestampsChange(next);
  };

  const handleEndInputChange = (index: number, val: string) => {
    const num = parseFloat(val);
    const next = [...timestamps];
    if (!next[index]) next[index] = { start: 0, end: 0 };
    const valNum = isNaN(num) ? 0 : num;
    next[index] = { ...next[index], end: valNum };
    if (sentences[index]) sourceOfTruthMapRef.current.set(sentences[index].trim(), next[index]);

    // AUTO-LINK: Set Start of next sentence (index + 1)
    if (index + 1 < sentences.length) {
      if (!next[index + 1]) next[index + 1] = { start: 0, end: 0 };
      const nextEnd = Math.max(next[index + 1].end, valNum);
      next[index + 1] = { ...next[index + 1], start: valNum, end: nextEnd };
      if (sentences[index + 1]) sourceOfTruthMapRef.current.set(sentences[index + 1].trim(), next[index + 1]);
    }

    onTimestampsChange(next);
  };

  const handleDeleteRow = (index: number) => {
    const sentToDelete = sentences[index]?.trim();
    if (sentToDelete) {
      sourceOfTruthMapRef.current.delete(sentToDelete);
    }

    const nextSentences = sentences.filter((_, i) => i !== index);
    const nextText = nextSentences.join('\n');
    
    // Update timestamps array with gap bridging
    const nextTimestamps = [...timestamps];
    if (index > 0 && index < nextTimestamps.length) {
      // Extend previous sentence to cover deleted sentence's end time
      nextTimestamps[index - 1] = {
        ...nextTimestamps[index - 1],
        end: nextTimestamps[index]?.end || nextTimestamps[index - 1].end
      };
      if (nextSentences[index - 1]) {
        sourceOfTruthMapRef.current.set(nextSentences[index - 1].trim(), nextTimestamps[index - 1]);
      }
    } else if (index === 0 && nextTimestamps.length > 1) {
      // Stretch new first sentence to 0.00s
      nextTimestamps[1] = { ...nextTimestamps[1], start: 0.0 };
      if (nextSentences[0]) {
        sourceOfTruthMapRef.current.set(nextSentences[0].trim(), nextTimestamps[1]);
      }
    }

    nextTimestamps.splice(index, 1);

    onTextChange(nextText);
    onTimestampsChange(nextTimestamps);
  };

  const handleSentenceTextChange = (index: number, newSentenceText: string) => {
    if (newSentenceText.trim() === '') {
      handleDeleteRow(index);
      return;
    }
    const nextSentences = [...sentences];
    nextSentences[index] = newSentenceText;
    onTextChange(nextSentences.join('\n'));
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* CUSTOM AUDIO PLAYER (Derived from Toolbar.tsx) */}
      <div className="bg-[#f0f3f6] rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col gap-3">
        <audio
          ref={audioRef}
          src={audioSrc || '#'}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onEnded={handleStop}
          className="hidden"
        />

        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Play & Stop Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              disabled={!audioSrc}
              className={`w-11 h-11 rounded-full flex items-center justify-center shadow transition border border-white/40 cursor-pointer ${
                audioSrc ? 'bg-[#3890fc] hover:bg-blue-600 text-white' : 'bg-gray-300 text-gray-400 cursor-not-allowed'
              }`}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {isPlaying && (
              <button
                onClick={handleStop}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition cursor-pointer"
                title="Stop"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            )}
          </div>

          {/* Jump -5s / +5s */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleTimeSkip(-5)}
              disabled={!audioSrc}
              className="text-[#3890fc] bg-white border border-blue-200 shadow-sm text-xs font-extrabold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition cursor-pointer"
            >
              &lt; 5s
            </button>
            <button
              onClick={() => handleTimeSkip(5)}
              disabled={!audioSrc}
              className="text-[#3890fc] bg-white border border-blue-200 shadow-sm text-xs font-extrabold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition cursor-pointer"
            >
              5s &gt;
            </button>
          </div>

          {/* Speed Controls & Time Counter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm gap-1">
              <span className="text-xs font-bold text-gray-500 mr-1">Speed:</span>
              {[0.5, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`text-xs font-bold px-1.5 py-0.5 rounded transition ${
                    playbackRate === rate ? 'bg-[#3890fc] text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="text-xs font-mono font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg shadow-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Audio Scrubber Bar */}
        <div className="relative w-full h-2 bg-gray-300 rounded-full overflow-hidden cursor-pointer">
          <div
            className="h-full bg-[#3890fc] transition-all duration-75"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={(e) => {
              stopAtTimeRef.current = null;
              const val = parseFloat(e.target.value);
              if (audioRef.current) {
                audioRef.current.currentTime = val;
                setCurrentTime(val);
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* 3-COLUMN SENTENCE TIMESTAMP EDITOR TABLE */}
      <div className="flex flex-col grow overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 grid grid-cols-12 gap-3 text-xs font-black text-gray-600 uppercase tracking-wider">
          <div className="col-span-3 lg:col-span-2 text-center">Start Time (s)</div>
          <div className="col-span-3 lg:col-span-2 text-center">End Time (s)</div>
          <div className="col-span-6 lg:col-span-8">Sentence Text &amp; Actions</div>
        </div>

        <div className="overflow-y-auto max-h-[420px] divide-y divide-gray-100 p-2">
          {sentences.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-bold text-sm">
              No sentences found. Add text in the editor to sync timestamps.
            </div>
          ) : (
            sentences.map((sentText, idx) => {
              const ts = timestamps[idx] || { start: 0, end: 0 };
              return (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center p-2.5 hover:bg-blue-50/40 rounded-lg transition">
                  {/* Start Time Input + Set Current */}
                  <div className="col-span-3 lg:col-span-2 flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ts.start !== undefined ? ts.start : 0}
                      onChange={(e) => handleStartInputChange(idx, e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono text-center outline-none focus:border-[#3890fc] bg-white font-semibold"
                    />
                    <button
                      onClick={() => handleSetStartTime(idx)}
                      className="p-1 text-gray-500 hover:text-[#3890fc] hover:bg-blue-100 rounded transition"
                      title="Set Start to current audio playback time"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* End Time Input + Set Current */}
                  <div className="col-span-3 lg:col-span-2 flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ts.end !== undefined ? ts.end : 0}
                      onChange={(e) => handleEndInputChange(idx, e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono text-center outline-none focus:border-[#3890fc] bg-white font-semibold"
                    />
                    <button
                      onClick={() => handleSetEndTime(idx)}
                      className="p-1 text-gray-500 hover:text-[#3890fc] hover:bg-blue-100 rounded transition"
                      title="Set End to current audio playback time"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Play Sentence & Text Input */}
                  <div className="col-span-6 lg:col-span-8 flex items-center gap-2">
                    <button
                      onClick={() => handlePlaySentence(ts.start, ts.end)}
                      className="w-7 h-7 shrink-0 rounded-full bg-blue-50 text-[#3890fc] hover:bg-[#3890fc] hover:text-white flex items-center justify-center transition border border-blue-200"
                      title="Play Sentence (Start to End)"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>

                    <textarea
                      rows={Math.max(1, Math.ceil(sentText.length / 45))}
                      value={sentText}
                      onChange={(e) => handleSentenceTextChange(idx, e.target.value)}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      style={activeFontStyle}
                      className={`w-full border border-gray-200 rounded px-2.5 py-1.5 text-gray-800 outline-none focus:border-[#3890fc] bg-white font-medium resize-y leading-relaxed ${
                        isRTL && editorFontFamily === 'default' ? 'font-farsi-trad text-right' : (isRTL ? 'text-right' : 'text-left')
                      }`}
                    />

                    <button
                      onClick={() => handleDeleteRow(idx)}
                      className="w-7 h-7 shrink-0 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition border border-transparent hover:border-red-200"
                      title="Delete Sentence Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
