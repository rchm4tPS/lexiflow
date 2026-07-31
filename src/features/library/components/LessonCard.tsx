import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useReaderStore } from '../../../store/useReaderStore';
import { useAuthStore } from '../../../store/useAuthStore';

import type { Lesson } from '../../../types/reader';

interface LessonCardProps {
    lesson: Lesson;
    isInsideCourse?: boolean;
    onBookmark?: (id: string) => void;
}

export default function LessonCard({ lesson, isInsideCourse = false, onBookmark: _onBookmark }: LessonCardProps) {
    const navigate = useNavigate();
    const { languageCode, deleteLesson } = useReaderStore();
    const { user } = useAuthStore();
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isOwner = Boolean(user?.id && lesson.owner_id && lesson.owner_id === user.id);

    // Close menu when clicking outside — exclude trigger buttons with .three-dots-btn class
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (dropdownRef.current?.contains(target)) return;
            if ((target as HTMLElement).closest('.three-dots-btn')) return;
            setShowMenu(false);
        }
        if (showMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showMenu]);

    const toggleMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        e.preventDefault();
        if (showMenu) {
            setShowMenu(false);
            return;
        }
        const btn = e.currentTarget;
        if (btn) {
            const rect = btn.getBoundingClientRect();
            const dropdownHeight = 110;
            const openAbove = rect.bottom + dropdownHeight > window.innerHeight;
            setMenuPos({
                top: openAbove ? Math.max(10, rect.top + window.scrollY - dropdownHeight) : rect.bottom + window.scrollY + 4,
                right: Math.max(10, window.innerWidth - rect.right),
            });
            setShowMenu(true);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const result = await Swal.fire({
            title: 'Delete Lesson?',
            text: `Are you sure you want to delete "${lesson.title}"? This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deleteLesson(lesson.id);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'The lesson has been removed.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (err: unknown) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to delete the lesson.';
                Swal.fire('Error', errorMsg, 'error');
            }
        }
    };

    const blueRemainingValue = (lesson.user_new_words !== null && lesson.user_new_words !== undefined)
        ? lesson.user_new_words
        : (lesson.unique_words || 0);
    const yellowLingQs = lesson.user_lingqs || 0;

    const initialUnique = lesson.unique_words || 1;
    const processedWords = initialUnique - blueRemainingValue;
    const completionPercentage = Math.max(0, Math.min(100, Math.round((processedWords / initialUnique) * 100)));
    const blueRemainingPct = 100 - completionPercentage;

    return (
        <div 
            className="w-full max-w-full overflow-hidden flex flex-row bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow relative group p-3 gap-3.5"
        >
            {/* ── MOBILE CARD LAYOUT (< 640px) ── */}
            <div className="flex sm:hidden flex-row w-full gap-3">
                {/* Thumbnail Cover */}
                <div className="w-[72px] h-[72px] shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden rounded-lg border border-gray-100 relative aspect-square">
                    {lesson.image_url
                        ? <img src={lesson.image_url} className="w-full h-full object-cover" alt={lesson.title} />
                        : <div className="w-full h-full flex items-center justify-center text-blue-400 text-2xl">📖</div>
                    }
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 min-w-0 justify-between">
                    <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                            {!isInsideCourse && lesson.course_title && (
                                <p className="text-[10px] text-gray-400 font-bold truncate leading-tight mb-0.5">{lesson.course_title}</p>
                            )}
                            <h3 className="font-extrabold text-gray-800 text-sm leading-snug line-clamp-2 pr-1">{lesson.title}</h3>
                        </div>

                        {/* Three Dots Button at top-right aligned with course title (OWNERS ONLY) */}
                        {isOwner && (
                            <div className="relative shrink-0 -mr-1 -mt-1">
                                <button
                                    onClick={toggleMenu}
                                    className={`three-dots-btn text-gray-400 hover:text-[#3890fc] font-black text-sm px-1.5 py-0.5 leading-none transition-colors rounded-full flex items-center justify-center hover:bg-blue-50 cursor-pointer ${showMenu ? 'text-[#3890fc] bg-blue-50' : ''}`}
                                    title="Options"
                                >
                                    •••
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden my-1">
                        <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                            style={{ width: `${completionPercentage}%` }} 
                        />
                    </div>

                    {/* Stats Row & Actions */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-blue-500">
                                <span className="w-2 h-2 bg-blue-400 rounded-xs shrink-0"></span>
                                <span>{blueRemainingValue}</span>
                                <span className="text-red-400 text-[9px]">({blueRemainingPct}%)</span>
                            </span>

                            <span className="flex items-center gap-1 text-amber-600">
                                <span className="w-2 h-2 bg-amber-400 rounded-xs shrink-0"></span>
                                <span>{yellowLingQs}</span>
                            </span>
                        </div>

                        {/* Actions Row: Open Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                                onClick={(e) => { e.stopPropagation(); navigate(`/me/${languageCode}/reader/${lesson.id}`); }}
                                className="bg-[#3890fc] text-white px-2.5 py-1 rounded-md font-bold text-[13px] shadow-2xs hover:bg-blue-600 transition-colors cursor-pointer"
                            >
                                Open
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* ── DESKTOP CARD LAYOUT (>= 640px) ── */}
            <div className="hidden sm:flex flex-row w-full gap-4 items-center relative">
                {/* Thumbnail Cover */}
                <div className="w-28 h-24 shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden rounded-lg border border-gray-100 relative">
                    {lesson.image_url
                        ? <img src={lesson.image_url} className="w-full h-full object-cover" alt={lesson.title} />
                        : <div className="w-full h-full flex items-center justify-center text-blue-400 text-3xl">📖</div>
                    }
                </div>

                {/* Main Metadata */}
                <div className="flex flex-col flex-1 min-w-0 justify-between self-stretch py-0.5">
                    <div>
                        {!isInsideCourse && lesson.course_title && (
                            <p className="text-xs text-blue-500 font-bold truncate mb-0.5 pr-8">{lesson.course_title}</p>
                        )}
                        <h3 className="font-extrabold text-gray-800 text-base leading-snug line-clamp-2 hover:text-[#3890fc] transition-colors">{lesson.title}</h3>
                    </div>

                    {/* Progress Bar for Desktop */}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden my-1">
                        <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                            style={{ width: `${completionPercentage}%` }} 
                        />
                    </div>

                    {/* Desktop Stats Row (Visual Completion Badge!) */}
                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span>{blueRemainingValue} new</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            <span>{yellowLingQs} LingQs</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200/80 font-extrabold">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <span>{completionPercentage}% completed</span>
                        </span>
                    </div>
                </div>

                {/* Right Action & Menu */}
                <div className="flex items-center gap-2.5 shrink-0 self-end">
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/me/${languageCode}/reader/${lesson.id}`); }}
                        className="bg-[#3890fc] text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs hover:bg-blue-600 transition-colors cursor-pointer"
                    >
                        Open Lesson
                    </button>
                </div>

                {/* Three Dots Button at top-right aligned with course title (OWNERS ONLY) */}
                {isOwner && (
                    <div className="absolute top-0 right-0">
                        <button
                            onClick={toggleMenu}
                            className={`three-dots-btn text-gray-400 hover:text-[#3890fc] font-black text-base px-2 py-0.5 leading-none transition-colors rounded-full flex items-center justify-center hover:bg-blue-50 cursor-pointer ${showMenu ? 'text-[#3890fc] bg-blue-50' : ''}`}
                            title="Options"
                        >
                            •••
                        </button>
                    </div>
                )}
            </div>

            {/* Portalled Dropdown (OWNERS ONLY) */}
            {showMenu && isOwner && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'absolute',
                        top: menuPos.top,
                        right: menuPos.right,
                        zIndex: 9999,
                    }}
                    className="bg-white border border-gray-200 rounded-md shadow-xl min-w-[140px] py-1 animate-in fade-in zoom-in duration-100 origin-top-right font-bold text-xs"
                >
                    <Link
                        to={`/me/${languageCode}/import/edit/${lesson.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-[#3890fc] transition-colors"
                        onClick={() => setShowMenu(false)}
                    >
                        <span className="text-sm opacity-70">✏️</span> Edit Lesson
                    </Link>
                    <hr className="border-gray-50 my-1" />
                    <button
                        onClick={(e) => { setShowMenu(false); handleDelete(e); }}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                        <span className="text-sm opacity-70">🗑️</span> Delete Lesson
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}
