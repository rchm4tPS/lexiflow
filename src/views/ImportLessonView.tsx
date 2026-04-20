import { useEffect, useState } from 'react';
import { useReaderStore } from '../store/useReaderStore';
import CreateCourseModal from '../features/import/components/CreateCourseModal';
import LingqImportStep from '../features/import/components/LingqImportStep';
import ManualImportForm from '../features/import/components/ManualImportForm';
import type { Course } from '../types/reader';

export default function ImportLessonView() {
    const {
        myCoursesDropdown,
        fetchMyCoursesDropdown,
        createCourse, importLesson, languageCode,
        hasImportedFromLingq, importFromLingq
    } = useReaderStore();

    const [showCourseModal, setShowCourseModal] = useState(false);
    const [importMode, setImportMode] = useState<'manual' | 'lingq'>('manual');

    // Filter duplicates just in case
    const allCourses = Array.from(
        new Map((myCoursesDropdown || []).map((c: Course) => [c.id, c])).values()
    );

    useEffect(() => {
        fetchMyCoursesDropdown();
    }, [fetchMyCoursesDropdown]);

    return (
        <div className="flex justify-center w-full h-[calc(100vh-64px)] bg-[#f3f4f6] font-nunito p-6 overflow-hidden">
            <div className="flex flex-col max-w-280 w-full h-full">

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col grow overflow-hidden animate-in fade-in zoom-in duration-300">
                    {/* Top header row */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black text-gray-800">Import Lesson</h1>
                            {!hasImportedFromLingq && (
                                <div className="flex gap-4 mt-2">
                                    <button
                                        onClick={() => setImportMode('manual')}
                                        className={`text-sm font-bold pb-1 transition-all ${importMode === 'manual' ? 'text-[#3890fc] border-b-2 border-[#3890fc]' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Manual Entry
                                    </button>
                                    <button
                                        onClick={() => setImportMode('lingq')}
                                        className={`text-sm font-bold pb-1 transition-all ${importMode === 'lingq' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        LingQ API Import
                                    </button>
                                </div>
                            )}
                        </div>
                        <button className="border border-gray-300 text-gray-600 text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                            Import Ebook
                        </button>
                    </div>

                    {importMode === 'lingq' && !hasImportedFromLingq ? (
                        <LingqImportStep 
                            importFromLingq={importFromLingq} 
                            onSuccess={() => setImportMode('manual')} 
                        />
                    ) : (
                        <ManualImportForm 
                            languageCode={languageCode}
                            allCourses={allCourses}
                            onShowCourseModal={() => setShowCourseModal(true)}
                            importLesson={importLesson}
                        />
                    )}
                </div>
            </div>

            {showCourseModal && (
                <CreateCourseModal 
                    onClose={() => setShowCourseModal(false)}
                    onCreate={() => {
                        setShowCourseModal(false);
                        fetchMyCoursesDropdown();
                    }}
                    createCourse={createCourse}
                />
            )}
        </div>
    );
}