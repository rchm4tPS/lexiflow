import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { uploadFile } from '../../../utils/upload';
import { LANG_MAP } from '../../../constants/languages';
import LessonForm from '../../lesson/components/LessonForm';
import LessonSidebar from '../../lesson/components/LessonSidebar';

interface ManualImportFormProps {
    languageCode: string;
    allCourses: any[];
    onShowCourseModal: () => void;
    importLesson: (courseId: string, title: string, text: string, imageUrl: string, tags: string, audioUrl: string, isPublic: boolean, duration: number) => Promise<string | null>;
}

export default function ManualImportForm({ languageCode, allCourses, onShowCourseModal, importLesson }: ManualImportFormProps) {
    const navigate = useNavigate();
    const currentLang = LANG_MAP[languageCode] || { name: languageCode.toUpperCase(), flag: '🌐' };

    // Form state
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'title-text' | 'resources' | 'clips'>('title-text');

    // Lesson image
    const [lessonImageFile, setLessonImageFile] = useState<File | null>(null);
    const [lessonImagePreview, setLessonImagePreview] = useState('');

    // Audio
    const [audioMode, setAudioMode] = useState<'none' | 'url' | 'file'>('none');
    const [audioUrl, setAudioUrl] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioFileName, setAudioFileName] = useState('');

    const selectedCourseRecord = allCourses.find((c: any) => c.id === selectedCourseId);
    const isSelectedCoursePrivate = selectedCourseRecord ? !selectedCourseRecord.is_public : false;

    useEffect(() => {
        if (isSelectedCoursePrivate && isPublic) {
            setIsPublic(false);
        }
    }, [isSelectedCoursePrivate, isPublic]);

    useEffect(() => {
        if (selectedCourseId && selectedCourseRecord) {
            setSelectedLevel(selectedCourseRecord.level || '');
        }
    }, [selectedCourseId, selectedCourseRecord]);

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
        if (!selectedCourseId) {
            Swal.fire({ icon: 'warning', title: 'Course required', text: 'Please select or create a course first.', confirmButtonColor: '#3890fc' });
            return;
        }

        setIsSaving(true);
        try {
            let finalImageUrl = '';
            if (lessonImageFile) finalImageUrl = await uploadFile(lessonImageFile, 'image');

            let finalAudioUrl = audioMode === 'url' ? audioUrl : '';
            if (audioMode === 'file' && audioFile) finalAudioUrl = await uploadFile(audioFile, 'audio');

            let parsedAudioDuration = 0;
            if (finalAudioUrl) {
                const durationObjUrl = audioMode === 'file' && audioFile ? URL.createObjectURL(audioFile) : finalAudioUrl;
                parsedAudioDuration = await new Promise<number>((resolve) => {
                    const tempAudio = new Audio(durationObjUrl);
                    tempAudio.onloadedmetadata = () => resolve(tempAudio.duration);
                    tempAudio.onerror = () => resolve(0);
                });
                if (audioMode === 'file' && audioFile) URL.revokeObjectURL(durationObjUrl);
            }

            const lessonId = await importLesson(selectedCourseId, title, text, finalImageUrl, '', finalAudioUrl, isPublic, parsedAudioDuration);
            setIsSaving(false);

            if (lessonId) {
                const lang = languageCode || 'de';
                if (openAfter) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Lesson Created!',
                        text: `"${title}" has been successfully imported.`,
                        confirmButtonColor: '#3890fc',
                        confirmButtonText: 'Open Lesson',
                        showCancelButton: true,
                        cancelButtonText: 'Go to Library',
                        cancelButtonColor: '#6b7280',
                    }).then((result) => {
                        if (result.isConfirmed) {
                            navigate(`/me/${lang}/reader/${lessonId}`);
                        } else {
                            navigate(`/me/${lang}`);
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Lesson Saved!',
                        text: `"${title}" was successfully created.`,
                        confirmButtonColor: '#3890fc',
                        confirmButtonText: 'Go to My Lessons',
                        showCancelButton: true,
                        cancelButtonText: 'Open Lesson',
                        cancelButtonColor: '#3890fc',
                    }).then((result) => {
                        if (result.dismiss === Swal.DismissReason.cancel) {
                            navigate(`/me/${lang}/reader/${lessonId}`);
                        } else {
                            navigate(`/me/${lang}`);
                        }
                    });
                }
            }
        } catch (err: any) {
            setIsSaving(false);
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#3890fc' });
        }
    };

    return (
        <div className="flex grow overflow-hidden">
            <LessonSidebar 
                imagePreview={lessonImagePreview}
                onImageChange={handleLessonImageChange}
                onImageClear={() => { setLessonImageFile(null); setLessonImagePreview(''); }}
                audioFileName={audioFileName}
                audioUrl={audioUrl}
                audioMode={audioMode}
                setAudioMode={setAudioMode}
                setAudioUrl={setAudioUrl}
                onAudioFileClick={() => { setAudioMode('file'); (document.querySelector('input[type="file"][accept="audio/*"]') as any)?.click(); }}
                isPublic={isPublic}
                setIsPublic={setIsPublic}
                isSelectedCoursePrivate={isSelectedCoursePrivate}
            />
            {/* Hidden input for LessonSidebar trigger */}
            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioFileChange} />

            <div className="flex flex-col grow overflow-hidden">
                <LessonForm 
                    title={title} setTitle={setTitle}
                    text={text} setText={setText}
                    activeTab={activeTab} setActiveTab={setActiveTab}
                    currentLang={currentLang}
                    selectedLevel={selectedLevel} setSelectedLevel={setSelectedLevel}
                    selectedCourseId={selectedCourseId} setSelectedCourseId={setSelectedCourseId}
                    allCourses={allCourses}
                    onShowCourseModal={onShowCourseModal}
                />
                
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
                    <button onClick={() => navigate(-1)} className="text-gray-400 font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100 transition-colors">Cancel</button>
                    <div className="flex items-center gap-3">
                        <button onClick={() => handleSave(false)} disabled={isSaving} className="border border-[#3890fc] text-[#3890fc] font-bold px-6 py-1.5 rounded-lg text-sm hover:bg-blue-50 transition-colors disabled:opacity-50">Save</button>
                        <button onClick={() => handleSave(true)} disabled={isSaving} className="bg-[#3890fc] text-white font-bold px-6 py-1.5 rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50">Save & Open</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
