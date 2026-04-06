
export function StatCard({ label, value, color }: { label: string, value: any, color: string }) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100 shadow-sm">
            <div className={`text-2xl font-bold ${color}`}>{value || 0}</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</div>
        </div>
    );
}

export function SmallStat({ label, value }: { label: string, value: any }) {
    return (
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-gray-500 font-medium">{label}</span>
            <span className="font-bold text-gray-800">{value || 0}</span>
        </div>
    );
}
