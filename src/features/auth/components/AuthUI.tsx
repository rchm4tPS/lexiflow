
export function StepDot({ done, active, num }: { done: boolean; active: boolean; num: number }) {
  if (done) return (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold shadow">✓</div>
  );
  if (active) return (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold ring-4 ring-blue-200 shadow">{num}</div>
  );
  return (
    <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold">{num}</div>
  );
}

interface InputFieldProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export function InputField({ label, id, type = 'text', value, onChange, placeholder, autoComplete }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-gray-600">{label}</label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white font-medium"
      />
    </div>
  );
}
