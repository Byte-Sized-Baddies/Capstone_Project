<script src="http://localhost:8097"></script>

import { useState } from 'react';
import { signUpWithEmail, signInWithOAuth } from '../../packages/utils/auth';
import { useRouter } from 'next/router';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleEmailSignUp = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const { data, error } = await signUpWithEmail(email, password);
    if (error) {
      alert(error.message);
      return;
    }

    alert('Check your email for confirmation link!');
    router.push('/login'); // redirect after signup
  };

  const handleOAuthSignUp = async (provider: 'google' | 'github') => {
    const { data, error } = await signInWithOAuth(provider);
    if (error) {
      alert(error.message);
      return;
    }
    // OAuth redirects to Supabase, then returns
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
      <h1>Sign Up</h1>
      <input
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
      <button onClick={handleEmailSignUp} style={{ width: '100%
