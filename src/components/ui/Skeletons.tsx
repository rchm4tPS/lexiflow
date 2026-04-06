import Skeleton from './Skeleton';

// ─── Library Skeletons ──────────────────────────────────────────────────────

export function LessonCardSkeleton() {
    return (
        <div className="flex gap-0 bg-white border border-gray-100 rounded-lg shadow-sm relative overflow-hidden">
            <Skeleton className="w-40 h-40 shrink-0 rounded-l-lg rounded-r-none" />
            <div className="flex flex-col flex-grow px-4 py-4 gap-3">
                <Skeleton width="30%" height={12} />
                <Skeleton width="60%" height={20} />
                <div className="mt-auto flex justify-between items-center">
                    <div className="flex gap-2">
                        <Skeleton width={60} height={16} />
                        <Skeleton width={40} height={16} />
                    </div>
                    <Skeleton width={80} height={32} />
                </div>
            </div>
        </div>
    );
}

export function CourseCardSkeleton() {
    return (
        <div className="bg-white border border-gray-100 shadow-sm rounded-md flex flex-col overflow-hidden">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="p-3 flex flex-col gap-3">
                <Skeleton width="40%" height={12} />
                <Skeleton width="80%" height={16} />
                <Skeleton width="100%" height={6} className="mt-1" />
                <Skeleton width="100%" height={32} />
                <div className="flex justify-between">
                    <Skeleton width={50} height={10} />
                    <Skeleton width={60} height={10} />
                </div>
            </div>
        </div>
    );
}

export function SidebarWidgetSkeleton({ title, count = 3 }: { title: string; count?: number }) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 min-h-40">
            <h3 className="text-sm font-bold text-gray-500 mb-4">{title}</h3>
            <div className="flex flex-col gap-5">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton width={40} height={40} className="shrink-0" />
                        <div className="flex flex-col grow gap-2">
                            <div className="flex justify-between">
                                <Skeleton width="60%" height={14} />
                                <Skeleton width="15%" height={10} />
                            </div>
                            <Skeleton width="100%" height={6} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DailyGoalSkeleton() {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 bg-gray-50/30 border-b border-gray-100 flex justify-center">
                <Skeleton width="50%" height={14} />
            </div>
            <div className="p-4 flex gap-4 border-b border-gray-100">
                <div className="flex-1 flex flex-col items-center gap-1">
                    <Skeleton width={40} height={24} />
                    <Skeleton width={30} height={10} />
                </div>
                <div className="flex-1 flex flex-col items-center gap-1 border-l border-gray-100 pl-4">
                    <Skeleton width={50} height={24} />
                    <Skeleton width={40} height={10} />
                </div>
            </div>
            <div className="p-5 flex flex-col gap-7">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <Skeleton width="40%" height={12} />
                            <Skeleton width="20%" height={10} />
                        </div>
                        <Skeleton width="100%" height={8} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Vocabulary Skeletons ───────────────────────────────────────────────────

export function VocabRowSkeleton() {
    return (
        <div className="flex items-center py-6 px-4 border-b border-gray-100 bg-white gap-2 w-full">
            <div className="w-[30%] flex items-center gap-3">
                <Skeleton width={18} height={18} />
                <div className="flex flex-col gap-2 grow">
                    <Skeleton width="70%" height={22} />
                    <div className="flex gap-1">
                        <Skeleton width={30} height={10} />
                        <Skeleton width={40} height={10} />
                    </div>
                </div>
            </div>
            <div className="w-[30%] flex items-center gap-2">
                <Skeleton width={22} height={22} circle />
                <Skeleton width="85%" height={18} />
            </div>
            <div className="w-[25%] pr-4">
                <Skeleton width="100%" height={14} />
            </div>
            <div className="w-[15%] flex justify-center">
                <Skeleton width={140} height={26} className="rounded-full" />
            </div>
        </div>
    );
}
