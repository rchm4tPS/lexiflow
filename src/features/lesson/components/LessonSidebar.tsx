import React, { useRef } from 'react';

interface LessonSidebarProps {
    imagePreview: string;
    onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImageClear: () => void;
    audioFileName: string;
    audioUrl: string;
    audioMode: 'none' | 'url' | 'file';
    setAudioMode: (mode: 'none' | 'url' | 'file') => void;
    setAudioUrl: (url: string) => void;
    onAudioFileClick: () => void;
    isPublic: boolean;
    setIsPublic: (isPublic: boolean) => void;
    isSelectedCoursePrivate: boolean;
}

export default function LessonSidebar({
    imagePreview, onImageChange,
    audioFileName, audioUrl, audioMode, setAudioMode, setAudioUrl,
    onAudioFileClick, isPublic, setIsPublic, isSelectedCoursePrivate
}: LessonSidebarProps) {
    const lessonImageRef = useRef<HTMLInputElement>(null);

    return (
        <div className="w-[220px] shrink-0 border-r border-gray-100 bg-[#fafafa] flex flex-col gap-3 p-4">
            {/* Image Upload */}
            <div
                onClick={() => lessonImageRef.current?.click()}
                className="w-full aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#3890fc] hover:bg-blue-50/30 transition-colors overflow-hidden bg-white"
            >
                {imagePreview
                    ? <img src={imagePreview} className="w-full h-full object-cover" alt="lesson" />
                    : <span className="text-[#3890fc] text-sm font-bold">+Add Image</span>
                }
            </div>
            <input ref={lessonImageRef} type="file" accept="image/*" className="hidden" onChange={onImageChange} />

            {/* Tags & URL (Placeholders or manageable via parent) */}
            <input
                type="text"
                placeholder="Tags - ie. British, News, Blog"
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:border-[#3890fc] outline-none bg-white"
            />
            <input
                type="text"
                placeholder="Enter original URL..."
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:border-[#3890fc] outline-none bg-white font-medium"
            />

            {/* Audio Upload */}
            <button
                onClick={onAudioFileClick}
                className="flex items-center gap-1.5 w-full border border-gray-200 bg-white rounded px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:border-[#3890fc] hover:text-[#3890fc] transition-colors"
            >
                <span>🔊</span>
                <span className="truncate">{audioFileName || 'Upload Audio File'}</span>
            </button>

            <button
                onClick={() => setAudioMode(audioMode === 'url' ? 'none' : 'url')}
                className="flex items-center gap-1.5 text-xs font-bold text-[#3890fc] hover:underline text-left mt-1"
            >
                <span>🔊</span> {audioUrl ? 'Edit URL' : 'Add URL'}
            </button>
            {audioMode === 'url' && (
                <input
                    type="url"
                    placeholder="https://..."
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:border-[#3890fc] outline-none bg-white"
                />
            )}

            <div className="flex-grow" />

            {/* Visibility Settings */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Visibility</label>
                <select
                    value={isPublic ? 'public' : 'private'}
                    onChange={(e) => !isSelectedCoursePrivate && setIsPublic(e.target.value === 'public')}
                    disabled={isSelectedCoursePrivate}
                    className={`w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-[#3890fc] ${isSelectedCoursePrivate ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'bg-white'}`}
                    title={isSelectedCoursePrivate ? "Lesson must be private because the parent course is private." : ""}
                >
                    <option value="private">Private</option>
                    <option value="public" disabled={isSelectedCoursePrivate}>Public (Shared)</option>
                </select>
            </div>
        </div>
    );
}
