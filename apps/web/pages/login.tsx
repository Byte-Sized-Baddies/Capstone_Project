import { useState } from 'react';
import { signInWithEmail, signInWithOAuth } from '../../packages/utils/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailLogin = async () => {
    const { data, error } = await signInWithEmail(email, password);
    if (error) alert(error.message);
    else console.log('Logged in:', data);
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const { data, error } = await signInWithOAuth(provider);
    if (error) alert(error.message);
    else console.log('Redirecting to OAuth provider:', data);
  };

  return (
    <div>
      <h1>Login</h1>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleEmailLogin}>Login</button>

      <button onClick={() => handleOAuthLogin('google')}>Login with Google</button>
      <button onClick={() => handleOAuthLogin('github')}>Login with GitHub</button>
    </div>
  );
}
