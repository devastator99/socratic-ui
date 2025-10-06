import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type UploadEntryProps = {
  title?: string;
  subtitle?: string;
  onChooseFile?: () => void;
  onPasteLink?: () => void;
  onImportCloud?: () => void;
};

export const UploadEntry: React.FC<UploadEntryProps> = ({
  title = 'Upload a document to learn with AI',
  subtitle = 'Pick a file or paste a link. We’ll prep it and you can ask questions in ~30–60s.',
  onChooseFile,
  onPasteLink,
  onImportCloud,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={{ height: 12 }} />
      <Text style={styles.helper}>Supported: PDF, CSV, Excel • Up to 25 MB</Text>
      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.primary} onPress={onChooseFile} accessibilityLabel="Choose file">
          <Text style={styles.primaryText}>Choose file</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onPasteLink} accessibilityLabel="Paste link">
          <Text style={styles.secondaryText}>Paste link</Text>
        </TouchableOpacity>
        {onImportCloud && (
          <TouchableOpacity style={styles.secondary} onPress={onImportCloud} accessibilityLabel="Import from Drive">
            <Text style={styles.secondaryText}>Drive</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#000', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#ccc', marginTop: 6 },
  helper: { color: '#888', fontSize: 12 },
  buttonsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primary: { backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  primaryText: { color: '#000', fontWeight: '700' },
  secondary: { backgroundColor: '#111', borderColor: '#222', borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  secondaryText: { color: '#fff', fontWeight: '600' },
});

export default UploadEntry;
