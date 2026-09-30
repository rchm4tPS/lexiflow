// TODO: [RESPONSIVE] Halaman SignUpView belum di-responsivekan untuk layar mobile/tablet.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LANGUAGES } from '../constants/languages';
import { TIERS } from '../constants/tiers';
import { StepDot, InputField } from '../features/auth/components/AuthUI';
import {
  validateEmail, validateStep1Fields, validateUsername,
  USERNAME_MAX, USERNAME_MIN, type FieldErrors,
} from '../features/auth/validation';
import { useAvailabilityCheck } from '../features/auth/useAvailabilityCheck';

export default function SignUpView() {
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Errors keyed by field name so each message renders next to its own input.
  const [errors, setErrors] = useState<FieldErrors>({});
  // Only for failures that belong to no single field (network, server fault).
  const [formError, setFormError] = useState('');

  // Step 1 — identity
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Step 2 — preferences
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [dailyGoalTier, setDailyGoalTier] = useState('');

  const { states: availability, scheduleCheck, checkNow, reset: resetAvailability } = useAvailabilityCheck();

  /**
   * Clear one field's error as soon as the user edits it, so the form stops
   * shouting at them mid-typo. Other fields keep their messages.
   */
  const clearError = (field: string) => {
    setErrors(prev => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // A "taken" verdict is surfaced as a field error so it behaves like every
  // other invalid field, and so it blocks Continue without a second mechanism.
  const effectiveErrors: FieldErrors = { ...errors };
  for (const field of ['username', 'email'] as const) {
    if (availability[field].status === 'taken' && !effectiveErrors[field]) {
      effectiveErrors[field] = 'Already registered. Please choose another one.';
    }
  }

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    clearError('username');
    // Only ask the server once the value is well-formed — otherwise the answer
    // would be about a name the user is still in the middle of typing.
    scheduleCheck('username', value, !validateUsername(value));
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    clearError('email');
    scheduleCheck('email', value, !validateEmail(value));
  };

  /**
   * Toggle a language on or off.
   *
   * The last remaining selection cannot be removed: the account must be created
   * with at least one language, and silently ignoring the click leaves the
   * button looking unresponsive. Removing it is still caught at submit as a
   * backstop in case the state is changed another way.
   */
  const toggleLanguage = (code: string) => {
    clearError('targetLanguage');
    setTargetLanguages(prev => {
      if (prev.includes(code)) {
        return prev.length === 1 ? prev : prev.filter(c => c !== code);
      }
      return [...prev, code];
    });
  };

  const handleNext = () => {
    setFormError('');
    const nextErrors = validateStep1Fields({ fullName, username, email, password, confirmPw });
    // A lookup still in flight must not be raced past: settle it before
    // deciding, so a name found to be taken cannot slip through to step 2.
    const pending = (['username', 'email'] as const).some(f => availability[f].status === 'checking');
    if (pending) {
      setFormError('Still checking your details — one moment.');
      return;
    }
    for (const field of ['username', 'email'] as const) {
      if (availability[field].status === 'taken') {
        nextErrors[field] = 'Already registered. Please choose another one.';
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    setFormError('');
    const nextErrors: FieldErrors = {};
    if (targetLanguages.length === 0) nextErrors.targetLanguage = 'Please select at least one target language.';
    if (!dailyGoalTier) nextErrors.dailyGoalTier = 'Please choose a daily goal.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      // Trim before sending: outer whitespace on the identity fields must not
      // be persisted, and must not push a username over the length limit.
      // Passwords are intentionally left untouched.
      await register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        targetLanguages,
        dailyGoalTier,
      });
      setSuccess(true);
    } catch (e: unknown) {
      const fieldErrors = (e as { fieldErrors?: FieldErrors })?.fieldErrors;
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        // A server-side field error belongs to step 1 (username/email taken,
        // for instance) — send the user back so they can see the message.
        if (Object.keys(fieldErrors).some(f => f !== 'targetLanguage' && f !== 'dailyGoalTier')) {
          setStep(1);
        }
      } else {
        setFormError(e instanceof Error && e.message ? e.message : 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 font-nunito px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-6 max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-black text-gray-800">You're all set!</h2>
        <p className="text-gray-500 text-sm font-medium">Your account has been created. Log in to start your language journey.</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-blue-200 text-sm"
        >
          Go to Login →
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex font-nunito bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 overflow-x-hidden">
      <div className="hidden lg:flex flex-col justify-center items-start px-20 w-[42%] text-white gap-8 bg-black/10 backdrop-blur-3xl border-r border-white/5">
        <div className="animate-in fade-in slide-in-from-left duration-700">
          <div className="text-6xl font-black tracking-tighter mb-2">Lexiflow</div>
          <p className="text-blue-300 text-xl font-bold opacity-80 italic">Master a language through content you love.</p>
        </div>
        <ul className="flex flex-col gap-5 text-blue-100/70 text-sm font-bold">
          {['Track every word you learn', 'Listen & read in sync', 'Build streaks, hit daily goals', 'Works with any language'].map((f, i) => (
            <li key={f} className={`flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-500 delay-${(i+1)*100}`}>
              <span className="text-blue-400 text-xl">✦</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="h-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400" />

          <div className="p-8 flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-black text-gray-800">Create your account</h1>
              <p className="text-gray-400 text-sm font-bold mt-1">Join cases and start learning today.</p>
            </div>

            <div className="flex items-center gap-3">
              <StepDot done={step > 1} active={step === 1} num={1} />
              <div className={`flex-1 h-1 rounded-full transition-colors duration-500 ${step > 1 ? 'bg-blue-400' : 'bg-gray-100'}`} />
              <StepDot done={false} active={step === 2} num={2} />
            </div>

            {step === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right duration-300">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 w-fit px-2 py-0.5 rounded border border-gray-100">Step 1 · Your Details</p>
                <div className="space-y-3">
                    <InputField
                      label="Full Name"
                      id="fullName"
                      value={fullName}
                      onChange={(v) => { setFullName(v); clearError('fullName'); }}
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                      error={errors.fullName}
                    />
                    <InputField
                      label="Username"
                      id="username"
                      value={username}
                      onChange={handleUsernameChange}
                      onBlur={() => checkNow('username', username, !validateUsername(username))}
                      placeholder="ada_learns"
                      autoComplete="username"
                      error={effectiveErrors.username}
                      status={availability.username.status}
                      hint={`${USERNAME_MIN}–${USERNAME_MAX} characters. Letters, numbers and underscores only; must include a letter.`}
                    />
                    <InputField
                      label="Email"
                      id="email"
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      onBlur={() => checkNow('email', email, !validateEmail(email))}
                      placeholder="ada@example.com"
                      autoComplete="email"
                      error={effectiveErrors.email}
                      status={availability.email.status}
                    />
                    <InputField
                      label="Password"
                      id="password"
                      type="password"
                      value={password}
                      onChange={(v) => { setPassword(v); clearError('password'); }}
                      placeholder="Min. 6 characters"
                      autoComplete="new-password"
                      error={errors.password}
                    />
                    <InputField
                      label="Confirm Password"
                      id="confirmPw"
                      type="password"
                      value={confirmPw}
                      onChange={(v) => { setConfirmPw(v); clearError('confirmPw'); }}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      error={errors.confirmPw}
                    />
                </div>

                {formError && <p role="alert" className="text-red-500 text-xs font-bold bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg animate-shake">{formError}</p>}

                <button
                  onClick={handleNext}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 text-sm mt-2"
                >
                  Continue →
                </button>

                <p className="text-center text-xs font-bold text-gray-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-blue-500 font-black hover:underline underline-offset-2">Log in</Link>
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right duration-300">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 w-fit px-2 py-0.5 rounded border border-gray-100">Step 2 · Your Preferences</p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Target Language</label>
                    <span className="text-[10px] font-bold text-gray-400">
                      {targetLanguages.length === 0
                        ? 'Select at least one'
                        : `${targetLanguages.length} selected`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                    {LANGUAGES.map(l => {
                      const selected = targetLanguages.includes(l.code);
                      const isPrimary = selected && targetLanguages[0] === l.code;
                      return (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => toggleLanguage(l.code)}
                          aria-pressed={selected}
                          className={`relative flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-black transition-all ${
                            selected
                              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 text-gray-500'
                          }`}
                        >
                          <img src={`https://flagcdn.com/${l.countryCode}.svg`} alt={l.name} className="w-8 h-6 object-contain drop-shadow-sm rounded-sm" />
                          <span className="text-[10px] uppercase tracking-tight">{l.name}</span>
                          {isPrimary && (
                            <span className="absolute -top-1.5 -right-1.5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[8px] font-black text-white leading-none">
                              1st
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400">
                    Pick as many as you like. The first one you choose is your primary language.
                  </p>
                  {errors.targetLanguage && (
                    <p role="alert" className="text-red-500 text-[11px] font-bold flex items-start gap-1">
                      <span aria-hidden="true">⚠</span><span>{errors.targetLanguage}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Daily Goal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIERS.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setDailyGoalTier(t.id); clearError('dailyGoalTier'); }}
                        className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                          dailyGoalTier === t.id
                            ? `${t.border} ${t.bg} shadow-md scale-[1.02]`
                            : 'border-gray-100 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full mb-1">
                            <span className="text-xl">{t.emoji}</span>
                            {dailyGoalTier === t.id && <span className="text-xs">✓</span>}
                        </div>
                        <span className={`text-sm font-black ${dailyGoalTier === t.id ? t.text : 'text-gray-700'}`}>{t.label}</span>
                        <span className="text-[10px] text-gray-400 font-bold leading-tight opacity-80">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                  {errors.dailyGoalTier && (
                    <p role="alert" className="text-red-500 text-[11px] font-bold flex items-start gap-1">
                      <span aria-hidden="true">⚠</span><span>{errors.dailyGoalTier}</span>
                    </p>
                  )}
                </div>

                {formError && <p role="alert" className="text-red-500 text-xs font-bold bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg animate-shake">{formError}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setFormError(''); setErrors({}); resetAvailability(); setStep(1); }}
                    className="flex-1 border-2 border-gray-100 text-gray-400 font-black py-3 rounded-xl hover:border-gray-300 transition-all text-xs uppercase"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-blue-200 text-sm"
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
