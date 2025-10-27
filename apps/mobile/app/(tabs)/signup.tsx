import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { signUpWithEmail } from '../../lib/auth';
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

  return (
    <View style={{ padding: 20, marginTop: 100 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Sign Up</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          marginBottom: 10,
          padding: 10,
          borderRadius: 8,
        }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          marginBottom: 10,
          padding: 10,
          borderRadius: 8,
        }}
      />

      <Button title="Sign Up" onPress={handleSignup} />
      {message ? <Text style={{ marginTop: 15 }}>{message}</Text> : null}

      <View style={{ marginTop: 20 }}>
        <Link href="/login">Already have an account? Login</Link>
      </View>
    </View>
  );
}
