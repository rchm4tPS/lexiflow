import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from '../../../store/useReaderStore';
import { flushSync } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';

const FONT_OPTIONS = [
  { value: 'nunito', label: 'Nunito', systemFont: '"Nunito", sans-serif' },
  { value: 'farsi', label: 'Farsi', systemFont: '"Parastoo", "Tahoma", "Courier New", serif' },
  { value: 'farsi-trad', label: 'Traditional Farsi', systemFont: '"LingqFont", serif' },
];

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 48;

const MIN_LINE_HEIGHT = 1.0;
const MAX_LINE_HEIGHT = 2.5;

const MIN_GAP = 0;   // Sangat rapat
const MAX_GAP = 20;  // Sangat renggang
const GAP_STEP = 2;

interface SampleToken {
  id: string;
  text: string;
  isNewline?: boolean;
  stage?: number;
}

export default function SettingsContent() {
  const [showLivePreview, setShowLivePreview] = useState(true);

  const {
    fontSize,
    fontFamily,
    lineHeight,
    showMargins,
    lineGap,
    tokens,
    isRTL,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setShowMargins,
    setLineGap,
  } = useReaderStore(useShallow(state => ({
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    lineHeight: state.lineHeight,
    showMargins: state.showMargins,
    lineGap: state.lineGap ?? 6,
    tokens: state.tokens,
    isRTL: state.isRTL,
    setFontSize: state.setFontSize,
    setFontFamily: state.setFontFamily,
    setLineHeight: state.setLineHeight,
    setShowMargins: state.setShowMargins,
    setLineGap: state.setLineGap,
  })));

  const tokenMarginClass = showMargins ? (isRTL ? 'my-4' : 'my-3') : undefined;

  // Extract Line 1 tokens and Line 2 tokens from lesson tokens
  let line1Tokens: SampleToken[] = [];
  let line2Tokens: SampleToken[] = [];

  if (tokens && tokens.length > 0) {
    const line1List: SampleToken[] = [];
    const line2List: SampleToken[] = [];
    let currentLine = 1;

    for (const t of tokens) {
      if (t.isNewline) {
        if (currentLine === 1 && line1List.length > 0) {
          currentLine = 2;
        } else if (currentLine === 2 && line2List.length > 0) {
          break;
        }
      } else {
        if (currentLine === 1) {
          line1List.push(t);
        } else {
          line2List.push(t);
        }
      }
    }

    if (line2List.length === 0 && line1List.length > 0) {
      const mid = Math.ceil(line1List.length / 2);
      line1Tokens = line1List.slice(0, mid);
      line2Tokens = line1List.slice(mid);
    } else {
      line1Tokens = line1List;
      line2Tokens = line2List;
    }
  }

  // Fallback tokens matching the exact RTL example if tokens array is empty
  if (line1Tokens.length === 0) {
    line1Tokens = [
      { id: '1', text: 'זהו', stage: 0 },
      { id: '2', text: 'סיפור', stage: 0 },
      { id: '3', text: 'על', stage: 0 },
      { id: '4', text: 'מיקי', stage: 1 },
      { id: '5', text: 'הטבח', stage: 0 },
      { id: '6', text: ' .' },
    ];
  }
  if (line2Tokens.length === 0) {
    line2Tokens = [
      { id: '7', text: 'בכל', stage: 1 },
      { id: '8', text: 'בוקר', stage: 1 },
      { id: '9', text: 'מיקי', stage: 1 },
      { id: '10', text: 'קם', stage: 1 },
      { id: '11', text: 'בשש', stage: 1 },
      { id: '12', text: ' .' },
    ];
  }

  const currentFontOption = FONT_OPTIONS.find(f => f.value === fontFamily) || FONT_OPTIONS[0];

  // Helper style menggunakan MARGIN (ruang kosong antar baris):
  const previewTokenStyle: React.CSSProperties = {
    marginTop: `${(showMargins ? lineGap : 0) / 2}px`,
    marginBottom: `${(showMargins ? lineGap : 0) / 2}px`,
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Fixed Live Preview Pane Header — sticky so it stays visible while settings scroll */}
      <div className="pb-3 border-b border-gray-100 shrink-0 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-extrabold text-gray-400 uppercase tracking-wider">
            LIVE PREVIEW
          </span>
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
            title={showLivePreview ? 'Hide Preview' : 'Show Preview'}
          >
            {showLivePreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        {showLivePreview && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 shadow-inner overflow-hidden select-none min-h-[110px] flex items-center justify-center">
            <div
              className="w-full text-center transition-all duration-75 break-words overflow-hidden"
              dir={isRTL ? 'rtl' : 'ltr'}
              style={{
                fontSize: `${Math.round(fontSize)}px`,
                fontFamily: currentFontOption.systemFont,
                lineHeight: lineHeight,
              }}
            >
              {/* Line 1 Tokens */}
              {line1Tokens.map((t, idx) => {
                const isWord = !t.isNewline && !!t.text.match(/[\p{L}\p{N}]/u);
                if (!isWord) {
                  return <span key={t.id || `l1_${idx}`} style={previewTokenStyle} className={`mx-0.5 inline-block${tokenMarginClass ? ` ${tokenMarginClass}` : ''}`}>{t.text}</span>;
                }
                const isBlue = (t.stage ?? 0) === 0;
                const isYellow = (t.stage ?? 0) > 0 && (t.stage ?? 0) < 4;
                return (
                  <span
                    key={t.id || `l1_${idx}`}
                    style={previewTokenStyle}
                    className={`inline-block mx-0.75 px-0.75 rounded font-medium${tokenMarginClass ? ` ${tokenMarginClass}` : ''} ${isBlue ? 'bg-[#bde0fe] text-gray-900' : isYellow ? 'bg-[#fef08a] text-gray-900' : 'text-gray-800'}`}
                  >
                    {t.text}
                  </span>
                );
              })}

              <br />

              {/* Line 2 Tokens */}
              {line2Tokens.map((t, idx) => {
                const isWord = !t.isNewline && !!t.text.match(/[\p{L}\p{N}]/u);
                if (!isWord) {
                  return <span key={t.id || `l2_${idx}`} style={previewTokenStyle} className={`mx-0.5 inline-block${tokenMarginClass ? ` ${tokenMarginClass}` : ''}`}>{t.text}</span>;
                }
                const isBlue = (t.stage ?? 0) === 0;
                const isYellow = (t.stage ?? 0) > 0 && (t.stage ?? 0) < 4;
                return (
                  <span
                    key={t.id || `l2_${idx}`}
                    style={previewTokenStyle}
                    className={`inline-block mx-0.75 px-0.75 rounded font-medium${tokenMarginClass ? ` ${tokenMarginClass}` : ''} ${isBlue ? 'bg-[#bde0fe] text-gray-900' : isYellow ? 'bg-[#fef08a] text-gray-900' : 'text-gray-800'}`}
                  >
                    {t.text}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Settings Controls Area */}
      <div className="pt-4 space-y-6 pr-2 pb-8">

        {/* Font Size */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-gray-700">Text Size</span>
            <span className="text-[14px] font-extrabold text-[#3a92fb] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">{Math.round(fontSize)}px</span>
          </div>

          <div className="relative flex items-center h-6 cursor-pointer select-none px-2.5">
            {/* Background Track */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3a92fb] rounded-full transition-all duration-75"
                style={{ width: `${((Math.round(fontSize) - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE)) * 100}%` }}
              />
            </div>

            {/* Visible Round Thumb Bullet — center point follows the percentage value */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-[#3a92fb] rounded-full shadow-md pointer-events-none transition-all duration-75"
              style={{ left: `calc(10px + (${((Math.round(fontSize) - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE))} * (100% - 20px)))` }}
            />

            {/* Native Range Input */}
            <input
              type="range"
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              step={1}
              value={Math.round(fontSize)}
              onChange={e => flushSync(() => setFontSize(Number(e.target.value)))}
              className="absolute inset-0 opacity-0 w-full cursor-pointer h-full z-10"
            />
          </div>

          {/* Quick size labels */}
          <div className="flex justify-between mt-2">
            <span className="text-[11px] font-semibold text-gray-400">Small ({MIN_FONT_SIZE}px)</span>
            <span className="text-[11px] font-semibold text-gray-400">Large ({MAX_FONT_SIZE}px)</span>
          </div>
        </div>

        {/* Font Style */}
        <div>
          <span className="text-[14px] font-semibold text-gray-700 mb-2 block">Font Style</span>
          <div className="flex flex-col gap-2">
            {FONT_OPTIONS.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setFontFamily(opt.value)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition cursor-pointer text-left ${
                  fontFamily === opt.value
                    ? 'border-[#3a92fb] bg-blue-50 text-[#3a92fb]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={`text-[14px] ${fontFamily === opt.value ? 'font-semibold' : 'font-normal'}`} style={{ fontFamily: opt.systemFont }}>
                  {opt.label}
                </span>
                {fontFamily === opt.value && (
                  <span className="ml-auto text-[#3a92fb]">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Line Height */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-gray-700">Line Height</span>
            <span className="text-[14px] font-extrabold text-[#3a92fb] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">{lineHeight.toFixed(2)}</span>
          </div>

          <div className="relative flex items-center h-6 cursor-pointer select-none px-2.5">
            {/* Background Track */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3a92fb] rounded-full transition-all duration-75"
                style={{ width: `${((lineHeight - MIN_LINE_HEIGHT) / (MAX_LINE_HEIGHT - MIN_LINE_HEIGHT)) * 100}%` }}
              />
            </div>

            {/* Visible Round Thumb Bullet — center point follows slider percentage */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-[#3a92fb] rounded-full shadow-md pointer-events-none transition-all duration-75"
              style={{ left: `calc(10px + (${((lineHeight - MIN_LINE_HEIGHT) / (MAX_LINE_HEIGHT - MIN_LINE_HEIGHT))} * (100% - 20px)))` }}
            />

            {/* Native Range Input */}
            <input
              type="range"
              min={MIN_LINE_HEIGHT}
              max={MAX_LINE_HEIGHT}
              step={0.05}
              value={lineHeight}
              onChange={e => flushSync(() => setLineHeight(parseFloat(parseFloat(e.target.value).toFixed(2))))}
              className="absolute inset-0 opacity-0 w-full cursor-pointer h-full z-10"
            />
          </div>

          {/* Quick height labels */}
          <div className="flex justify-between mt-2">
            <span className="text-[11px] font-semibold text-gray-400">Tight (1.0)</span>
            <span className="text-[11px] font-semibold text-gray-400">Loose (2.5)</span>
          </div>
        </div>

        {/* Line Gap (Jarak Baris Token) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-gray-700">Line Gap</span>
            <span className="text-[14px] font-extrabold text-[#3a92fb] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {lineGap}px
            </span>
          </div>

          <div className="relative flex items-center h-6 cursor-pointer select-none px-2.5">
            {/* Background Track */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3a92fb] rounded-full transition-all duration-75"
                style={{ width: `${((lineGap - MIN_GAP) / (MAX_GAP - MIN_GAP)) * 100}%` }}
              />
            </div>

            {/* Visible Round Thumb Bullet — center point follows slider percentage */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-[#3a92fb] rounded-full shadow-md pointer-events-none transition-all duration-75"
              style={{ left: `calc(10px + (${((lineGap - MIN_GAP) / (MAX_GAP - MIN_GAP))} * (100% - 20px)))` }}
            />

            {/* Native Range Input */}
            <input
              type="range"
              min={MIN_GAP}
              max={MAX_GAP}
              step={GAP_STEP}
              value={lineGap}
              onChange={e => flushSync(() => setLineGap(Number(e.target.value)))}
              className="absolute inset-0 opacity-0 w-full cursor-pointer h-full z-10"
            />
          </div>

          {/* Quick gap labels */}
          <div className="flex justify-between mt-2">
            <span className="text-[11px] font-semibold text-gray-400">Compact ({MIN_GAP}px)</span>
            <span className="text-[11px] font-semibold text-gray-400">Spacious ({MAX_GAP}px)</span>
          </div>
        </div>

        {/* Show Margins Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-gray-700">Token Margins</span>
          <button
            type="button"
            role="switch"
            aria-checked={showMargins}
            onClick={() => setShowMargins(!showMargins)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
              showMargins ? 'bg-[#3a92fb]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                showMargins ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

      </div>

    </div>
  );
}
