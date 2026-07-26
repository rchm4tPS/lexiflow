import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from '../../../store/useReaderStore';

const FONT_OPTIONS = [
  { value: 'nunito', label: 'Nunito', systemFont: '"Nunito", sans-serif' },
  { value: 'farsi', label: 'Farsi', systemFont: '"Parastoo", "Tahoma", "Courier New", serif' },
  { value: 'farsi-trad', label: 'Traditional Farsi', systemFont: '"LingqFont", serif' },
];

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 32;

const LINE_HEIGHT_OPTIONS = [1.4, 1.5, 1.6, 1.75, 1.85, 2.0, 2.2];

export default function SettingsDrawer() {
  const {
    fontSize,
    fontFamily,
    lineHeight,
    showSettingsDrawer,
    setShowSettingsDrawer,
    setFontSize,
    setFontFamily,
    setLineHeight,
  } = useReaderStore(useShallow(state => ({
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    lineHeight: state.lineHeight,
    showSettingsDrawer: state.showSettingsDrawer,
    setShowSettingsDrawer: state.setShowSettingsDrawer,
    setFontSize: state.setFontSize,
    setFontFamily: state.setFontFamily,
    setLineHeight: state.setLineHeight,
  })));

  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowSettingsDrawer(false);
      setIsClosing(false);
    }, 280);
  };

  const handleDragStart = (clientY: number) => {
    if (window.innerWidth >= 640) return;
    dragStartY.current = clientY;
  };
  const handleDragMove = (clientY: number) => {
    if (window.innerWidth >= 640 || dragStartY.current === null) return;
    const diff = clientY - dragStartY.current;
    if (diff > 0) setDragY(diff);
  };
  const handleDragEnd = () => {
    if (window.innerWidth >= 640 || dragStartY.current === null) return;
    if (dragY > 80) handleClose();
    dragStartY.current = null;
    setDragY(0);
  };

  if (!showSettingsDrawer) return null;

  return (
    <div
      className={`fixed inset-0 z-[110] bg-black/60 flex items-end justify-center sm:items-center sm:p-4 ${isClosing ? 'animate-fade-out-drawer' : 'animate-fade-in-drawer'}`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-md ${isClosing ? 'animate-slide-down sm:animate-none' : 'animate-slide-up sm:animate-none'}`}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="bg-white w-full max-h-[85vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
            transition: dragY > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Drawer Handle (mobile) */}
          <div
            className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
            onTouchStart={e => handleDragStart(e.touches[0].clientY)}
            onTouchMove={e => handleDragMove(e.touches[0].clientY)}
            onTouchEnd={handleDragEnd}
            onMouseDown={e => handleDragStart(e.clientY)}
            onMouseMove={e => handleDragMove(e.clientY)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
            <h3 className="font-extrabold text-lg text-[#3a92fb]">Settings</h3>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-semibold text-gray-700">Text Size</span>
                <span className="text-[14px] font-bold text-gray-500">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFontSize(Math.max(MIN_FONT_SIZE, fontSize - 1))}
                  disabled={fontSize <= MIN_FONT_SIZE}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  −
                </button>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3a92fb] rounded-full transition-all duration-200"
                    style={{ width: `${((fontSize - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE)) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => setFontSize(Math.min(MAX_FONT_SIZE, fontSize + 1))}
                  disabled={fontSize >= MAX_FONT_SIZE}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  +
                </button>
              </div>
              {/* Quick size labels */}
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-gray-400">Small</span>
                <span className="text-[10px] text-gray-400">Large</span>
              </div>
            </div>

            {/* Font Style */}
            <div>
              <span className="text-[14px] font-semibold text-gray-700 mb-2 block">Font Style</span>
              <div className="flex flex-col gap-2">
                {FONT_OPTIONS.map(opt => (
                  <button
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
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-semibold text-gray-700">Line Height</span>
                <span className="text-[14px] font-bold text-gray-500">{lineHeight.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLineHeight(Math.max(LINE_HEIGHT_OPTIONS[0], parseFloat((lineHeight - 0.05).toFixed(2))))}
                  disabled={lineHeight <= LINE_HEIGHT_OPTIONS[0]}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  −
                </button>
                <div className="flex-1 flex gap-1">
                  {LINE_HEIGHT_OPTIONS.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setLineHeight(opt)}
                      className={`flex-1 h-2 rounded-full transition cursor-pointer ${
                        Math.abs(lineHeight - opt) < 0.01
                          ? 'bg-[#3a92fb]'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setLineHeight(Math.min(LINE_HEIGHT_OPTIONS[LINE_HEIGHT_OPTIONS.length - 1], parseFloat((lineHeight + 0.05).toFixed(2))))}
                  disabled={lineHeight >= LINE_HEIGHT_OPTIONS[LINE_HEIGHT_OPTIONS.length - 1]}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
