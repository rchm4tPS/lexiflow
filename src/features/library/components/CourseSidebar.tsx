import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useReaderStore } from '../../../store/useReaderStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatDuration } from '../../../utils/time';

import type { Course } from '../../../types/reader';

interface CourseSidebarProps {
    course: Course;
}

export default function CourseSidebar({ course }: CourseSidebarProps) {
    const completionPct = course.completion_pct ?? 0;
    const blueRemaining = course.blue_remaining ?? 0;
    const blueRemainingPct = course.blue_remaining_pct ?? 0;
    const totalLingqs = course.total_lingqs ?? 0;
    const level = course.level

    const { currentUsername, deleteCourse, languageCode } = useReaderStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const isOwner = course.owner_id === user?.id;

    const handleDeleteCourse = async () => {
        const result = await Swal.fire({
            title: 'Delete Entire Course?',
            text: `This will permanently remove "${course.title}" and ALL ${course.lesson_count} lessons inside it. Your LingQs will be kept.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const res = await deleteCourse(course.id);
                
                if (res.error === 'confirm_required') {
                    const secondConfirm = await Swal.fire({
                        title: 'Are you absolutely sure?',
                        text: res.message,
                        icon: 'error',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, I understand, delete everything!',
                        confirmButtonColor: '#ef4444',
                    });
                    
                    if (secondConfirm.isConfirmed) {
                        await deleteCourse(course.id, true);
                        Swal.fire('Deleted!', 'Course and lessons removed.', 'success');
                        navigate(`/me/${languageCode}/library`);
                    }
                } else {
                    Swal.fire('Deleted!', 'Course removed.', 'success');
                    navigate(`/me/${languageCode}/library`);
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Internal Error";
                Swal.fire('Error', 'Failed to delete course: ' + message, 'error');
            }
        }
    };

    return (
        <div className='flex flex-col gap-4 sticky top-22 z-10 transition-all'>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                {/* Course thumbnail */}
                <div className="h-fit rounded-lg overflow-hidden bg-blue-50">
                    {course.image_url
                        ? (
                            <img src={course.image_url} className="w-full h-full object-cover" alt={course.title} />
                        )
                        : (
                            <div className="opacity-80 bg-gradient-to-tr from-green-200 to-blue-300 w-full h-60 flex pb-3 leading-none items-center justify-center text-6xl">📖</div>
                        )
                    }
                </div>

                {/* Course title */}
                <div>
                    <h3 className="font-black text-gray-800 text-sm leading-snug">{course.title}</h3>
                    <div className="w-[50%] h-0.5 bg-[#3890fc] mt-1.5 mb-2" />

                    {/* Description */}
                    {course.description && (
                        <pre className="text-xs text-gray-500 leading-relaxed font-nunito text-wrap">{course.description}</pre>
                    )}
                </div>

                {/* Lesson count & Duration */}
                <div className="flex flex-col gap-0.5">
                    <div className="text-sm font-bold text-gray-700">{course.lesson_count} Lessons</div>
                    <div className="text-[11px] font-bold text-gray-400 tracking-tight">Total Duration: {formatDuration(course.total_duration)}</div>
                </div>

                {/* Completion progress bar */}
                <div>
                    <div className="flex justify-between text-[11px] text-gray-500 font-bold mb-1">
                        <span>Progress</span>
                        <span>{completionPct}% done</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-400 rounded-full transition-all duration-500"
                            style={{ width: `${completionPct}%` }}
                        />
                    </div>
                </div>

                {/* Course stats */}
                <div className="space-y-1 text-xs font-bold text-gray-600">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-blue-600">{blueRemaining} blue words left ({blueRemainingPct}%)</span>
                        <span className="text-blue-300 text-[10px]">●</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
                        <span>{totalLingqs} LingQs created</span>
                    </div>
                </div>

                {/* Delete Area */}
                {isOwner && (
                    <div className="mt-2 pt-4 border-t border-gray-100">
                        <button 
                            onClick={handleDeleteCourse}
                            className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded transition-colors border border-dashed border-red-200"
                        >
                            🗑️ Delete Course
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                <div className='flex justify-between'>
                    <p className='font-bold'>Shared by</p>
                    <p className='text-blue-400 font-bold'>{currentUsername}</p>
                </div>
                <hr className='text-gray-400' />
                <div className='flex justify-between'>
                    <p className='font-bold'>Level</p>
                    <p className='text-blue-400 font-bold'>{level}</p>
                </div>
            </div>
        </div>
    );
}
