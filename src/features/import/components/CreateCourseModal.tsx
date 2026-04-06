import React, { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import { uploadFile } from '../../../utils/upload';
import { LEVELS } from '../../../constants/levels';

import type { Course } from '../../../types/reader';

interface CreateCourseModalProps {
    onClose: () => void;
    onCreate: (course: Course) => void;
    createCourse: (title: string, level: string, description?: string, imageUrl?: string, isPublic?: boolean) => Promise<Course | undefined>;
}

export default function CreateCourseModal({ onClose, onCreate, createCourse }: CreateCourseModalProps) {
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCourseLevel, setNewCourseLevel] = useState('Beginner 1');
    const [newCourseDesc, setNewCourseDesc] = useState('');
    const [newCourseImageUrl, setNewCourseImageUrl] = useState('');
    const [newCourseImagePreview, setNewCourseImagePreview] = useState('');
    const [newCourseImageFile, setNewCourseImageFile] = useState<File | null>(null);
    const [newCourseIsPublic, setNewCourseIsPublic] = useState(false);
    const [isCreatingCourse, setIsCreatingCourse] = useState(false);
    const newCourseImageRef = useRef<HTMLInputElement>(null);

    const handleNewCourseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setNewCourseImageFile(file);
        setNewCourseImageUrl('');
        setNewCourseImagePreview(URL.createObjectURL(file));
    };

    const handleCreateCourse = async () => {
        if (!newCourseTitle.trim()) {
            Swal.fire({ icon: 'warning', title: 'Title required', text: 'Please enter a course title.', confirmButtonColor: '#3890fc' });
            return;
        }
        setIsCreatingCourse(true);
        try {
            let imageUrl = newCourseImageUrl;
            if (newCourseImageFile) imageUrl = await uploadFile(newCourseImageFile, 'image');
            const course = await createCourse(newCourseTitle, newCourseLevel, newCourseDesc, imageUrl, newCourseIsPublic);
            if (course) {
                onCreate(course);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Internal Error";
            Swal.fire({ icon: 'error', title: 'Error', text: message, confirmButtonColor: '#3890fc' });
        } finally {
            setIsCreatingCourse(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col gap-4 p-6">
                <h3 className="text-xl font-black text-gray-800">Create New Course</h3>

                {/* Course cover image */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Course Cover Image</label>
                    <div className="flex gap-3">
                        <div
                            onClick={() => newCourseImageRef.current?.click()}
                            className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#3890fc] hover:bg-blue-50/30 transition-colors overflow-hidden shrink-0"
                        >
                            {newCourseImagePreview
                                ? <img src={newCourseImagePreview} className="w-full h-full object-cover" alt="cover" />
                                : <span className="text-[#3890fc] text-xs font-bold text-center px-1">+Add</span>
                            }
                        </div>
                        <input
                            type="url"
                            placeholder="Or paste image URL..."
                            value={newCourseImageUrl}
                            onChange={(e) => { setNewCourseImageUrl(e.target.value); setNewCourseImagePreview(e.target.value); setNewCourseImageFile(null); }}
                            className="flex-grow border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#3890fc]"
                        />
                        <input ref={newCourseImageRef} type="file" accept="image/*" className="hidden" onChange={handleNewCourseImageChange} />
                    </div>
                </div>

                {/* Course title */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Course Title *</label>
                    <input
                        type="text"
                        placeholder="e.g. German for Beginners"
                        value={newCourseTitle}
                        onChange={(e) => setNewCourseTitle(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#3890fc]"
                        autoFocus
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Description</label>
                    <textarea
                        placeholder="A short description of this course..."
                        value={newCourseDesc}
                        onChange={(e) => setNewCourseDesc(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#3890fc] resize-none"
                    />
                </div>

                {/* Level */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Level</label>
                    <select
                        value={newCourseLevel}
                        onChange={(e) => setNewCourseLevel(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#3890fc] bg-white"
                    >
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>

                {/* Visibility */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Visibility</label>
                    <select
                        value={newCourseIsPublic ? 'public' : 'private'}
                        onChange={(e) => setNewCourseIsPublic(e.target.value === 'public')}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#3890fc] bg-white"
                    >
                        <option value="private">Private (Only Me)</option>
                        <option value="public">Public (Shared)</option>
                    </select>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-1">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateCourse}
                        disabled={isCreatingCourse}
                        className="px-5 py-2 text-sm bg-[#3890fc] text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        {isCreatingCourse ? 'Creating...' : 'Create Course'}
                    </button>
                </div>
            </div>
        </div>
    );
}
