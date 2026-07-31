// TODO: [RESPONSIVE] Sub-tab LingQ Import belum responsive untuk layar mobile/tablet.
import { useState } from 'react';
import Swal from 'sweetalert2';
import { useReaderStore } from '../../../store/useReaderStore';
import { Icons } from '../../../constants/icons';
import { Loader, ChevronDown, ChevronRight, Trash2, Check } from 'lucide-react';
import { useEffect } from 'react';

interface LingqImportStepProps {
    importFromLingq: (apiKey: string, selectedLessons: any[]) => Promise<{ success: boolean; count: number }>;
    onSuccess: () => void;
}

export default function LingqImportStep({ importFromLingq, onSuccess }: LingqImportStepProps) {
    const { fetchLingqRecommendedCourses, fetchLingqCourseLessons, fetchLingqImportedIds } = useReaderStore();
    const [lingqApiKey, setLingqApiKey] = useState('');
    const [courses, setCourses] = useState<any[]>([]);
    const [coursePage, setCoursePage] = useState(1);
    const [lessonsByCourse, setLessonsByCourse] = useState<Record<string, any[]>>({});
    const [pagesByCourse, setPagesByCourse] = useState<Record<string, number>>({});
    const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
    const [selectedLessons, setSelectedLessons] = useState<any[]>([]);
    
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [isLoadingLessons, setIsLoadingLessons] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, lessonName: '' });
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [existingLingqIds, setExistingLingqIds] = useState<Set<number>>(new Set());
    const [importedToday, setImportedToday] = useState(0);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            try {
                const importedData = await fetchLingqImportedIds();
                if (isMounted) {
                    setExistingLingqIds(new Set(importedData.importedIds));
                    setImportedToday(importedData.importedToday);
                }
            } catch (err) {
                console.error("Failed to load imported ids on mount", err);
            } finally {
                if (isMounted) setIsInitializing(false);
            }
        };
        init();
        return () => { isMounted = false; };
    }, [fetchLingqImportedIds]);

    const loadCourses = async (apiKey?: string) => {
        if (importedToday >= 10) return;
        
        setIsLoadingCourses(true);
        try {
            const data = await fetchLingqRecommendedCourses(apiKey || lingqApiKey);
            const newCourses = Array.isArray(data) ? data : ((data as any).results || []);
            setCourses(newCourses);
            setCoursePage(1);
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Failed to load courses',
                text: error.message || 'Unknown error occurred.',
            });
        } finally {
            setIsLoadingCourses(false);
        }
    };

    const toggleCourse = async (course: any) => {
        const id = course.id;
        if (expandedCourseId === id) {
            setExpandedCourseId(null);
            return;
        }
        
        setExpandedCourseId(id);
        
        if (!lessonsByCourse[id]) {
            await loadLessons(course);
        }
    };

    const loadLessons = async (course: any) => {
        setIsLoadingLessons(course.id);
        try {
            const data = await fetchLingqCourseLessons(course.id, lingqApiKey);
            const newLessons = Array.isArray(data) ? data : ((data as any).results || []);
            
            setLessonsByCourse(prev => ({
                ...prev,
                [course.id]: newLessons
            }));
            setPagesByCourse(prev => ({ ...prev, [course.id]: 1 }));
        } catch (error: any) {
             Swal.fire({
                icon: 'error',
                title: 'Failed to load lessons',
                text: error.message || 'Unknown error occurred.',
            });
        } finally {
            setIsLoadingLessons(null);
        }
    };

    const handleLoadMoreLessons = (courseId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPagesByCourse(prev => ({ ...prev, [courseId]: (prev[courseId] || 1) + 1 }));
    };

    const handleLessonToggle = (course: any, lesson: any) => {
        if (importedToday + selectedLessons.length >= 10 && !selectedLessons.some(l => l.lessonId === lesson.id)) {
            Swal.fire({
                icon: 'warning',
                title: 'Limit Reached',
                text: 'You cannot select more than 10 lessons to import for today.',
                confirmButtonColor: '#3890fc'
            });
            return;
        }

        const isSelected = selectedLessons.some(l => l.lessonId === lesson.id);
        if (isSelected) {
            setSelectedLessons(prev => prev.filter(l => l.lessonId !== lesson.id));
        } else {
            if (selectedLessons.length >= 10) {
                Swal.fire({ icon: 'warning', text: 'You can only select up to 10 lessons per import batch.' });
                return;
            }
            setSelectedLessons(prev => [...prev, {
                courseId: course.id,
                courseTitle: course.title,
                courseDescription: course.description,
                courseLevel: course.level,
                courseImageUrl: course.image,
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                lessonDescription: lesson.description,
                lessonImageUrl: lesson.image_url,
                lessonAudioUrl: lesson.audio,
                lessonDuration: lesson.duration
            }]);
        }
    };

    const removeLesson = (lessonId: number) => {
        setSelectedLessons(prev => prev.filter(l => l.lessonId !== lessonId));
    };

    const handleLingqImport = async () => {
        if (selectedLessons.length === 0) return;
        
        setIsImporting(true);
        let successCount = 0;
        
        for (let i = 0; i < selectedLessons.length; i++) {
            const lesson = selectedLessons[i];
            setImportProgress({ current: i, total: selectedLessons.length, lessonName: lesson.lessonTitle });
            
            try {
                const res = await importFromLingq(lingqApiKey, [lesson]);
                if (res.success) {
                    successCount += res.count;
                    
                    // Dynamically update UI for this lesson
                    setSelectedLessons(prev => prev.filter(l => l.lessonId !== lesson.lessonId));
                    setExistingLingqIds(prev => new Set([...prev, lesson.lessonId]));
                    setImportedToday(prev => prev + 1);
                }
            } catch (err: any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Import Interrupted',
                    text: `Failed at lesson "${lesson.lessonTitle}": ${err.message}`,
                    confirmButtonColor: '#3890fc',
                });
                setIsImporting(false);
                return; // Stop loop on failure and exit
            }
        }
        
        setImportProgress({ current: selectedLessons.length, total: selectedLessons.length, lessonName: 'Complete!' });
        
        if (successCount > 0) {
            await Swal.fire({
                icon: 'success',
                title: 'Import Successful!',
                text: `Successfully imported ${successCount} lessons from LingQ.`,
                confirmButtonColor: '#3890fc',
            });
            onSuccess();
        }
        
        setIsImporting(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] rounded-b-xl overflow-hidden relative">
            
            {/* Import Progress Overlay */}
            {isImporting && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-8 backdrop-blur-sm touch-none overscroll-none"
                    style={{ touchAction: 'none' }}
                    onTouchMove={(e) => e.preventDefault()}
                >
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center">
                        <Loader className="animate-spin text-orange-500 mb-4" size={48} />
                        <h3 className="text-xl font-black text-gray-800 mb-2">Importing Lessons</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">
                            Please wait while we parse and import your lessons. Do not close this window.
                        </p>
                        
                        <div className="w-full">
                            <div className="flex justify-between items-end text-xs font-bold text-gray-600 mb-2">
                                <span className="truncate max-w-[80%]">{importProgress.lessonName}</span>
                                <span className="shrink-0">{importProgress.current} / {importProgress.total}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className="bg-orange-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header info */}
            <div className="px-8 py-4 bg-white border-b border-gray-100 shrink-0 flex flex-col transition-all">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-800">Import from LingQ</h2>
                    <button 
                        onClick={() => setIsHeaderVisible(!isHeaderVisible)}
                        className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        {isHeaderVisible ? 'Hide Info' : 'Show Info'}
                    </button>
                </div>

                {isHeaderVisible && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-sm text-gray-500 max-w-xl">
                            Browse recommended courses and select the exact lessons you want to learn. You can import up to 10 lessons per day.
                        </p>
                        <div className="mt-4 max-w-sm">
                            {isInitializing ? (
                                <div className="h-10 bg-gray-100 animate-pulse rounded-lg w-full"></div>
                            ) : importedToday >= 10 ? (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-bold flex flex-col">
                                    <span>Daily quota exceeded (10/10 lessons imported today).</span>
                                    <span className="font-normal text-xs mt-1">Please come back tomorrow to import more lessons.</span>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <input
                                        type="password"
                                        placeholder="LingQ API Key (Optional fallback)"
                                        value={lingqApiKey}
                                        onChange={(e) => setLingqApiKey(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                                    />
                                    <button 
                                        onClick={() => loadCourses(lingqApiKey)}
                                        className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-lg transition-colors"
                                    >
                                        Fetch Courses
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Two Pane Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Pane A: Courses List */}
                <div className="flex-1 overflow-y-auto p-8 border-r border-gray-200 bg-white">
                {isLoadingCourses ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader size={32} className="animate-spin text-orange-400" />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">
                        {importedToday >= 10 ? 'You have reached your daily limit of 10 imports.' : 'No recommended courses found. Try fetching courses.'}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {courses.slice(0, coursePage * 10).map(course => (
                            <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Course Row (Header) */}
                                <div 
                                    className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => toggleCourse(course)}
                                >
                                    <img src={course.image || 'https://via.placeholder.com/150'} alt={course.title} className="w-14 h-14 rounded-lg object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-800 text-base truncate">{course.title}</h3>
                                        {course.description && (
                                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                                                {course.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                {course.level || 'Unknown Level'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {expandedCourseId !== course.id && (() => {
                                            const count = selectedLessons.filter(l => l.courseId === course.id).length;
                                            if (count === 0) return null;
                                            return (
                                                <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                                    {count} Selected
                                                </span>
                                            );
                                        })()}
                                        <div className="text-gray-400">
                                            {expandedCourseId === course.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Lessons Accordion Body */}
                                {expandedCourseId === course.id && (
                                    <div className="border-t border-gray-100 bg-[#fbfcfd] p-4">
                                        {isLoadingLessons === course.id && (!lessonsByCourse[course.id] || lessonsByCourse[course.id].length === 0) ? (
                                            <div className="py-4 text-center"><Loader size={20} className="animate-spin text-orange-400 inline" /></div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                {(lessonsByCourse[course.id] || []).slice(0, (pagesByCourse[course.id] || 1) * 10).map(lesson => {
                                                    const isImported = existingLingqIds.has(lesson.id);
                                                    const isSelected = selectedLessons.some(l => l.lessonId === lesson.id);
                                                    const hasAudio = !!(lesson.audio || lesson.audio_url || lesson.has_audio);
                                                    const wordCount = lesson.new_word_count ?? lesson.newWordsCount ?? lesson.new_words_count ?? lesson.wordsCount ?? lesson.wordCount;
                                                    const formattedDuration = lesson.duration > 0 ? `${Math.floor(lesson.duration / 60).toString().padStart(2, '0')}:${Math.floor(lesson.duration % 60).toString().padStart(2, '0')}` : null;
                                                    
                                                    return (
                                                        <label 
                                                            key={lesson.id} 
                                                            className={`flex items-center gap-4 p-3 rounded-lg border ${isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white'} ${isImported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'} transition-all`}
                                                        >
                                                            <div className="flex-shrink-0">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                                                                    checked={isImported ? true : isSelected}
                                                                    disabled={isImported}
                                                                    onChange={() => handleLessonToggle(course, lesson)}
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-gray-800 text-sm truncate flex items-center gap-2">
                                                                    {lesson.title}
                                                                    {isImported && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 rounded uppercase tracking-wider">Imported</span>}
                                                                </div>
                                                                {lesson.description && (
                                                                    <div className="text-xs text-gray-500 truncate mt-0.5">{lesson.description}</div>
                                                                )}
                                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] font-semibold">
                                                                    <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                                                        hasAudio 
                                                                            ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                                                            : 'bg-gray-100 text-gray-400'
                                                                    }`}>
                                                                        {hasAudio ? '🎵 Audio Available' : '🚫 No Audio'}
                                                                    </span>

                                                                    {wordCount !== undefined && (
                                                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                                                                            ⚡ {wordCount} words
                                                                        </span>
                                                                    )}

                                                                    {formattedDuration && (
                                                                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                                                                            ⏱ {formattedDuration}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}

                                                {((pagesByCourse[course.id] || 1) * 10) < (lessonsByCourse[course.id] || []).length && (
                                                    <button 
                                                        onClick={(e) => handleLoadMoreLessons(course.id, e)}
                                                        className="mt-2 py-2 text-xs font-bold text-[#3890fc] hover:bg-blue-50 rounded-lg transition-colors flex justify-center items-center gap-2"
                                                    >
                                                        Load More Lessons
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {courses.length > 0 && (coursePage * 10) < courses.length && (
                            <button 
                                onClick={() => setCoursePage(p => p + 1)}
                                className="mt-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors flex justify-center items-center gap-2"
                            >
                                Load More Courses
                            </button>
                        )}
                    </div>
                )}
                </div>

                {/* Pane B: Selected Lessons */}
                <div className="w-[45%] bg-[#fbfcfd] overflow-y-auto p-8 flex flex-col">
                    <h3 className="font-black text-gray-800 text-lg mb-4 flex items-center justify-between">
                        <span>Selected Lessons</span>
                        {selectedLessons.length > 0 && (
                            <span className="text-sm font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">
                                {selectedLessons.length} / 10
                            </span>
                        )}
                    </h3>

                    {selectedLessons.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                <Check size={24} className="text-gray-300" />
                            </div>
                            <p className="text-sm text-center">No lessons selected yet.<br/>Choose some lessons from the left pane.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {selectedLessons.map(lesson => (
                                <div key={lesson.lessonId} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative group hover:border-orange-200 transition-colors">
                                    <button
                                        onClick={() => removeLesson(lesson.lessonId)}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                        title="Remove Lesson"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    
                                    <div className="pr-10">
                                        <h4 className="font-bold text-gray-800 text-sm mb-1">{lesson.lessonTitle}</h4>
                                        <div className="flex items-center gap-2">
                                            {lesson.courseImageUrl && (
                                                <img src={lesson.courseImageUrl} alt={lesson.courseTitle} className="w-4 h-4 rounded object-cover" />
                                            )}
                                            <span className="text-xs text-gray-500 truncate">{lesson.courseTitle}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Floating Action Bar */}
            <div className="bg-white border-t border-gray-200 p-4 shrink-0 flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">
                        {selectedLessons.length} / 10
                    </span>
                    <span className="text-gray-500 text-sm">lessons selected</span>
                </div>
                <button
                    onClick={handleLingqImport}
                    disabled={selectedLessons.length === 0 || isImporting}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-sm transition-all ${selectedLessons.length === 0 || isImporting ? 'bg-gray-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:shadow-md'}`}
                >
                    {isImporting ? <Loader size={18} className="animate-spin" /> : <Icons.Plus size={18} />}
                    {isImporting ? 'Importing...' : 'Import Selected'}
                </button>
            </div>
        </div>
    );
}
