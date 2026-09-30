// TODO: [RESPONSIVE] Halaman Import Lesson belum responsive (termasuk layout tab, padding, dan susunan elemen di viewport mobile/tablet).
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
        /* min-h, not h: the card should be at least a viewport tall, but when the
           form grows taller than that it must be allowed to expand so the whole
           page scrolls in <main> instead of the footer being clipped away by the
           overflow-hidden below. */
        <div className="flex justify-center w-full min-h-[calc(100vh-64px)] bg-[#f3f4f6] font-nunito p-6 overflow-hidden">
            {/* h-full removed: the parent is a flex row, so this child already
                stretches to its height. Keeping a percentage height here would
                resolve against an auto-height parent once min-h lets it grow. */}
            <div className="flex flex-col max-w-280 w-full">

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