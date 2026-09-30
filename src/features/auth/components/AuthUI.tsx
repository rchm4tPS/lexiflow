
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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

/** Live status for a field that is verified against the server as you type. */
export type FieldStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

interface InputFieldProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoComplete?: string;
  /** Message shown directly beneath this input. */
  error?: string;
  /** Secondary hint, e.g. live character counter. Hidden while `error` is set. */
  hint?: string;
  /** Availability of this value, verified server-side. */
  status?: FieldStatus;
  disabled?: boolean;
  maxLength?: number;
}

export function InputField({
  label, id, type = 'text', value, onChange, onBlur, placeholder, autoComplete,
  error, hint, status = 'idle', disabled, maxLength,
}: InputFieldProps) {
  const statusId = `${id}-status`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const toggleId = `${id}-visibility`;

  // Visibility is component state, so it survives the parent re-rendering the
  // form (which happens on every keystroke, since the value is lifted) and is
  // deliberately not tied to focus or to whether the field has any content.
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const shownType = isPassword && revealed ? 'text' : type;

  // An availability failure outranks the hint, but never a real validation
  // error — those describe the value itself rather than its availability.
  const showStatus = !error && (status === 'checking' || status === 'available' || status === 'taken');
  const describedBy = error ? errorId : showStatus ? statusId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-gray-600">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={shownType}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={error || status === 'taken' ? true : undefined}
          aria-describedby={describedBy}
          aria-controls={isPassword ? toggleId : undefined}
          className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 transition bg-white font-medium disabled:bg-gray-50 disabled:text-gray-400 ${
            isPassword ? 'pr-11' : 'pr-10'
          } ${
            error || status === 'taken'
              ? 'border-red-300 focus:ring-red-300 focus:border-red-300'
              : 'border-gray-200 focus:ring-blue-400 focus:border-transparent'
          }`}
        />
        {status === 'checking' && (
          <span
            aria-hidden="true"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
          />
        )}
        {status === 'available' && (
          <span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm font-black">✓</span>
        )}
        {isPassword && (
          // Rendered unconditionally: it does not appear on focus and does not
          // disappear when the field empties, so it is always where the user
          // expects it. type="button" keeps it from submitting the form, and
          // preventDefault on mousedown keeps focus in the input so blur-driven
          // behaviour is not disturbed by pressing the icon.
          <button
            id={toggleId}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setRevealed(prev => !prev)}
            disabled={disabled}
            aria-pressed={revealed}
            aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
            title={revealed ? `Hide ${label}` : `Show ${label}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-red-500 text-[11px] font-bold flex items-start gap-1">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      ) : showStatus ? (
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={`text-[11px] font-bold ${
            status === 'taken' ? 'text-red-500' : status === 'available' ? 'text-emerald-600' : 'text-gray-400'
          }`}
        >
          {status === 'checking' && 'Checking availability…'}
          {status === 'available' && 'Looks available.'}
          {status === 'taken' && 'Already registered. Please choose another one.'}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-gray-400 text-[11px] font-bold">{hint}</p>
      ) : null}
    </div>
  );
}
