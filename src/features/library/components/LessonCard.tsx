import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useReaderStore } from '../../../store/useReaderStore';

import type { Lesson } from '../../../types/reader';

interface LessonCardProps {
    lesson: Lesson;
    isInsideCourse?: boolean;
    onBookmark?: (id: string) => void;
}

export default function LessonCard({ lesson, isInsideCourse = false, onBookmark }: LessonCardProps) {
    const { languageCode, deleteLesson } = useReaderStore();
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside — must exclude both the trigger button and the portalled dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            const clickedInsideButton = menuRef.current?.contains(target);
            const clickedInsideDropdown = dropdownRef.current?.contains(target);
            if (!clickedInsideButton && !clickedInsideDropdown) {
                setShowMenu(false);
            }
        }
        if (showMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showMenu]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!showMenu && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPos({
                top: rect.bottom + window.scrollY + 4,
                right: window.innerWidth - rect.right,
            });
        }
        setShowMenu(prev => !prev);
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
            } catch {
                Swal.fire('Error', 'Failed to delete the lesson.', 'error');
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
        <div className="flex gap-0 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow relative group overflow-visible">
            {/* Thumbnail */}
            <div className="w-40 h-40 shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden rounded-l-lg border-r border-gray-100">
                {lesson.image_url
                    ? <img src={lesson.image_url} className="w-full h-full object-cover" alt={lesson.title} />
                    : <div className="w-full h-full flex items-center justify-center text-blue-400 text-3xl">📖</div>
                }
            </div>

            {/* Content */}
            <div className="flex flex-col flex-grow px-4 py-3 min-w-0 gap-2 overflow-visible">
                {/* Bookmark button */}
                {onBookmark && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onBookmark(lesson.id); }}
                        className={`text-2xl leading-none transition-colors  ml-auto ${lesson.is_bookmarked ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                        title={lesson.is_bookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
                    >
                        {lesson.is_bookmarked ? '★' : '☆'}
                    </button>
                )}

                {/* Top row: course title */}
                <div className="flex justify-between items-start mb-0.5">
                    <p className="text-xs text-[#3890fc] font-bold truncate">{lesson.course_title}</p>
                    {isInsideCourse && <span />}
                </div>

                {/* Lesson title + Menu */}
                <div className="flex justify-between items-start mb-auto">
                    <h3 className="font-black text-gray-800 text-lg leading-tight truncate pr-2">{lesson.title}</h3>
                    
                    {/* Ellipsis Menu — button stays in-card, dropdown portalled to body */}
                    <div className="relative" ref={menuRef}>
                        <button
                            ref={buttonRef}
                            onClick={toggleMenu}
                            className={`text-gray-400 hover:text-[#3890fc] font-black text-xl p-1 leading-none transition-colors rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-50 ${showMenu ? 'text-[#3890fc] bg-blue-50' : ''}`}
                        >
                            ⋮
                        </button>
                        {showMenu && createPortal(
                            <div
                                ref={dropdownRef}
                                style={{
                                    position: 'absolute',
                                    top: menuPos.top,
                                    right: menuPos.right,
                                    zIndex: 9999,
                                }}
                                className="bg-white border border-gray-200 rounded-md shadow-xl min-w-[140px] py-1 animate-in fade-in zoom-in duration-100 origin-top-right"
                            >
                                <Link
                                    to={`/me/${languageCode}/import/edit/${lesson.id}`}
                                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-[#3890fc] transition-colors"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <span className="text-sm opacity-70">✏️</span> Edit Lesson
                                </Link>
                                <hr className="border-gray-50 my-1" />
                                <button
                                    onClick={(e) => { setShowMenu(false); handleDelete(e); }}
                                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <span className="text-sm opacity-70">🗑️</span> Delete Lesson
                                </button>
                            </div>,
                            document.body
                        )}
                    </div>
                </div>

                {/* Bottom: stats + Open button */}
                <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                            <span className="text-blue-400">■</span>
                            {blueRemainingValue} <span className="text-blue-400">({blueRemainingPct}%)</span>
                            <span className="text-blue-300 text-[10px]">●</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                            {yellowLingQs}
                        </span>
                        {lesson.course_level && (
                            <span className="text-gray-400">{lesson.course_level}</span>
                        )}
                        {lesson.is_completed && (
                            <span className="bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-bold">✓ Done</span>
                        )}
                    </div>

                    <Link
                        to={`/me/${languageCode}/reader/${lesson.id}`}
                        className={`shrink-0 font-bold px-5 py-1 rounded border-2 text-sm transition ${lesson.is_completed
                            ? 'bg-[#3890fc] border-[#3890fc] text-white hover:bg-blue-600'
                            : 'border-gray-300 text-gray-600 hover:border-[#3890fc] hover:text-[#3890fc]'
                            }`}
                    >
                        {lesson.is_completed ? 'Review' : 'Open'}
                    </Link>
                </div>
            </div>
        </div>
    );
}
