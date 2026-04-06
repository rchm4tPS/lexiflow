import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginView() {
    const { login } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err: unknown) {
            setError(err instanceof Error && err?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-nunito bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">
            {/* ── Left branding ── */}
            <div className="hidden lg:flex flex-col justify-center items-start px-16 w-[42%] text-white gap-8">
                <div>
                    <div className="text-5xl font-black tracking-tight mb-2">LingQ</div>
                    <p className="text-blue-300 text-lg font-medium">Master a language through content you love.</p>
                </div>
                <ul className="flex flex-col gap-4 text-blue-200 text-sm font-medium">
                    {['Track every word you learn', 'Listen & read in sync', 'Build streaks, hit daily goals', 'Works with any language'].map(f => (
                        <li key={f} className="flex items-center gap-3">
                            <span className="text-blue-400 text-lg">✦</span>
                            {f}
                        </li>
                    ))}
                </ul>
            </div>

            {/* ── Right form ── */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400" />

                    <form onSubmit={handleLogin} className="p-8 flex flex-col gap-5">
                        <div>
                            <h1 className="text-2xl font-black text-gray-800">Welcome back</h1>
                            <p className="text-gray-400 text-sm mt-1">Log in to continue your learning journey.</p>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="email" className="text-sm font-semibold text-gray-600">Email</label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="ada@example.com"
                                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="password" className="text-sm font-semibold text-gray-600">Password</label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Your password"
                                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white"
                            />
                        </div>

                        {error && (
                            <p className="text-red-500 text-xs font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition text-sm"
                        >
                            {loading ? 'Logging in...' : 'Log In →'}
                        </button>

                        <p className="text-center text-xs text-gray-400">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-blue-500 font-bold hover:underline">Sign Up for free</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}