import { Check } from '../../../components/common/Icons';

const QuickStartGuide = () => (
    <div className="flex flex-col rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)]  border border-gray-100 overflow-auto grow bg-[#EEF9FF] animate-fade-in p-6 m-2 text-gray-800 ">
        <div className="flex items-center space-x-4 mb-6">
            <div className="w-18 h-18 bg-[#3a92fb] rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-yellow-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-3.5 8c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5zm7 0c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5zm-3.5 8c-2.5 0-4.5-1.5-4.5-1.5l.5-.5s1.5 1 4 1 4-1 4-1l.5.5s-2 1.5-4.5 1.5z" /></svg>
            </div>
            <div className="grow">
                <h2 className="text-4xl text-[#3a92fb] font-bold mb-1">Hi!</h2>
                <p className="text-yellow-500 font-semibold text-lg">Quick Start Guide</p>
            </div>
            <div className="ml-auto text-center flex flex-col items-center">
                <button className="border border-[#3a92fb] text-[#3a92fb] rounded px-6 py-1 flex items-center justify-center hover:bg-blue-50 transition cursor-pointer">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                </button>
                <span className="text-xs text-[#3a92fb] mt-1 font-semibold">Watch video<br />walkthrough</span>
            </div>
        </div>

        <div className="space-y-5 text-[15px] font-medium leading-relaxed bg-white px-3 pt-4 pb-8 rounded-lg shadow-sm">
            <p>1. Click on blue words you don't know.</p>
            <div className="ml-5">
                <span className="bg-[#cce5f0] px-2 py-0.5 rounded text-gray-800 text-sm">New Words are blue</span>
            </div>

            <p>2. Add translations to make these words yellow.</p>
            <div className="ml-5">
                <span className="bg-[#fde05f] px-2 py-0.5 rounded text-gray-800 text-sm">LingQs are yellow</span>
            </div>

            <p>3. You will review these LingQs in future lessons. As you learn them, increase their status.</p>
            <div className="ml-5 w-fit flex space-x-1 items-center bg-gray-50 p-1 rounded-full border border-gray-100">
                <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs">1</span>
                <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs">2</span>
                <span className="w-6 h-6 rounded-full bg-[#fde05f] text-gray-700 flex items-center justify-center text-xs font-bold">3</span>
                <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs">4</span>
                <span className="w-6 h-6 rounded-full bg-teal-400 text-white flex items-center justify-center text-xs"><Check /></span>
                <span className="w-6 h-6 rounded-full text-red-400 flex items-center justify-center text-xs"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></span>
            </div>

            <p>4. All other words become known as you page.</p>
            <div className="ml-5">
                <span className="bg-white px-2 py-0.5 rounded text-gray-800 text-sm border border-gray-200 shadow-sm">Known Words are white</span>
            </div>
        </div>

        <div className="my-8 border-t border-b border-blue-200 pt-6 px-2">
            <h3 className="text-xl font-bold text-gray-700 mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-4 text-[14px] text-gray-600 font-medium">
                <div className="flex items-start gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">Esc</span>
                    <span className="font-bold">:</span>
                    <span>Deselect word or phrase</span>
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">K</span>
                    <span className="font-bold">:</span>
                    <span>Set blue word to known and yellow word to status Learning 1</span>
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">0 (zero)</span>
                    <span className="font-bold">:</span>
                    <span>Ignore blue words</span>
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">← / →</span>
                    <span className="font-bold">:</span>
                    <span>Go to next/prev <span className="text-blue-500 font-bold underline">blue</span> word</span>
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">Shift + ← / →</span>
                    <span className="font-bold">:</span>
                    <span>Go to next/prev <span className="font-bold text-gray-800">any</span> word</span>
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">[Alt] + ← / →</span>
                    <span className="font-bold">:</span>
                    <span>Go to next/prev phrases</span>
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">↑ / ↓</span>
                    <span className="font-bold">:</span>
                    <span>Increase / Decrease status of LingQs (word and phrases)</span>
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">1 - 6</span>
                    <span className="font-bold">:</span>
                    <span>Set status of created LingQ (1-4 Learning, 5 Known, 6 Ignored)</span>
                </div>
                <div className="flex items-start gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">Shift + A / D</span>
                    <span className="font-bold">:</span>
                    <span>Navigate to Previous / Next page</span>
                </div>
                <div className="flex items-start mb-4 gap-1">
                    <span className="font-bold w-24 shrink-0 text-gray-800">W / S</span>
                    <span className="font-bold">:</span>
                    <span>Jump to Lesson Start / End</span>
                </div>
            </div>
        </div>
    </div>
);

export default QuickStartGuide;
