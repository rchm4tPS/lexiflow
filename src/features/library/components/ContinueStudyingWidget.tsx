import { useNavigate } from 'react-router-dom';
import { useReaderStore } from '../../../store/useReaderStore';

export default function ContinueStudyingWidget() {
    const { continueStudying, languageCode } = useReaderStore();
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 min-h-40">
            <h3 className="text-sm font-bold text-gray-500 mb-3">Continue Studying</h3>
            {continueStudying.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 italic">No recent activity. Start a lesson to track progress!</p>
            ) : (
                continueStudying.map((lesson) => {
                    const total = lesson.unique_words || 1;
                    const learned = total - (lesson.user_new_words || 0);
                    const progress = Math.round((learned / total) * 100);

                    return (
                        <div key={lesson.id}
                            className="flex items-center gap-3 mb-4 last:mb-0 cursor-pointer group"
                            onClick={() => navigate(`/me/${languageCode}/reader/${lesson.id}`)}
                        >
                            <div className="w-10 h-10 bg-blue-100 rounded shrink-0 overflow-hidden">
                                {lesson.image_url ? (
                                    <img src={lesson.image_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-blue-400 text-xl">📖</div>
                                )}
                            </div>
                            <div className="flex flex-col grow">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-[#3890fc] transition-colors line-clamp-1 max-w-[80%]">
                                        {lesson.title}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400">{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1">
                                    <div
                                        className="bg-green-400 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
