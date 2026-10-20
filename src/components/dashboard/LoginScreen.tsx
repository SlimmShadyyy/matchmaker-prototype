
'use client';

import type { FormEvent } from 'react';
import { Heart } from 'lucide-react';

interface LoginScreenProps {
  username: string;
  password: string;
  loginError: string;
  demoEmail: string;
  demoPassword: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function LoginScreen({
  username,
  password,
  loginError,
  demoEmail,
  demoPassword,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50/40 to-stone-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">
              The Date Crew (TDC)
            </h1>
            <p className="text-xs text-stone-500">
              Internal Matchmaker OS & AI Engine
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Matchmaker Email
            </label>
            <input
              type="email"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          {loginError && (
            <p className="text-xs text-red-600">{loginError}</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow transition text-sm"
          >
            Sign In to Matchmaker Workspace
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-100 text-xs text-stone-500 flex justify-between items-center gap-3">
          <span>
            Demo login: {demoEmail} / {demoPassword}
          </span>
          <span className="text-emerald-700 font-medium shrink-0">
            ● 220 Verified Pool Profiles Ready
          </span>
        </div>
      </div>
    </div>
  );
}
