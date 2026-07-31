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
import LevelRangeDropdown from '../features/library/components/LevelRangeDropdown';
import CourseInfoDrawer from '../features/library/components/CourseInfoDrawer';
import { Icons } from '../constants/icons';

// ─── Main LibraryView ────────────────────────────────────────────────────────
export default function LibraryView() {
    const {
        myLessons, completedLessons, languageCode, myCourses,
        fetchLibrary, fetchMyLessons, fetchGuidedCourses, fetchCourseDetails, fetchContinueStudying,
        clearActiveCourse, toggleLessonBookmark, checkAndUpdateCompletions,
        setMyLessonsSubTab, setLibrarySidebarTab, recalculateStats,
        guidedCourses, activeCourseDetails, librarySidebarTab, myLessonsSubTab,
        librarySearch, setLibrarySearch, isStatsLoading, minLevelIndex, maxLevelIndex
    } = useReaderStore();

    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);
    const [showCourseDrawer, setShowCourseDrawer] = useState(false);
    const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

    // ── Determine current state from URL PATH ─────────────────────────────────
    const pathParts = location.pathname.split('/'); 
    const view = pathParts[3] || 'library';
    const activeTab = view === 'course' ? 'library' : view;
    const subPath = pathParts[4]; 

    const currentFeed = (view === 'library' && subPath === 'guided') ? 'guided-course' : (view === 'course' ? librarySidebarTab : 'lesson-feed');
    const currentSubTab = (view === 'my-lessons' && subPath === 'completed') ? 'completed' : 'continue';
    const currentCourseId = view === 'course' ? subPath : null;

    const [searchTerm, setSearchTerm] = useState(librarySearch);

    // Debounce search update to store
    useEffect(() => {
        const handler = setTimeout(() => {
            setLibrarySearch(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm, setLibrarySearch]);

    // Sync store state with URL path
    useEffect(() => {
        if (view !== 'course' && currentFeed !== librarySidebarTab) {
            setLibrarySidebarTab(currentFeed as 'lesson-feed' | 'guided-course');
        }
        if (currentSubTab !== myLessonsSubTab) setMyLessonsSubTab(currentSubTab as 'continue' | 'completed');
    }, [currentFeed, currentSubTab, librarySidebarTab, myLessonsSubTab, setLibrarySidebarTab, setMyLessonsSubTab, view]);

    // Sync Course Details with path
    useEffect(() => {
        if (currentCourseId) {
            if (!activeCourseDetails || activeCourseDetails.course.id !== currentCourseId) {
                fetchCourseDetails(currentCourseId);
            }
        } else {
            if (activeCourseDetails) clearActiveCourse();
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [currentCourseId, activeCourseDetails, fetchCourseDetails, clearActiveCourse]);

    useEffect(() => {
        const loadView = async () => {
            // Only show full skeleton loader on tab/feed/language switch
            setIsLoading(prev => (guidedCourses.length === 0 && myCourses.length === 0) ? true : prev);
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
                setIsLoading(false);
            }
        };
        loadView();
    }, [activeTab, currentFeed, languageCode, librarySearch, minLevelIndex, maxLevelIndex, fetchGuidedCourses, fetchLibrary, fetchMyLessons, checkAndUpdateCompletions, fetchContinueStudying]);

    useEffect(() => {
        recalculateStats();
    }, [recalculateStats, languageCode]);

    const currentLessonList = myLessonsSubTab === 'continue' ? myLessons : completedLessons;

    return (
        <div className="flex justify-center w-full min-h-0 bg-[#f3f4f6] font-nunito p-0 sm:p-4 xl:p-6">
            <div className="flex max-w-325 w-full gap-4 xl:gap-6 flex-col xl:flex-row">

                {/* LEFT MAIN AREA */}
                <div className="flex flex-col w-full xl:w-[72%]">

                    {/* DESKTOP TOP TABS — hidden on mobile (< 1280px) and when inside course detail view */}
                    {!activeCourseDetails && (
                        <div className="hidden xl:flex bg-white rounded-t-lg border-b border-gray-200 overflow-hidden shadow-sm font-bold text-gray-500 text-lg">
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
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
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

                    {/* STICKY MOBILE CONTROLS (< 1280px) */}
                    {!activeCourseDetails && activeTab === 'library' && (
                        <div className="sticky top-0 px-3 sm:px-4 pt-3 pb-3 z-30 bg-[#f3f4f6] border-b border-gray-200/80 shadow-sm mb-4 xl:hidden">
                            <div className="bg-white rounded-xl p-1 border border-gray-200 shadow-sm flex font-bold text-xs sm:text-sm text-gray-500 mb-2.5">
                                <button
                                    onClick={() => navigate(`/me/${languageCode}/library`)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-center transition-all cursor-pointer ${
                                        librarySidebarTab === 'lesson-feed'
                                            ? 'bg-[#3890fc] text-white font-extrabold shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    Lesson Feed
                                </button>
                                <button
                                    onClick={() => navigate(`/me/${languageCode}/library/guided`)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-center transition-all cursor-pointer ${
                                        librarySidebarTab === 'guided-course'
                                            ? 'bg-[#3890fc] text-white font-extrabold shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    Guided Course
                                </button>
                            </div>

                            {/* MOBILE SEARCH & LEVEL RANGE DROPDOWN */}
                            <div className="flex items-center justify-between gap-2 w-full">
                                {/* Search Input Container */}
                                <div className={`relative transition-all duration-200 ${
                                    isMobileSearchExpanded ? 'w-full flex-1' : 'hidden min-[425px]:flex min-[425px]:flex-1'
                                }`}>
                                    <input
                                        type="text"
                                        placeholder="Search Entire Library"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus={isMobileSearchExpanded}
                                        className="w-full border border-gray-300 rounded-lg pl-3.5 pr-9 py-2 text-sm font-medium outline-none focus:border-[#3890fc] bg-white shadow-sm h-[38px]"
                                    />
                                    {isMobileSearchExpanded ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsMobileSearchExpanded(false);
                                                setSearchTerm('');
                                                setLibrarySearch('');
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
                                            title="Close search"
                                        >
                                            <Icons.X size={16} />
                                        </button>
                                    ) : (
                                        <span className="absolute right-3 top-2.5 text-gray-400 pointer-events-none">
                                            <Icons.Search size={16} />
                                        </span>
                                    )}
                                </div>

                                {/* Collapsed Search Icon Button (< 425px) */}
                                {!isMobileSearchExpanded && (
                                    <button
                                        type="button"
                                        onClick={() => setIsMobileSearchExpanded(true)}
                                        className="min-[425px]:hidden h-[38px] w-[38px] flex items-center justify-center bg-white border border-gray-300 rounded-lg shadow-sm text-gray-600 hover:text-[#3890fc] hover:border-[#3890fc] cursor-pointer shrink-0"
                                        title="Search Library"
                                    >
                                        <Icons.Search size={18} />
                                    </button>
                                )}

                                {/* Level Range Dropdown (hidden when mobile search is expanded) */}
                                {librarySidebarTab === 'lesson-feed' && !isMobileSearchExpanded && (
                                    <div className="shrink-0 flex items-center ml-auto">
                                        <LevelRangeDropdown />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STICKY MOBILE SUBTABS FOR MY LESSONS (< 1280px) */}
                    {!activeCourseDetails && activeTab === 'my-lessons' && (
                        <div className="sticky top-0 px-3 sm:px-4 pt-3 pb-3 z-30 bg-[#f3f4f6] border-b border-gray-200/80 shadow-sm mb-4 xl:hidden">
                            <div className="bg-white rounded-xl p-1 border border-gray-200 shadow-sm flex font-bold text-xs sm:text-sm text-gray-500">
                                <button
                                    onClick={() => navigate(`/me/${languageCode}/my-lessons`)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-center transition-all cursor-pointer ${
                                        myLessonsSubTab === 'continue'
                                            ? 'bg-[#3890fc] text-white font-extrabold shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    Continue Studying
                                </button>
                                <button
                                    onClick={() => navigate(`/me/${languageCode}/my-lessons/completed`)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-center transition-all cursor-pointer ${
                                        myLessonsSubTab === 'completed'
                                            ? 'bg-[#3890fc] text-white font-extrabold shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    Completed
                                    {completedLessons.length > 0 && (
                                        <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                            {completedLessons.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Resilient Course detail header row with Info Drawer button */}
                    {activeCourseDetails && (
                        <div className="flex items-center justify-between bg-white rounded-xl sm:rounded-t-xl border-b border-gray-200 shadow-sm px-3 sm:px-6 py-3 sm:py-4 gap-2 mb-4 xl:mb-0">
                            <button
                                onClick={() => navigate(`/me/${languageCode}/library/guided`)}
                                className="flex items-center gap-1.5 text-gray-600 font-extrabold hover:text-[#3890fc] transition-colors text-sm shrink-0 bg-gray-100 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-lg cursor-pointer"
                            >
                                <Icons.Back size={18} />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                            
                            <h2 className="font-black text-gray-800 text-sm sm:text-base text-center truncate flex-1 min-w-0 px-2">
                                {activeCourseDetails.course.title}
                            </h2>

                            <button
                                onClick={() => setShowCourseDrawer(true)}
                                className="flex xl:hidden items-center justify-center text-gray-500 hover:text-[#3890fc] hover:bg-blue-50 p-2 rounded-full transition-colors shrink-0 cursor-pointer"
                                title="Course Details & Info"
                            >
                                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </button>

                            {/* Course Info Drawer */}
                            <CourseInfoDrawer
                                course={activeCourseDetails.course}
                                isOpen={showCourseDrawer}
                                onClose={() => setShowCourseDrawer(false)}
                            />
                        </div>
                    )}

                    {/* ── LIBRARY TAB ── */}
                    {activeTab === 'library' && (
                        <div className="flex bg-white rounded-xl xl:rounded-b-lg shadow-sm xl:min-h-120">
                            {!activeCourseDetails && (
                                <div className="hidden xl:flex w-[22%] border-r border-gray-200 flex-col font-bold text-gray-600 shrink-0">
                                    <Link
                                        to={`/me/${languageCode}/import`}
                                        className="flex items-center justify-center gap-1 font-bold px-5 py-3 m-2 rounded border-2 text-center transition border-blue-400 text-md text-blue-600 hover:border-[#3890fc] hover:text-[#3890fc] whitespace-nowrap"
                                    >
                                        <Icons.Plus size={18} /> Import
                                    </Link>
                                    <div
                                        onClick={() => navigate(`/me/${languageCode}/library`)}
                                        className={`px-5 py-4 border-t border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${librarySidebarTab === 'lesson-feed' ? 'bg-gray-100 border-l-4 border-[#3890fc] text-[#3890fc]' : ''}`}
                                    >
                                        Lesson Feed
                                    </div>
                                    <div
                                        onClick={() => navigate(`/me/${languageCode}/library/guided`)}
                                        className={`px-5 py-4 border-t border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${librarySidebarTab === 'guided-course' ? 'bg-gray-100 border-l-4 border-[#3890fc] text-[#3890fc]' : ''}`}
                                    >
                                        Guided Course
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-grow overflow-hidden">
                                {view === 'course' && !activeCourseDetails ? (
                                    <div className="flex-grow p-4 flex flex-col gap-4 bg-gray-50/30">
                                        <div className="bg-white rounded-xl p-4 shadow-sm animate-pulse space-y-2">
                                            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                                            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                                        </div>
                                        {[1, 2, 3].map(i => <LessonCardSkeleton key={i} />)}
                                    </div>
                                ) : librarySidebarTab === 'lesson-feed' && !activeCourseDetails && (
                                    <div className="flex-grow p-3 sm:p-4 pb-6 flex flex-col gap-4 bg-gray-50/30">
                                        <div className="hidden xl:block">
                                            <LevelRangeDropdown />
                                        </div>
                                        {isLoading ? (
                                            <div className="flex flex-col gap-4 w-full max-w-full lg:max-w-screen-lg xl:max-w-full mx-auto xl:mx-0">
                                                {[1, 2, 3, 4].map(i => <LessonCardSkeleton key={i} />)}
                                            </div>
                                        ) : myCourses.length > 0 ? (
                                            <div className="flex flex-col gap-4 w-full max-w-full lg:max-w-screen-lg xl:max-w-full mx-auto xl:mx-0">
                                                {myCourses.map((lesson) => (
                                                    <LessonCard
                                                        key={lesson.id}
                                                        lesson={lesson}
                                                        onBookmark={toggleLessonBookmark}
                                                    />
                                                ))}
                                            </div>
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
                                    <div className="flex-grow p-3 sm:p-4 bg-gray-50/30">
                                        {isLoading ? (
                                            <div className="grid grid-cols-1 min-[425px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1440px]:grid-cols-4 gap-4">
                                                {[1, 2, 3, 4, 5, 6].map(i => <CourseCardSkeleton key={i} />)}
                                            </div>
                                        ) : guidedCourses.length === 0 ? (
                                            <div className="text-gray-400 text-center py-10">
                                                No guided courses available for this language yet. 📚
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 min-[425px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1440px]:grid-cols-4 gap-4">
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
                                    <div className="flex-grow p-3 sm:p-4 flex flex-col gap-4 bg-gray-40/40">
                                        {isLoading ? (
                                            <div className="flex flex-col gap-4 w-full max-w-full lg:max-w-screen-lg xl:max-w-full mx-auto xl:mx-0">
                                                {[1, 2, 3, 4].map(i => <LessonCardSkeleton key={i} />)}
                                            </div>
                                        ) : (activeCourseDetails.lessons || []).length > 0 ? (
                                            <div className="flex flex-col gap-4 w-full max-w-full lg:max-w-screen-lg xl:max-w-full mx-auto xl:mx-0">
                                                {(activeCourseDetails.lessons || []).map((lesson) => (
                                                    <LessonCard
                                                        key={lesson.id}
                                                        lesson={lesson}
                                                        isInsideCourse
                                                        onBookmark={toggleLessonBookmark}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                                                <div className="text-blue-500">
                                                    <Icons.Lesson size={48} strokeWidth={1.5} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-700 text-lg">This course currently has no lessons.</p>
                                                    <p className="text-gray-400 text-sm mt-1">Import or add a lesson to this course to get started!</p>
                                                </div>
                                                <Link
                                                    to={`/me/${languageCode}/import`}
                                                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition mt-2 shadow-sm"
                                                >
                                                    <Icons.Plus size={16} /> Import a Lesson
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── MY LESSONS TAB ── */}
                    {activeTab === 'my-lessons' && (
                        <div className="flex bg-white rounded-xl xl:rounded-b-lg shadow-sm xl:min-h-120">
                            <div className="hidden xl:flex w-[22%] border-r border-gray-200 flex-col font-bold text-gray-600 shrink-0">
                                <div
                                    onClick={() => navigate(`/me/${languageCode}/my-lessons`)}
                                    className={`px-5 py-4 border-t border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${myLessonsSubTab === 'continue' ? 'bg-gray-100 border-l-4 border-[#3890fc] text-[#3890fc]' : ''}`}
                                >
                                    Continue Studying
                                </div>
                                <div
                                    onClick={() => navigate(`/me/${languageCode}/my-lessons/completed`)}
                                    className={`px-5 py-4 border-t border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${myLessonsSubTab === 'completed' ? 'bg-gray-100 border-l-4 border-[#3890fc] text-[#3890fc]' : ''}`}
                                >
                                    Completed
                                    {completedLessons.length > 0 && (
                                        <span className="ml-2 bg-green-100 text-green-600 text-xs px-1.5 py-0.5 rounded-full">
                                            {completedLessons.length}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-grow p-3 sm:p-6 bg-gray-50/30">
                                {isLoading ? (
                                    <div className="flex flex-col gap-4 w-full max-w-full lg:max-w-screen-lg xl:max-w-full mx-auto xl:mx-0">
                                        {[1, 2, 3, 4].map(i => <LessonCardSkeleton key={i} />)}
                                    </div>
                                ) : currentLessonList.length === 0 ? (
                                    <div className="text-gray-400 text-center py-10">
                                        {myLessonsSubTab === 'continue'
                                            ? "You haven't started any lessons yet! Go to the Library to begin."
                                            : "No completed lessons yet. Keep studying! 🎯"
                                        }
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4 w-full max-w-full lg:max-w-screen-lg xl:max-w-full mx-auto xl:mx-0">
                                        {currentLessonList.map(lesson => (
                                            <LessonCard
                                                key={lesson.id}
                                                lesson={lesson}
                                                onBookmark={toggleLessonBookmark}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── VOCABULARY TAB ── */}
                    {activeTab === 'vocabulary' && <VocabularyView />}
                </div>

                {/* RIGHT SIDEBAR — DESKTOP ONLY (>= 1280px) */}
                <div className="hidden xl:flex flex-col w-[28%] gap-6">
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
                            {isStatsLoading ? <DailyGoalSkeleton /> : <DailyGoalWidget />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}