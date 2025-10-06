/**
 * SignInScreen (Terminal Style)
 */

import React from 'react';
import { View, Alert } from 'react-native';
import { TerminalScreen, TerminalHeader, TerminalText, PromptInput, PrimaryButton, ASCIILoader } from '../components/Terminal';

const SignInScreen: React.FC = () => {
  const [walletAddress, setWalletAddress] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSignIn = () => {
    if (!walletAddress.trim()) {
      Alert.alert('Error', 'Please enter your wallet address');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Signed In', `Wallet ${walletAddress} authenticated!`);
    }, 1500);
  };

  return (
    <TerminalScreen title="SIGN IN" padding="lg">
      <TerminalText color="secondary" style={{ marginBottom: 16 }}>
        Enter your Solana wallet address to authenticate.
      </TerminalText>

      <PromptInput
        label="WALLET ADDRESS"
        value={walletAddress}
        onChangeText={setWalletAddress}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ marginBottom: 24 }}
      />

      <PrimaryButton onPress={handleSignIn} loading={loading} fullWidth>
        CONNECT WALLET
      </PrimaryButton>

      {loading && (
        <View style={{ marginTop: 24 }}>
          <ASCIILoader />
        </View>
      )}
    </TerminalScreen>
  );
};

export default SignInScreen;
