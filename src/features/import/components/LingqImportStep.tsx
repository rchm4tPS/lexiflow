import { useState } from 'react';
import Swal from 'sweetalert2';

interface LingqImportStepProps {
    importFromLingq: (apiKey: string, courseCount: number, lessonsPerCourse: number) => Promise<any>;
    onSuccess: () => void;
}

export default function LingqImportStep({ importFromLingq, onSuccess }: LingqImportStepProps) {
    const [lingqApiKey, setLingqApiKey] = useState('');
    const [lingqCourseCount, setLingqCourseCount] = useState(3);
    const [lingqLessonsPerCourse, setLingqLessonsPerCourse] = useState(3);
    const [isLingqImporting, setIsLingqImporting] = useState(false);
    const [lingqImportStatus, setLingqImportStatus] = useState('');

    const handleLingqImport = async () => {
        setIsLingqImporting(true);
        setLingqImportStatus('Connecting to LingQ API...');
        try {
            const res = await importFromLingq(lingqApiKey, lingqCourseCount, lingqLessonsPerCourse);
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Import Successful!',
                    text: `Imported ${res.count} courses from LingQ.`,
                    confirmButtonColor: '#3890fc',
                });
                onSuccess();
            }
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Import Failed',
                text: err.response?.data?.error || err.message,
                confirmButtonColor: '#3890fc',
            });
        } finally {
            setIsLingqImporting(false);
            setLingqImportStatus('');
        }
    };

    return (
        <div className="pt-10 px-10 pb-20 flex flex-col items-center justify-center gap-8 bg-white grow overflow-y-auto">
            <div className="text-center max-w-md">
                <h2 className="text-xl font-black text-gray-800 mb-2">Import from LingQ API</h2>
                <p className="text-gray-500 text-sm">
                    Automatically populate your library with recommended content directly from LingQ.
                    This can only be done <strong>once</strong>.
                </p>
            </div>

            <div className="w-full max-w-md flex flex-col gap-5">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">LingQ API Key (Optional)</label>
                    <input
                        type="password"
                        placeholder="Paste your API key here (Optional)"
                        value={lingqApiKey}
                        onChange={(e) => setLingqApiKey(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-orange-400 transition-colors"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 italic">If left blank, the developer's fallback key will be used.</p>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Courses (Max 3)</label>
                        <select
                            value={lingqCourseCount}
                            onChange={(e) => setLingqCourseCount(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                        >
                            <option value={1}>1 Course</option>
                            <option value={2}>2 Courses</option>
                            <option value={3}>3 Courses</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Lessons per Course (Max 3)</label>
                        <select
                            value={lingqLessonsPerCourse}
                            onChange={(e) => setLingqLessonsPerCourse(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                        >
                            <option value={1}>1 Lesson</option>
                            <option value={2}>2 Lessons</option>
                            <option value={3}>3 Lessons</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleLingqImport}
                    disabled={isLingqImporting}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-lg shadow-lg shadow-orange-200 transition-all disabled:opacity-50 disabled:shadow-none mt-4"
                >
                    {isLingqImporting ? 'Importing content...' : 'Start Import'}
                </button>

                {isLingqImporting && (
                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 animate-pulse w-[60%]"></div>
                        </div>
                        <p className="text-xs font-bold text-orange-500 italic">{lingqImportStatus}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
