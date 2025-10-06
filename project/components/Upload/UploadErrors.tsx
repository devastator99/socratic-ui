import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type UploadErrorsProps = { message?: string };

export const UploadErrors: React.FC<UploadErrorsProps> = ({ message }) => {
  if (!message) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { backgroundColor: '#2a0000', borderColor: '#550000', borderWidth: 1, borderRadius: 8, padding: 10 },
  text: { color: '#ffb3b3' },
});

export default UploadErrors;
