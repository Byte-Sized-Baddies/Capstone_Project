import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { signInWithEmail } from '../../lib/auth'; // adjust path if needed
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

  return (
    <View style={{ padding: 20, marginTop: 100 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Login</Text>

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

      <Button title="Login" onPress={handleLogin} />
      {message ? <Text style={{ marginTop: 15 }}>{message}</Text> : null}

      <View style={{ marginTop: 20 }}>
        <Link href="/signup">Don’t have an account? Sign up</Link>
      </View>
    </View>
  );
}
