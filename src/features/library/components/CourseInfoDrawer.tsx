import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Clock, User, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useReaderStore } from '../../../store/useReaderStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatDuration } from '../../../utils/time';
import type { Course } from '../../../types/reader';

interface CourseInfoDrawerProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
}

export default function CourseInfoDrawer({ course, isOpen, onClose }: CourseInfoDrawerProps) {
  const { deleteCourse, languageCode } = useReaderStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const isOwner = course.owner_id === user?.id;
  const completionPct = course.completion_pct ?? 0;
  const blueRemaining = course.blue_remaining ?? 0;
  const blueRemainingPct = course.blue_remaining_pct ?? 0;
  const totalLingqs = course.total_lingqs ?? 0;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 280);
  };

  const handleDragStart = (clientY: number) => {
    dragStartY.current = clientY;
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (dragStartY.current === null) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const diff = clientY - dragStartY.current;
      if (diff > 0) setDragY(diff);
    };

    const handlePointerUp = () => {
      if (dragStartY.current === null) return;
      if (dragY > 80) {
        handleClose();
      }
      dragStartY.current = null;
      setDragY(0);
    };

    if (isOpen) {
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
  }, [isOpen, dragY]);

  const handleDeleteCourse = async () => {
    handleClose();
    const result = await Swal.fire({
      title: 'Delete Entire Course?',
      text: `This will permanently remove "${course.title}" and ALL ${course.lesson_count} lessons inside it. Your LingQs will be kept.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteCourse(course.id);
        if (res.error === 'confirm_required') {
          const secondConfirm = await Swal.fire({
            title: 'Are you absolutely sure?',
            text: res.message,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Yes, I understand, delete everything!',
            confirmButtonColor: '#ef4444',
          });

          if (secondConfirm.isConfirmed) {
            await deleteCourse(course.id, true);
            Swal.fire('Deleted!', 'Course and lessons removed.', 'success');
            navigate(`/me/${languageCode}/library`);
          }
        } else {
          Swal.fire('Deleted!', 'Course removed.', 'success');
          navigate(`/me/${languageCode}/library`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal Error';
        Swal.fire('Error', 'Failed to delete course: ' + message, 'error');
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[110] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 text-left font-nunito ${
        isClosing ? 'animate-fade-out-drawer' : 'animate-fade-in-drawer'
      }`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-md shrink-0 sm:my-auto flex flex-col ${
          isClosing ? 'animate-slide-down sm:animate-none' : 'animate-slide-up sm:animate-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl relative flex flex-col border border-gray-100"
          style={{
            transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
            transition: dragY > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Mobile Handle */}
          <div
            className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
            onMouseDown={(e) => handleDragStart(e.clientY)}
          >
            <div className="w-10 h-1.5 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
            <h3 className="font-extrabold text-lg text-[#3890fc]">Course Details</h3>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto grow p-5 flex flex-col gap-4">
            {/* Image */}
            <div className="h-44 sm:h-52 w-full rounded-xl overflow-hidden bg-gradient-to-tr from-blue-100 to-indigo-100 border border-gray-100 shadow-sm shrink-0">
              {course.image_url ? (
                <img src={course.image_url} className="w-full h-full object-cover" alt={course.title} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">📖</div>
              )}
            </div>

            {/* Title & Level */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-black text-xl text-gray-800 leading-tight">{course.title}</h2>
                <span className="bg-blue-100 text-[#3890fc] text-xs font-extrabold px-2.5 py-1 rounded-full shrink-0">
                  {course.level || 'Beginner 1'}
                </span>
              </div>
              <div className="w-16 h-1 bg-[#3890fc] rounded-full mt-2 mb-3" />
              {course.description && (
                <pre className="text-xs sm:text-sm text-gray-600 leading-relaxed font-nunito text-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {course.description}
                </pre>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100 text-xs font-bold text-gray-700">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#3890fc]" />
                <span>{course.lesson_count} Lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span>{formatDuration(course.total_duration || 0)}</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <User className="w-4 h-4 text-purple-500" />
                <span>Shared by: <strong className="text-gray-900">{course.owner_username || 'LingQ'}</strong></span>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>Course Progress</span>
                <span className="text-green-600 font-extrabold">{completionPct}% done</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-gray-500 pt-1">
                <span className="text-blue-600">■ {blueRemaining} blue words ({blueRemainingPct}%)</span>
                <span className="text-yellow-600">🪙 {totalLingqs} LingQs</span>
              </div>
            </div>

            {/* Delete button if owner */}
            {isOwner && (
              <button
                onClick={handleDeleteCourse}
                className="w-full py-2.5 mt-1 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-dashed border-red-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Entire Course
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
