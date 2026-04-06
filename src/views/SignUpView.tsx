import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LANGUAGES } from '../constants/languages';
import { TIERS } from '../constants/tiers';
import { StepDot, InputField } from '../features/auth/components/AuthUI';

export default function SignUpView() {
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1 — identity
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Step 2 — preferences
  const [targetLanguage, setTargetLanguage] = useState('');
  const [dailyGoalTier, setDailyGoalTier] = useState('');

  const validateStep1 = () => {
    if (!fullName.trim()) return 'Full name is required.';
    if (username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPw) return 'Passwords do not match.';
    return '';
  };

  const validateStep2 = () => {
    if (!targetLanguage) return 'Please select a target language.';
    if (!dailyGoalTier) return 'Please choose a daily goal.';
    return '';
  };

  const handleNext = () => {
    setError('');
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    setError('');
    const err = validateStep2();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      await register({ fullName, username, email, password, targetLanguage, dailyGoalTier });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 font-nunito px-4">
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
    <div className="min-h-screen flex font-nunito bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 overflow-x-hidden">
      <div className="hidden lg:flex flex-col justify-center items-start px-20 w-[42%] text-white gap-8 bg-black/10 backdrop-blur-3xl border-r border-white/5">
        <div className="animate-in fade-in slide-in-from-left duration-700">
          <div className="text-6xl font-black tracking-tighter mb-2">LingQ</div>
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
                    <InputField label="Full Name" id="fullName" value={fullName} onChange={setFullName} placeholder="Ada Lovelace" autoComplete="name" />
                    <InputField label="Username" id="username" value={username} onChange={setUsername} placeholder="ada_learns" autoComplete="username" />
                    <InputField label="Email" id="email" type="email" value={email} onChange={setEmail} placeholder="ada@example.com" autoComplete="email" />
                    <InputField label="Password" id="password" type="password" value={password} onChange={setPassword} placeholder="Min. 6 characters" autoComplete="new-password" />
                    <InputField label="Confirm Password" id="confirmPw" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="Repeat password" autoComplete="new-password" />
                </div>

                {error && <p className="text-red-500 text-xs font-bold bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg animate-shake">{error}</p>}

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
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Target Language</label>
                  <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => setTargetLanguage(l.code)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-black transition-all ${
                          targetLanguage === l.code
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 text-gray-500'
                        }`}
                      >
                        <span className="text-2xl drop-shadow-sm">{l.flag}</span>
                        <span className="text-[10px] uppercase tracking-tight">{l.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Daily Goal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIERS.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setDailyGoalTier(t.id)}
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
                </div>

                {error && <p className="text-red-500 text-xs font-bold bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg animate-shake">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setError(''); setStep(1); }}
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
