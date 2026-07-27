import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from '../../../store/useReaderStore';
import SettingsContent from './SettingsContent';

export default function SettingsDrawer() {
  const { showSettingsDrawer, setShowSettingsDrawer } = useReaderStore(useShallow(state => ({
    showSettingsDrawer: state.showSettingsDrawer,
    setShowSettingsDrawer: state.setShowSettingsDrawer,
  })));

  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1280);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (window.innerWidth >= 640 || dragStartY.current === null) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const diff = clientY - dragStartY.current;
      if (diff > 0) setDragY(diff);
    };

    const handlePointerUp = () => {
      if (window.innerWidth >= 640 || dragStartY.current === null) return;
      if (dragY > 80) {
        handleClose();
      }
      dragStartY.current = null;
      setDragY(0);
    };

    if (showSettingsDrawer && !isDesktop) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [showSettingsDrawer, isDesktop, dragY]);

  if (!showSettingsDrawer || isDesktop) return null;

  return createPortal(
    <div
      className={`xl:hidden fixed inset-0 z-[110] bg-black/60 pointer-events-none flex items-end justify-center sm:items-center sm:p-4 ${isClosing ? 'animate-fade-out-drawer' : 'animate-fade-in-drawer'}`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-md pointer-events-auto ${isClosing ? 'animate-slide-down sm:animate-none' : 'animate-slide-up sm:animate-none'}`}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="bg-white w-full max-h-[85vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
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
            onMouseDown={e => handleDragStart(e.clientY)}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
            <h3 className="font-extrabold text-lg text-[#3a92fb]">Reader Settings</h3>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 px-5 py-4 overflow-y-auto">
            <SettingsContent />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
