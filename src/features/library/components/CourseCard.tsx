
interface CourseCardProps {
    course: any;
    onOpen: (id: string) => void;
}

export default function CourseCard({ course, onOpen }: CourseCardProps) {
    const blueRemaining = course.blue_remaining ?? course.total_unique_words ?? 0;
    const totalUnique = course.total_unique_words || 1;
    const blueRemainingPct = Math.round((blueRemaining / totalUnique) * 100);
    const completionPct = course.completion_pct ?? 0;
    const totalLingqs = course.total_lingqs_count ?? 0;

    return (
        <div className="bg-white border border-gray-200 shadow-sm rounded-md flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer">
            {/* Image */}
            <div
                className="h-36 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center overflow-hidden"
                onClick={() => onOpen(course.id)}
            >
                {course.image_url
                    ? <img src={course.image_url} className="w-full h-full object-cover" alt={course.title} />
                    : <span className="text-5xl">📚</span>
                }
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col grow">
                {/* Lesson count */}
                <p className="text-xs font-bold text-[#3890fc] mb-1">Lessons: {course.lesson_count}</p>

                {/* Course title */}
                <span className='h-14'>
                    <h4 className="font-bold text-gray-800 text-sm line-clamp-2 mb-2 leading-snug">
                        {course.title}
                    </h4>
                </span>

                <div className=''>
                    {/* Completion progress bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                        <div
                            className="h-full bg-green-400 rounded-full transition-all duration-500"
                            style={{ width: `${completionPct}%` }}
                        />
                    </div>

                    {/* Open button */}
                    <button
                        onClick={() => onOpen(course.id)}
                        className="w-full border-2 border-[#3890fc] text-[#3890fc] font-bold rounded-lg py-1.5 text-sm hover:bg-[#3890fc] hover:text-white transition-colors mb-2"
                    >
                        Open
                    </button>

                    {/* Stats row */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 flex-wrap gap-1">
                        <span className="text-[#3890fc]">{course.level || 'Beginner 1'}</span>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5 text-blue-500">
                                <span className="text-[10px]">■</span>
                                {blueRemaining}
                                <span className="text-blue-400">({blueRemainingPct}%)</span>
                                <span className="text-blue-300 text-[8px]">●</span>
                            </span>
                            <span className="flex items-center gap-0.5">
                                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                                {totalLingqs}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
