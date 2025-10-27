import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<any>(null);
  const [message, setMessage] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const currentSession = supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else setMessage('Check your email for confirmation!');
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else setMessage('Logged in!');
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
    else setMessage('Logged out!');
  };

  if (session) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Welcome!</h1>
        <p>Logged in as: {session.user.email}</p>
        <button onClick={handleSignOut}>Sign Out</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Login / Sign Up</h1>
      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: 8, width: 300 }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: 8, width: 300 }}
      />
      <button onClick={handleSignIn} style={{ marginRight: 8 }}>Sign In</button>
      <button onClick={handleSignUp}>Sign Up</button>
      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}
