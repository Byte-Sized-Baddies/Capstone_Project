import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { signUpWithEmail, signInWithGoogle, signInWithGitHub } from '../../lib/auth'; // adjust path if needed
import { Link } from 'expo-router';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSignup = async () => {
    try {
      await signUpWithEmail(email, password);
      setMessage('✅ Account created! Check your email for verification.');
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleGitHubSignup = async () => {
    try {
      await signInWithGitHub();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

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

      <Button title="Sign Up with Email" onPress={handleSignup} />

      <View style={styles.socialButtons}>
        <Button title="Sign Up with Google" color="#DB4437" onPress={handleGoogleSignup} />
        <View style={{ height: 10 }} />
        <Button title="Sign Up with GitHub" color="#24292E" onPress={handleGitHubSignup} />
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={{ marginTop: 20 }}>
        <Link href="/login">Already have an account? Login</Link>
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
