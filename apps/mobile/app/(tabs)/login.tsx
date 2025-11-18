import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { signInWithEmail, signInWithGoogle, signInWithGitHub } from '../../lib/auth'; // adjust path if needed
import { Link } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmail(email, password);
      setMessage('✅ Logged in successfully!');
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleGitHubLogin = async () => {
    try {
      await signInWithGitHub();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <Button title="Login with Email" onPress={handleLogin} />

      <View style={styles.socialButtons}>
        <Button title="Login with Google" color="#DB4437" onPress={handleGoogleLogin} />
        <View style={{ height: 10 }} />
        <Button title="Login with GitHub" color="#24292E" onPress={handleGitHubLogin} />
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={{ marginTop: 20 }}>
        <Link href="/signup">Don’t have an account? Sign up</Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
  },
  socialButtons: { marginTop: 20 },
  message: { marginTop: 15, textAlign: 'center' },
});
