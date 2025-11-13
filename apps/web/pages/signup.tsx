import { useState } from 'react';
import { useRouter } from 'next/router';
import { signUpWithEmail, signInWithOAuth } from '../lib/auth/auth';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleEmailSignUp = async () => {
    setErr(null);
    if (!email || !password) return setErr('Email and password required');
    if (password !== confirmPassword) return setErr('Passwords do not match');

    try {
      setLoading(true);
      const { error } = await signUpWithEmail(email, password);
      if (error) return setErr(error.message);
      alert('Check your email for a confirmation link.');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setErr(null);
    try {
      setLoading(true);
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setErr(error.message);
      }
      // Supabase automatically redirects after OAuth, so you might not need router.push here
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem' }}>
      <h1>Sign Up</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />

      {err && <div style={{ color: 'crimson', marginBottom: '0.5rem' }}>{err}</div>}

      <button
        onClick={handleEmailSignUp}
        disabled={loading}
        style={{ width: '100%', marginBottom: '0.75rem' }}
      >
        {loading ? 'Signing up…' : 'Sign Up'}
      </button>

      <hr style={{ margin: '1rem 0' }} />

      <button
        onClick={() => handleOAuthSignIn('google')}
        disabled={loading}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      >
        Continue with Google
      </button>
      <button
        onClick={() => handleOAuthSignIn('github')}
        disabled={loading}
        style={{ width: '100%' }}
      >
        Continue with GitHub
      </button>
    </div>
  );
}
