import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export type UploadProgressProps = {
  title?: string;
  percent?: number;
  eta?: string;
  pinning?: boolean;
};

export const UploadProgress: React.FC<UploadProgressProps> = ({ title = 'Uploading to IPFS', percent = 0, eta, pinning }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#fff" />
      <Text style={styles.title}>{pinning ? 'Finalizing on IPFS…' : title}</Text>
      <Text style={styles.percent}>{Math.round(percent)}%</Text>
      {!!eta && !pinning && <Text style={styles.eta}>{eta}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  title: { color: '#fff', fontWeight: '700', marginTop: 8 },
  percent: { color: '#ccc' },
  eta: { color: '#888', fontSize: 12 },
});

export default UploadProgress;
