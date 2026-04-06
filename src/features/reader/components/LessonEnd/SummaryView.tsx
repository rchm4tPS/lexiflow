import { useReaderStore } from '../../../../store/useReaderStore';
import { LeftArrow, RightArrow } from '../../../../components/common/Icons';

export default function SummaryView() {
    const { totalKnownWords, totalCoins, setShowSummary, isRTL } = useReaderStore();
    type DayItemProps = {
        day: string;
        isToday: boolean;
    };
    const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const getToday = () => new Date().toLocaleDateString('en-US', { weekday: 'short' });

    const DayItem = ({ day, isToday }: DayItemProps) => {
        const baseClasses = "flex flex-col items-center";
        const circleClasses = `w-12 h-12 rounded-full mb-2 ${
            isToday
            ? "bg-yellow-400 border-2 border-white shadow-md"
            : "bg-gray-400"
        }`;
        const textClasses = `text-xs font-bold ${
            isToday ? "text-yellow-600" : "text-gray-500"
        }`;

        return (
            <div className={`${baseClasses} ${!isToday ? "opacity-30" : ""}`}>
            <div className={circleClasses}></div>
            <span className={textClasses}>
                {day}({isToday ? 5 : 0})
            </span>
            </div>
        );
    };

  return (
    <div className="w-full flex flex-col items-center py-10 animate-fade-in relative h-full overflow-auto">
      {/* Back Arrow */}
      <button 
        onClick={() => setShowSummary(false)}
        className={`top-1/2 -translate-y-1/2 text-[#5DE96A] cursor-pointer ${isRTL ? 'absolute right-4' : 'absolute left-4'}`}
      >
        {isRTL ? <RightArrow/> : <LeftArrow/> }
      </button>

      <h1 className="text-3xl font-bold text-[#3a92fb] mb-12">
        Wow! You know {totalKnownWords.toLocaleString()} words in German!
      </h1>

      {/* Main Stats Area */}
      <div className="flex items-center justify-around  rounded-md p-4 w-full max-w-5xl mb-10">
        <div className="w-48 h-64 bg-gray-100 rounded-lg flex items-center justify-center">Character 1</div>
        
        {/* Mock Chart */}
        <div className="flex-1 h-48 mx-16 border-b-2 border-l-2 border-gray-200 relative flex items-end gap-6 px-6">
           {/* Chart line mock via SVG or Bars */}
           <div className="flex-1 bg-blue-400 h-[20%] rounded-t"></div>
           <div className="flex-1 bg-blue-400 h-[25%] rounded-t"></div>
           <div className="flex-1 bg-blue-400 h-[35%] rounded-t"></div>
           <div className="flex-1 bg-blue-400 h-[75%] rounded-t"></div>
           <div className="flex-1 bg-blue-400 h-[52%] rounded-t"></div>
           <div className="flex-1 bg-blue-400 h-[22%] rounded-t"></div>
           <div className="flex-1 bg-blue-500 h-[60%] rounded-t shadow-lg"></div>
           <p className="absolute -left-18 top-20 -rotate-90 text-xs text-gray-400 font-bold">Total LingQs created</p>
           <p className="absolute left-48 mx-auto -bottom-8  text-sm text-gray-400 font-bold">Days of a week</p>
        </div>

        <div className="w-48 h-64 bg-gray-100 rounded-lg flex items-center justify-center">Character 2</div>
      </div>

      {/* Daily Goal Tier */}
      <div className='flex w-full justify-between items-center px-48 py-4'>
        <div className="flex flex-col gap-4 mb-4 text-center">
            <p>Make sure you're meething the daily goal.</p>
            <div className='flex gap-4 mt-2'>
                {DAYS.map((day) => {
                    const isToday = getToday() === day;
                    return <DayItem key={day} day={day} isToday={isToday} />;
                })}
            </div>
        </div>

        <button className="bg-[#5DE96A] h-fit text-white px-12 py-4 rounded-full text-xl font-bold shadow-xl hover:scale-105 transition transform cursor-pointer">
            Continue to next lesson ➔
        </button>
      </div>

      {/* Coins Pill */}
      <div className="absolute bottom-4 right-4 bg-[#FFE578] px-6 py-2 rounded-full border-2 border-white shadow-lg flex items-center gap-2">
         <div className="w-8 h-8 rounded-full bg-yellow-500 border border-white"></div>
         <span className="font-bold text-yellow-900">{totalCoins} Coins</span>
      </div>
    </div>
  );
}