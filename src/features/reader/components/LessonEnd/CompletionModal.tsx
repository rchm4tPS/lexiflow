import { useReaderStore } from '../../../../store/useReaderStore';

export default function CompletionModal() {
  const { setModal, completeLesson } = useReaderStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center text-left bg-black/50 animate-fade-in" dir='ltr'>
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Finish Lesson?</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          You are about to complete this lesson. Any remaining <span className="text-blue-500 font-bold">blue words</span> will be marked as <span className="font-bold text-gray-800">known</span>.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={() => setModal(false)}
            className="cursor-pointer flex-1 px-4 py-3 rounded-lg font-bold text-gray-500 hover:bg-blue-100 hover:text-red-400 transition"
          >
            Go Back
          </button>
          <button 
            onClick={completeLesson}
            className="cursor-pointer flex-1 px-4 py-3 bg-[#49cb56] hover:bg-[#3ef750] hover:text-black text-white rounded-lg font-bold transition shadow-lg"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}