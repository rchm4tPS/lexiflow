/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { useReaderStore } from '../store/useReaderStore';
import VocabularyView from './VocabularyView';
import { 
    LessonCardSkeleton, 
    CourseCardSkeleton, 
    SidebarWidgetSkeleton, 
    DailyGoalSkeleton 
} from '../components/ui/Skeletons';

import LessonCard from '../features/library/components/LessonCard';
import CourseCard from '../features/library/components/CourseCard';
import CourseSidebar from '../features/library/components/CourseSidebar';
import ContinueStudyingWidget from '../features/library/components/ContinueStudyingWidget';
import DailyGoalWidget from '../features/library/components/DailyGoalWidget';
import { Icons } from '../components/common/Icons';

// ─── Main LibraryView ────────────────────────────────────────────────────────
export default function LibraryView() {
    const {
        myLessons, completedLessons, languageCode, myCourses,
        fetchLibrary, fetchMyLessons, fetchGuidedCourses, fetchCourseDetails, fetchContinueStudying,
        clearActiveCourse, toggleLessonBookmark, checkAndUpdateCompletions,
        setMyLessonsSubTab, setLibrarySidebarTab, recalculateStats,
        guidedCourses, activeCourseDetails, librarySidebarTab, myLessonsSubTab
    } = useReaderStore();

    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);

    // ── Determine current state from URL PATH ─────────────────────────────────
    const pathParts = location.pathname.split('/'); 
    const view = pathParts[3] || 'library';
    const activeTab = view === 'course' ? 'library' : view;
    const subPath = pathParts[4]; 

    const currentFeed = (view === 'library' && subPath === 'guided') ? 'guided-course' : 'lesson-feed';
    const currentSubTab = (view === 'my-lessons' && subPath === 'completed') ? 'completed' : 'continue';
    const currentCourseId = view === 'course' ? subPath : null;

    // Sync store state with URL path
    useEffect(() => {
        if (currentFeed !== librarySidebarTab) setLibrarySidebarTab(currentFeed as any);
        if (currentSubTab !== myLessonsSubTab) setMyLessonsSubTab(currentSubTab as any);
    }, [currentFeed, currentSubTab, librarySidebarTab, myLessonsSubTab, setLibrarySidebarTab, setMyLessonsSubTab]);

    // Sync Course Details with path
    useEffect(() => {
        if (currentCourseId) {
            if (!activeCourseDetails || activeCourseDetails.course.id !== currentCourseId) {
                fetchCourseDetails(currentCourseId);
            }
        } else {
            if (activeCourseDetails) clearActiveCourse();
        }
    }, [currentCourseId, activeCourseDetails?.course?.id, fetchCourseDetails, clearActiveCourse]);

    useEffect(() => {
        const loadView = async () => {
            setIsLoading(true);
            try {
                await Promise.all([
                    checkAndUpdateCompletions(),
                    fetchContinueStudying(),
                    activeTab === 'library' && currentFeed === 'lesson-feed' ? fetchLibrary() : Promise.resolve(),
                    activeTab === 'library' && currentFeed === 'guided-course' ? fetchGuidedCourses() : Promise.resolve(),
                    activeTab === 'my-lessons' ? fetchMyLessons() : Promise.resolve()
                ]);
            } catch (err) {
                console.error("View loading failed", err);
            } finally {
                setTimeout(() => setIsLoading(false), 250);
            }
        };
        loadView();
    }, [activeTab, currentFeed, languageCode, fetchGuidedCourses, fetchLibrary, fetchMyLessons, checkAndUpdateCompletions, fetchContinueStudying]);

    useEffect(() => {
        recalculateStats();
    }, [recalculateStats, languageCode]);

    const currentLessonList = myLessonsSubTab === 'continue' ? myLessons : completedLessons;

    return (
        <div className="flex justify-center w-full min-h-[calc(100vh-64px)] bg-[#f3f4f6] font-nunito p-6">
            <div className="flex max-w-325 w-full gap-6">

                {/* LEFT MAIN AREA */}
                <div className="flex flex-col w-[72%]">

                    {/* Top Tabs — hidden when inside course detail view */}
                    {!activeCourseDetails && (
                        <div className="flex bg-white rounded-t-lg border-b border-gray-200 overflow-hidden shadow-sm font-bold text-gray-500 text-lg">
                            {['library', 'my-lessons', 'vocabulary'].map(tab => (
                                <div key={tab}
                                    onClick={() => {
                                        navigate(`/me/${languageCode}/${tab}`);
                                    }}
                                    className={`px-8 py-4 cursor-pointer capitalize transition-colors ${activeTab === tab ? 'border-b-4 border-[#3890fc] text-[#3890fc]' : 'hover:text-[#3890fc]'}`}
                                >
                                    {tab.replace('-', ' ')}
                                </div>
                            ))}

                            <div className="ml-auto flex items-center pr-4">
                                {activeTab === 'library' && (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search Entire Library"
                                            className="border border-gray-300 rounded px-4 py-1.5 text-sm font-medium outline-none focus:border-[#3890fc] w-64"
                                        />
                                        <span className="absolute right-3 top-2 text-gray-400">
                                            <Icons.Search size={16} />
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )} 

                    {/* Course detail header row */}
                    {activeCourseDetails && (
                        <div className="flex items-center bg-white rounded-t-lg border-b border-gray-200 shadow-sm px-6 py-4 relative">
                            <button
                                onClick={() => navigate(`/me/${languageCode}/library/guided`)}
                                className="flex items-center gap-1 text-gray-500 font-bold hover:text-[#3890fc] transition-colors text-sm z-10"
                            >
                                <Icons.Back size={16} /> Back
                            </button>
                            <h2 className="absolute left-0 right-0 text-center font-black text-gray-800 text-base pointer-events-none">
                                {activeCourseDetails.course.title}
                            </h2>
                        </div>
                    )}

                    {/* ── LIBRARY TAB ── */}
                    {activeTab === 'library' && (
                        <div className="flex bg-white rounded-b-lg shadow-sm min-h-150">
                            {!activeCourseDetails && (
                                <div className="w-[22%] border-r border-gray-500 flex flex-col font-bold text-gray-600 shrink-0">
                                    <Link
                                        to={`/me/${languageCode}/import`}
                                        className="flex items-center justify-center gap-1 font-bold px-5 py-3 m-2 rounded border-2 text-center transition border-blue-400 text-md text-blue-600 hover:border-[#3890fc] hover:text-[#3890fc] whitespace-nowrap"
                                    >
                                        <Icons.Plus size={18} /> Import
                                    </Link>
                                    <div
                                        onClick={() => navigate(`/me/${languageCode}/library`)}
                                        className={`px-5 py-4 border-t border-b border-blue-400 cursor-pointer hover:bg-gray-50 transition-colors ${librarySidebarTab === 'lesson-feed' ? 'bg-gray-100 border-l-4 border-[#3890fc] text-[#3890fc]' : ''}`}
                                    >
                                        Lesson Feed
                                    </div>
                                    <div
                                        onClick={() => navigate(`/me/${languageCode}/library/guided`)}
                                        className={`px-5 py-4 border-t border-b border-blue-400 cursor-pointer hover:bg-gray-50 transition-colors ${librarySidebarTab === 'guided-course' ? 'bg-gray-100 border-l-4 border-[#3890fc] text-[#3890fc]' : ''}`}
                                    >
                                        Guided Course
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-grow overflow-hidden">
                                {librarySidebarTab === 'lesson-feed' && !activeCourseDetails && (
                                    <div className="flex-grow px-4 pb-6 flex flex-col gap-4 bg-gray-50/30">
                                        <div className="border border-yellow-400 rounded w-fit mt-2 px-3 py-4 leading-[18px] text-sm font-bold text-gray-700 bg-white shadow-sm cursor-pointer whitespace-nowrap">
                                            Beginner 1 - Advanced 2 ▼
                                        </div>
                                        {isLoading ? (
                                            <div className="flex flex-col gap-4">
                                                {[1, 2, 3, 4].map(i => <LessonCardSkeleton key={i} />)}
                                            </div>
                                        ) : myCourses.length > 0 ? (
                                            myCourses.map((lesson) => (
                                                <LessonCard
                                                    key={lesson.id}
                                                    lesson={lesson}
                                                    onBookmark={toggleLessonBookmark}
                                                />
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
                                                <div className="text-blue-500">
                                                    <Icons.Lesson size={48} strokeWidth={1.5} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-700 text-lg">No lessons yet</p>
                                                    <p className="text-gray-400 text-sm mt-1">Import your first lesson to get started!</p>
                                                </div>
                                                <Link
                                                    to={`/me/${languageCode}/import`}
                                                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
                                                >
                                                    <Icons.Plus size={16} /> Import a Lesson
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {librarySidebarTab === 'guided-course' && !activeCourseDetails && (
                                    <div className="flex-grow p-4 bg-gray-50/30">
                                        {isLoading ? (
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                {[1, 2, 3, 4, 5, 6].map(i => <CourseCardSkeleton key={i} />)}
                                            </div>
                                        ) : guidedCourses.length === 0 ? (
                                            <div className="text-gray-400 text-center py-10">
                                                No guided courses available for this language yet. 📚
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                {guidedCourses.map(course => (
                                                    <CourseCard
                                                        key={course.id}
                                                        course={course}
                                                        onOpen={(id) => navigate(`/me/${languageCode}/course/${id}`)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeCourseDetails && (
                                    <div className="flex-grow p-4 flex flex-col gap-4 bg-gray-40/40">
                                        {isLoading ? (
                                            [1, 2, 3, 4].map(i => <LessonCardSkeleton key={i} />)
                                        ) : (
                                            activeCourseDetails.lessons.map((lesson: any) => (
                                                <LessonCard
                                                    key={lesson.id}
                                                    lesson={lesson}
                                                    isInsideCourse
                                                    onBookmark={toggleLessonBookmark}
                                                />
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── MY LESSONS TAB ── */}
                    {activeTab === 'my-lessons' && (
                        <div className="flex bg-white rounded-b-lg shadow-sm min-h-150">
                            <div className="w-[22%] border-r border-gray-400 flex flex-col font-bold text-gray-600 shrink-0">
                                <div
                                    onClick={() => navigate(`/me/${languageCode}/my-lessons`)}
                                    className={`px-5 py-4 border-t border-b border-blue-400 cursor-pointer hover:bg-gray-50 transition-colors ${myLessonsSubTab === 'continue' ? 'bg-gray-100 border-l-4 border-[#3890fc] text-[#3890fc]' : ''}`}
                                >
                                    Continue Studying
                                </div>
                                <div
                                    onClick={() => navigate(`/me/${languageCode}/my-lessons/completed`)}
                                    className={`px-5 py-4 border-t border-b border-blue-400 cursor-pointer hover:bg-gray-50 transition-colors ${myLessonsSubTab === 'completed' ? 'bg-gray-100 border-l-4 border-[#3890fc] text-[#3890fc]' : ''}`}
                                >
                                    Completed
                                    {completedLessons.length > 0 && (
                                        <span className="ml-2 bg-green-100 text-green-600 text-xs px-1.5 py-0.5 rounded-full">
                                            {completedLessons.length}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-grow p-6 flex flex-col gap-4 bg-gray-50/30">
                                {isLoading ? (
                                    [1, 2, 3, 4].map(i => <LessonCardSkeleton key={i} />)
                                ) : currentLessonList.length === 0 ? (
                                    <div className="text-gray-400 text-center py-10">
                                        {myLessonsSubTab === 'continue'
                                            ? "You haven't started any lessons yet! Go to the Library to begin."
                                            : "No completed lessons yet. Keep studying! 🎯"
                                        }
                                    </div>
                                ) : (
                                    currentLessonList.map(lesson => (
                                        <LessonCard
                                            key={lesson.id}
                                            lesson={lesson}
                                            onBookmark={toggleLessonBookmark}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── VOCABULARY TAB ── */}
                    {activeTab === 'vocabulary' && <VocabularyView />}
                </div>

                {/* RIGHT SIDEBAR */}
                <div className="flex flex-col w-[28%] gap-6">
                    {isLoading ? (
                        <>
                            <SidebarWidgetSkeleton title="Continue Studying" count={1} />
                            <DailyGoalSkeleton />
                        </>
                    ) : activeCourseDetails ? (
                        <CourseSidebar course={activeCourseDetails.course} />
                    ) : (
                        <>
                            <ContinueStudyingWidget />
                            <DailyGoalWidget />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}