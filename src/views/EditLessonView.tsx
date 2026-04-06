import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReaderStore } from '../store/useReaderStore';
import Swal from 'sweetalert2';
import { apiClient } from '../api/client';
import { uploadFile } from '../utils/upload';
import { LANG_MAP } from '../constants/languages';

import LessonForm from '../features/lesson/components/LessonForm';
import LessonSidebar from '../features/lesson/components/LessonSidebar';

import type { Course } from '../types/reader';

export default function EditLessonView() {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const {
        myCoursesDropdown,
        fetchMyCoursesDropdown,
        languageCode
    } = useReaderStore();

    const currentLang = LANG_MAP[languageCode] || { name: languageCode.toUpperCase(), flag: '🌐' };

    // ── Lesson form state ──────────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'title-text' | 'resources' | 'clips'>('title-text');

    // ── Lesson image ──────────────────────────────────────────────────────────
    const [lessonImageFile, setLessonImageFile] = useState<File | null>(null);
    const [lessonImagePreview, setLessonImagePreview] = useState('');
    const [existingImageUrl, setExistingImageUrl] = useState('');

    // ── Audio ──────────────────────────────────────────────────────────────────
    const [audioMode, setAudioMode] = useState<'none' | 'url' | 'file'>('none');
    const [audioUrl, setAudioUrl] = useState('');
    const [existingAudioUrl, setExistingAudioUrl] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioFileName, setAudioFileName] = useState('');
    const [existingAudioDuration, setExistingAudioDuration] = useState(0);

    const allCourses: Course[] = Array.from(
        new Map((myCoursesDropdown || []).map((c: Course) => [c.id, c])).values()
    );

    const selectedCourseRecord = allCourses.find(
        (c) => c.id === selectedCourseId
    );
    const isSelectedCoursePrivate = selectedCourseRecord ? !selectedCourseRecord.is_public : false;

    const handleSetIsPublic = (value: boolean) => {
        if (isSelectedCoursePrivate && value) return;
        setIsPublic(value);
    };

    const effectiveIsPublic = isSelectedCoursePrivate ? false : isPublic;

    useEffect(() => {
        fetchMyCoursesDropdown();
    }, [fetchMyCoursesDropdown]);

    // ── Fetch existing lesson data ─────────────────────────────────────────────
    useEffect(() => {
        const fetchLessonData = async () => {
            try {
                const data = await apiClient(`/lessons/${lessonId}/edit`);
                setTitle(data.title);
                setText(data.original_text || '');
                setSelectedCourseId(data.course_id);
                setIsPublic(data.is_public);
                setExistingImageUrl(data.image_url);
                setLessonImagePreview(data.image_url);
                setExistingAudioUrl(data.audio_url);
                setExistingAudioDuration(data.duration || 0);
                if (data.audio_url) {
                    setAudioMode('url');
                    setAudioUrl(data.audio_url);
                }
                setIsLoading(false);
            } catch {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load lesson for editing.', confirmButtonColor: '#3890fc' });
                navigate(`/me/${languageCode}`);
            }
        };
        fetchLessonData();
    }, [lessonId, navigate, languageCode]);

    const effectiveLevel = selectedLevel ?? selectedCourseRecord?.level ?? '';

    // ── Sync level with selected course ───────────────────────────────────────
    // useEffect(() => {
    //     if (selectedCourseId && selectedCourseRecord) {
    //         setSelectedLevel(selectedCourseRecord.level || '');
    //     }
    // }, [selectedCourseId, selectedCourseRecord]);

    const handleLessonImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLessonImageFile(file);
        setLessonImagePreview(URL.createObjectURL(file));
    };

    const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioFile(file);
        setAudioFileName(file.name);
        setAudioMode('file');
    };

    const handleSave = async (openAfter = false) => {
        if (!title.trim()) {
            Swal.fire({ icon: 'warning', title: 'Title required', text: 'Please enter a lesson title.', confirmButtonColor: '#3890fc' });
            return;
        }
        if (!text.trim()) {
            Swal.fire({ icon: 'warning', title: 'Text required', text: 'Please add lesson text.', confirmButtonColor: '#3890fc' });
            return;
        }

        setIsSaving(true);
        try {
            let finalImageUrl = existingImageUrl;
            if (lessonImageFile) finalImageUrl = await uploadFile(lessonImageFile, 'image');

            let finalAudioUrl = audioMode === 'url' ? audioUrl : existingAudioUrl;
            if (audioMode === 'file' && audioFile) finalAudioUrl = await uploadFile(audioFile, 'audio');

            let parsedAudioDuration = existingAudioDuration;
            if (finalAudioUrl !== existingAudioUrl) {
                const durationObjUrl = audioMode === 'file' && audioFile ? URL.createObjectURL(audioFile) : finalAudioUrl;
                parsedAudioDuration = await new Promise<number>((resolve) => {
                    const tempAudio = new Audio(durationObjUrl);
                    tempAudio.onloadedmetadata = () => resolve(tempAudio.duration);
                    tempAudio.onerror = () => resolve(0);
                });
                if (audioMode === 'file' && audioFile) URL.revokeObjectURL(durationObjUrl);
            }

            await apiClient(`/lessons/${lessonId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    courseId: selectedCourseId,
                    title,
                    description: '',
                    rawText: text,
                    imageUrl: finalImageUrl,
                    audioUrl: finalAudioUrl,
                    audioDuration: parsedAudioDuration,
                    isPublic,
                    languageCode
                })
            });

            setIsSaving(false);
            const lang = languageCode || 'de';
            
            Swal.fire({
                icon: 'success',
                title: 'Changes Saved!',
                text: `"${title}" has been updated.`,
                confirmButtonColor: '#3890fc',
                confirmButtonText: openAfter ? 'Open Lesson' : 'Go to My Lessons',
                showCancelButton: !openAfter,
                cancelButtonText: 'Open Lesson',
                cancelButtonColor: '#6b7280',
            }).then((result) => {
                if (openAfter || result.dismiss === Swal.DismissReason.cancel) {
                    navigate(`/me/${lang}/reader/${lessonId}`);
                } else {
                    navigate(`/me/${lang}`);
                }
            });

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error saving lesson!"
            setIsSaving(false);
            Swal.fire({ icon: 'error', title: 'Error', text: message, confirmButtonColor: '#3890fc' });
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-screen font-nunito text-gray-500 font-bold">Loading lesson data...</div>;

    return (
        <div className="flex justify-center w-full min-h-[calc(100vh-64px)] bg-[#f3f4f6] font-nunito py-8 px-6">
            <div className="flex flex-col max-w-280 w-full">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                        <h1 className="text-2xl font-black text-gray-800">Edit Lesson</h1>
                        <button onClick={() => navigate(-1)} className="text-gray-500 text-sm font-bold hover:text-gray-700">Cancel</button>
                    </div>

                    <div className="flex flex-grow overflow-hidden">
                        <LessonSidebar 
                            imagePreview={lessonImagePreview}
                            onImageChange={handleLessonImageChange}
                            onImageClear={() => { setLessonImageFile(null); setLessonImagePreview(existingImageUrl); }}
                            audioFileName={audioFileName}
                            audioUrl={audioUrl}
                            audioMode={audioMode}
                            setAudioMode={setAudioMode}
                            setAudioUrl={setAudioUrl}
                            onAudioFileClick={() => { setAudioMode('file'); (document.querySelector('input[type="file"][accept="audio/*"]') as HTMLInputElement | null)?.click(); }}
                            isPublic={effectiveIsPublic}
                            setIsPublic={handleSetIsPublic}
                            isSelectedCoursePrivate={isSelectedCoursePrivate}
                        />
                        {/* Hidden input for LessonSidebar trigger */}
                        <input type="file" accept="audio/*" className="hidden" onChange={handleAudioFileChange} />

                        <LessonForm 
                            title={title} setTitle={setTitle}
                            text={text} setText={setText}
                            activeTab={activeTab} setActiveTab={setActiveTab}
                            currentLang={currentLang}
                            selectedLevel={effectiveLevel} setSelectedLevel={setSelectedLevel}
                            selectedCourseId={selectedCourseId} setSelectedCourseId={setSelectedCourseId}
                            allCourses={allCourses}
                            isEditMode={true}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                        <button onClick={() => handleSave(false)} disabled={isSaving} className="border border-[#3890fc] text-[#3890fc] font-bold px-6 py-1.5 rounded text-sm hover:bg-blue-50 disabled:opacity-50">Save</button>
                        <button onClick={() => handleSave(true)} disabled={isSaving} className="bg-[#3890fc] text-white font-bold px-6 py-1.5 rounded text-sm hover:bg-blue-600 disabled:opacity-50">Save & Open</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
