import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, TextInput, Linking, Platform } from 'react-native';
// Safe BlurView: Handle web and mobile platforms properly
let SafeBlurView: any = View; // Default to View for web and as fallback
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BlurView = require('expo-blur').BlurView;
    if (BlurView) {
      SafeBlurView = BlurView;
    }
  } catch (e) {
    console.log('expo-blur not available, using fallback');
  }
}
import { Upload, X, FileText, ChartBar as BarChart3, File, CircleCheck as CheckCircle } from 'lucide-react-native';
import { uploadAndPin } from '@/utils/ipfs';
import { trackEvent } from '@/utils/analytics';
import UploadProgress from './Upload/UploadProgress';
import UploadErrors from './Upload/UploadErrors';
import UploadEntry from './Upload/UploadEntry';

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (file: any) => void;
}

export function UploadModal({ visible, onClose, onUpload }: UploadModalProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [pinning, setPinning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastedUrl, setPastedUrl] = useState<string>('');
  // Using a broad ref type to avoid RN type mismatch; we only call .focus() safely.
  const pasteInputRef = useRef<any>(null);
  const [eta, setEta] = useState<string>('');

  const fileTypes = [
    { type: 'PDF', icon: FileText, description: 'Academic papers, books, articles' },
    { type: 'CSV', icon: BarChart3, description: 'Data sets, research data' },
    { type: 'Excel', icon: File, description: 'Spreadsheets, data analysis' },
  ];

  const startUploadWithFile = async (file: { name: string; size?: number; mimeType?: string; uri?: string }) => {
    // Validate type/size
    const supported = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const inferredMime = file.mimeType || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : file.name.toLowerCase().endsWith('.csv') ? 'text/csv' : file.name.toLowerCase().endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/octet-stream');
    if (!supported.includes(inferredMime)) {
      setError('That file type is not supported. Try PDF or CSV.');
      trackEvent('upload_error', { reason: 'unsupported_type', mime: inferredMime });
      return;
    }
    const maxBytes = 25 * 1024 * 1024; // 25MB
    if ((file.size ?? 0) > maxBytes) {
      setError('This file exceeds 25 MB. Try compressing or splitting the file.');
      trackEvent('upload_error', { reason: 'file_too_large', size: file.size ?? 0 });
      return;
    }

    setIsUploading(true);
    setPinning(false);
    setUploadProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);

    trackEvent('upload_started', { name: file.name, size: file.size ?? 0 });
    const startTime = Date.now();
    uploadAndPin({ name: file.name, size: file.size } as any, {
      onProgress: (p) => {
        setUploadProgress(p.percent);
        const elapsedMs = Math.max(1, Date.now() - startTime);
        const bps = p.bytesUploaded / (elapsedMs / 1000);
        const remaining = Math.max(0, p.bytesTotal - p.bytesUploaded);
        const secs = remaining / Math.max(1, bps);
        const pretty = secs < 5 ? '~a few sec' : secs < 60 ? `~${Math.round(secs)}s` : `~${Math.round(secs/60)}m`;
        setEta(pretty + ' remaining');
      },
      signal: controller.signal,
    })
      .then((res) => {
        setPinning(true);
        trackEvent('ipfs_pin_succeeded', { duration: res.ms, cid: res.cid, bytes: res.bytes });
        setTimeout(() => {
          setUploadComplete(true);
          onUpload?.({ ...file, cid: res.cid });
          trackEvent('ai_processing_started', { cid: res.cid });
          setTimeout(() => {
            setIsUploading(false);
            setPinning(false);
            setUploadComplete(false);
            setUploadProgress(0);
            abortRef.current = null;
            onClose();
          }, 1200);
        }, 350);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') {
          trackEvent('upload_canceled');
        } else {
          trackEvent('ipfs_pin_failed', { error: String(err?.message || err) });
          setError('We could not complete the upload. Please try again.');
        }
        setIsUploading(false);
        setPinning(false);
        setUploadProgress(0);
        abortRef.current = null;
        setEta('');
      });
  };

  const pickFile = async () => {
    try {
      // Dynamically import to avoid hard dependency in environments without expo-document-picker
      // @ts-ignore - silence type error if the module is not installed locally
      const DocumentPicker = await import('expo-document-picker');
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: false,
        multiple: false,
      } as any);
      // expo-document-picker v14 returns { canceled: boolean, assets?: [...] }
      // older versions return { type: 'success'|'cancel', name, size, uri, mimeType }
      // Handle both shapes
      // @ts-ignore
      if ((res.canceled === true) || (res.type === 'cancel')) {
        trackEvent('file_picker_canceled');
        return;
      }
      let fileData: any;
      // @ts-ignore
      if (res.assets && res.assets.length) {
        fileData = res.assets[0];
      } else {
        fileData = res;
      }
      const file = {
        name: fileData.name || 'document',
        size: fileData.size,
        mimeType: fileData.mimeType,
        uri: fileData.uri,
      };
      trackEvent('file_selected', { type: file.mimeType, size: file.size });
      await startUploadWithFile(file);
    } catch (e) {
      // If import fails (not installed), fallback to mock PDF
      trackEvent('file_picker_unavailable', { error: String(e) });
      handleFileTypeSelect('PDF');
    }
  };

  const handleFileTypeSelect = (type: string) => {
    // In lieu of a real file picker, create a mock file object based on type
    const mockSize = type === 'PDF' ? 1024 * 1024 * 3 : type === 'CSV' ? 1024 * 600 : 1024 * 800;
    const mockFile = { name: `Untitled.${type.toLowerCase()}`, size: mockSize, mimeType: type === 'PDF' ? 'application/pdf' : type === 'CSV' ? 'text/csv' : 'application/vnd.ms-excel' };
    trackEvent('upload_opened', { source: 'UploadModal' });
    trackEvent('file_selected', { type, size: mockSize });
    startUploadWithFile(mockFile);
  };

  const handlePasteLinkUpload = () => {
    const url = pastedUrl.trim();
    if (!url) return;
    trackEvent('paste_link_used', { url_domain: (() => { try { return new URL(url).hostname; } catch { return 'invalid'; } })() });
    // Very rough URL validation
    try { new URL(url); } catch {
      setError('Please enter a valid URL.');
      return;
    }
    // Assume remote size unknown; use small size estimate and mark type by extension
    const lower = url.toLowerCase();
    const isPdf = lower.endsWith('.pdf');
    const isCsv = lower.endsWith('.csv');
    const mimeType = isPdf ? 'application/pdf' : isCsv ? 'text/csv' : 'application/octet-stream';
    const name = url.split('/').pop() || 'document';
    handleFileTypeSelect(isPdf ? 'PDF' : isCsv ? 'CSV' : 'Excel');
  };

  const resetModal = () => {
    // abort in-flight upload
    abortRef.current?.abort();
    setIsUploading(false);
    setUploadComplete(false);
    setUploadProgress(0);
    setPinning(false);
    abortRef.current = null;
    setEta('');
    onClose();
  };

  // Always use View for web, SafeBlurView for mobile
  const BlurComponent = Platform.OS === 'web' ? View : SafeBlurView;
  const blurProps = Platform.OS === 'web' ? {} : { intensity: 80 };

  if (isUploading || uploadComplete) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <BlurComponent 
          {...blurProps} 
          style={[styles.overlay, Platform.OS === 'web' && styles.overlayBackground]}
        >
          <View style={styles.uploadContainer}>
            {uploadComplete ? (
              <View style={styles.uploadComplete}>
                <CheckCircle size={48} color="#FFFFFF" strokeWidth={1.5} />
                <Text style={styles.uploadCompleteTitle}>Upload Complete!</Text>
                <Text style={styles.uploadCompleteText}>
                  Document processed and ready for AI chat
                </Text>
              </View>
            ) : (
              <View style={styles.uploadProgress}>
                <UploadProgress title="Uploading to IPFS" percent={uploadProgress} eta={pinning ? undefined : eta} pinning={pinning} />
                <TouchableOpacity style={styles.cancelButton} onPress={resetModal} accessibilityLabel="Cancel upload">
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </BlurComponent>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <BlurComponent 
        {...blurProps} 
        style={[styles.overlay, Platform.OS === 'web' && styles.overlayBackground]}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload Document</Text>
            <TouchableOpacity style={styles.closeButton} onPress={resetModal}>
              <X size={20} color="#888888" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Pick a file type. We’ll upload securely to IPFS and get you ready to ask questions in ~30–60s.
          </Text>

          {/* Entry CTA row */}
          <UploadEntry
            onChooseFile={() => { trackEvent('choose_file_clicked'); pickFile(); }}
            onPasteLink={() => { trackEvent('paste_link_focus'); pasteInputRef.current?.focus(); }}
            onImportCloud={() => { trackEvent('cloud_import_clicked'); setError('Cloud import coming soon.'); }}
          />

          <Text style={styles.helperText}>Supported: PDF, CSV, Excel • Up to 25 MB</Text>

          <UploadErrors message={error || undefined} />

          <View style={styles.fileTypes}>
            {fileTypes.map((fileType) => (
              <TouchableOpacity
                key={fileType.type}
                style={styles.fileTypeCard}
                onPress={() => handleFileTypeSelect(fileType.type)}
              >
                <View style={styles.fileTypeIcon}>
                  <fileType.icon size={24} color="#FFFFFF" strokeWidth={1.5} />
                </View>
                <View style={styles.fileTypeContent}>
                  <Text style={styles.fileTypeTitle}>{fileType.type}</Text>
                  <Text style={styles.fileTypeDescription}>{fileType.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.uploadInfo}>
            <Text style={styles.uploadInfoTitle}>What happens next?</Text>
            <Text style={styles.uploadInfoText}>
              • Upload to IPFS (content‑addressed){'\n'}
              • Prepare content for AI chat{'\n'}
              • Ready in ~30–60 seconds
            </Text>
          </View>

          <View style={styles.privacyRow}>
            <Text style={styles.privacyText}>Your file is stored on IPFS and processed to enable AI chat.</Text>
            <TouchableOpacity
              onPress={() => {
                trackEvent('privacy_policy_clicked');
                Linking.openURL('https://example.com/privacy').catch(() => {});
              }}
              accessibilityLabel="Open privacy policy"
            >
              <Text style={styles.privacyLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 16 }} />
          <Text style={styles.uploadInfoTitle}>Or paste a link</Text>
          <View style={styles.pasteRow}>
            <TextInput
              ref={pasteInputRef}
              style={styles.pasteInput}
              placeholder="https://example.com/file.pdf"
              placeholderTextColor="#666"
              value={pastedUrl}
              onChangeText={setPastedUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel="Paste link input"
            />
            <TouchableOpacity style={styles.pasteButton} onPress={handlePasteLinkUpload} accessibilityLabel="Upload from link">
              <Text style={styles.pasteButtonText}>Upload</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurComponent>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
    marginBottom: 24,
    lineHeight: 22,
  },
  helperText: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 12,
  },
  fileTypes: {
    gap: 12,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#2a0000',
    borderColor: '#550000',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#ffb3b3',
    fontSize: 13,
  },
  fileTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
  },
  fileTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fileTypeContent: {
    flex: 1,
  },
  fileTypeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fileTypeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 2,
  },
  uploadInfo: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
  },
  uploadInfoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '600',
  },
  uploadInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
    lineHeight: 20,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  privacyText: {
    color: '#888888',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  privacyLink: {
    color: '#8ab4ff',
    fontSize: 12,
    fontWeight: '600',
  },
  pasteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  pasteInput: {
    flex: 1,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 10,
    height: 40,
  },
  pasteButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pasteButtonText: {
    color: '#000000',
    fontWeight: '700',
  },
  uploadingModal: {
    backgroundColor: '#000000',
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  uploadProgress: {
    alignItems: 'center',
  },
  progressIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadProgressTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#222222',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  uploadProgressSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  etaText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
  },
  cancelText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  uploadComplete: {
    alignItems: 'center',
  },
  uploadCompleteTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: 16,
    fontWeight: '600',
  },
  uploadCompleteText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 8,
    textAlign: 'center',
  },
});