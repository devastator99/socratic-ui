/**
 * SignUpScreen (Terminal Style)
 */

import React from 'react';
import { Alert } from 'react-native';
import { TerminalScreen, TerminalHeader, TerminalText, PromptInput, PrimaryButton } from '../components/Terminal';

const SignUpScreen: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSignUp = () => {
    if (!email.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill out all fields');
      return;
    }

    Alert.alert('Account Created', `Welcome, ${username}!`);
  };

  return (
    <TerminalScreen title="CREATE ACCOUNT" padding="lg">
      <TerminalHeader level={2}>User Details</TerminalHeader>

      <PromptInput
        label="EMAIL"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ marginBottom: 16 }}
      />

      <PromptInput
        label="USERNAME"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        style={{ marginBottom: 16 }}
      />

      <PromptInput
        label="PASSWORD"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ marginBottom: 24 }}
      />

      <PrimaryButton onPress={handleSignUp} fullWidth>
        CREATE ACCOUNT
      </PrimaryButton>
    </TerminalScreen>
  );
};

export default SignUpScreen;
