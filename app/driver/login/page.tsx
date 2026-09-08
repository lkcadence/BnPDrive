'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/driver/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!response.ok) {
      setError('Invalid password.');
      return;
    }

    const next = searchParams.get('next') || '/driver';
    router.push(next);
    router.refresh();
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1 style={{ marginTop: 0 }}>Driver login</h1>
        <p style={{ color: 'var(--color-muted)' }}>
          Bob-n-Pam Drive — enter your driver password
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="btn btn-block" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DriverLoginPage() {
  return (
    <Suspense fallback={<div className="login-wrap">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
