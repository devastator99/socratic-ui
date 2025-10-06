import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Upload, FileText, Image, File, X, CheckCircle, AlertTriangle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';

interface DocumentUploadCardProps {
  onUploadStart?: (file: DocumentPicker.DocumentResult) => void;
  onUploadComplete?: (uploadId: string, file: DocumentPicker.DocumentResult) => void;
  onUploadError?: (error: string) => void;
  acceptedTypes?: string[];
  maxSizeBytes?: number;
  disabled?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
}

interface UploadProgress {
  file: DocumentPicker.DocumentResult;
  uploadId?: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export function DocumentUploadCard({
  onUploadStart,
  onUploadComplete,
  onUploadError,
  acceptedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  variant = 'default'
}: DocumentUploadCardProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText size={24} color="#EF4444" />;
    }
    if (mimeType.includes('image')) {
      return <Image size={24} color="#10B981" />;
    }
    return <File size={24} color="#6366F1" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: DocumentPicker.DocumentResult): string | null => {
    if (file.type === 'cancel') return null;
    
    const document = file as DocumentPicker.DocumentPickerAsset;
    
    // Check file type
    if (acceptedTypes.length > 0 && document.mimeType && !acceptedTypes.includes(document.mimeType)) {
      return `File type ${document.mimeType} is not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }
    
    // Check file size
    if (document.size && document.size > maxSizeBytes) {
      return `File size ${formatFileSize(document.size)} exceeds maximum allowed size of ${formatFileSize(maxSizeBytes)}`;
    }
    
    return null;
  };

  const handleDocumentPick = async () => {
    if (disabled || uploadProgress) return;
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes.length > 0 ? acceptedTypes : '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.type === 'cancel') return;

      const document = result as DocumentPicker.DocumentPickerAsset;
      const validationError = validateFile(result);
      
      if (validationError) {
        Alert.alert('Upload Error', validationError);
        onUploadError?.(validationError);
        return;
      }

      // Start upload process
      setUploadProgress({
        file: result,
        progress: 0,
        status: 'uploading'
      });

      onUploadStart?.(result);
      
      // Simulate upload progress (replace with actual upload logic)
      await simulateUpload(result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pick document';
      Alert.alert('Error', errorMessage);
      onUploadError?.(errorMessage);
      setUploadProgress(null);
    }
  };

  const simulateUpload = async (file: DocumentPicker.DocumentResult) => {
    // This is a simulation - replace with actual upload API call
    const uploadId = `upload_${Date.now()}`;
    
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      setUploadProgress(prev => prev ? { ...prev, progress, uploadId } : null);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Simulate processing
    setUploadProgress(prev => prev ? { ...prev, status: 'processing' } : null);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Complete
    setUploadProgress(prev => prev ? { ...prev, status: 'complete', progress: 100 } : null);
    onUploadComplete?.(uploadId, file);
    
    // Clear after a delay
    setTimeout(() => setUploadProgress(null), 2000);
  };

  const clearUpload = () => {
    setUploadProgress(null);
  };

  const renderUploadProgress = () => {
    if (!uploadProgress) return null;
    
    const document = uploadProgress.file as DocumentPicker.DocumentPickerAsset;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <View style={styles.fileInfo}>
            {getFileIcon(document.mimeType || '')}
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>
                {document.name}
              </Text>
              <Text style={styles.fileSize}>
                {document.size ? formatFileSize(document.size) : 'Unknown size'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={clearUpload} style={styles.clearButton}>
            <X size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${uploadProgress.progress}%` },
                uploadProgress.status === 'error' && styles.progressError
              ]} 
            />
          </View>
          
          <View style={styles.statusContainer}>
            {uploadProgress.status === 'uploading' && (
              <Text style={styles.statusText}>
                Uploading... {uploadProgress.progress}%
              </Text>
            )}
            {uploadProgress.status === 'processing' && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.statusText}>Processing document...</Text>
              </View>
            )}
            {uploadProgress.status === 'complete' && (
              <View style={styles.completeContainer}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={[styles.statusText, { color: '#10B981' }]}>
                  Upload complete!
                </Text>
              </View>
            )}
            {uploadProgress.status === 'error' && (
              <View style={styles.errorContainer}>
                <AlertTriangle size={16} color="#EF4444" />
                <Text style={[styles.statusText, { color: '#EF4444' }]}>
                  {uploadProgress.error || 'Upload failed'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (variant === 'minimal') {
    return (
      <TouchableOpacity 
        onPress={handleDocumentPick}
        disabled={disabled || !!uploadProgress}
        style={[styles.minimalButton, disabled && styles.disabled]}
      >
        <Upload size={20} color={disabled ? "#9CA3AF" : "#6366F1"} />
        <Text style={[styles.minimalText, disabled && styles.disabledText]}>
          Upload Document
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        {uploadProgress ? renderUploadProgress() : (
          <TouchableOpacity 
            onPress={handleDocumentPick}
            disabled={disabled}
            style={[styles.compactCard, disabled && styles.disabled]}
          >
            <Upload size={24} color={disabled ? "#9CA3AF" : "#6366F1"} />
            <Text style={[styles.compactText, disabled && styles.disabledText]}>
              Upload Document
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Default variant
  return (
    <View style={styles.container}>
      {uploadProgress ? (
        renderUploadProgress()
      ) : (
        <TouchableOpacity 
          onPress={handleDocumentPick}
          disabled={disabled}
          style={[
            styles.uploadCard,
            isDragOver && styles.dragOver,
            disabled && styles.disabled
          ]}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.iconContainer}
          >
            <Upload size={32} color="#FFFFFF" />
          </LinearGradient>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, disabled && styles.disabledText]}>
              Upload Document
            </Text>
            <Text style={[styles.subtitle, disabled && styles.disabledText]}>
              PDF, Word, or Text files up to {formatFileSize(maxSizeBytes)}
            </Text>
          </View>
          
          <View style={styles.supportedTypes}>
            <Text style={[styles.supportedText, disabled && styles.disabledText]}>
              Supported: PDF, DOCX, TXT
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  
  uploadCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  
  dragOver: {
    borderColor: '#6366F1',
    backgroundColor: '#F0F4FF',
  },
  
  disabled: {
    opacity: 0.5,
  },
  
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  textContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  supportedTypes: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  
  supportedText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  disabledText: {
    color: '#9CA3AF',
  },
  
  // Compact variant
  compactContainer: {
    marginVertical: 4,
  },
  
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  
  compactText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 12,
  },
  
  // Minimal variant
  minimalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  
  minimalText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6366F1',
    marginLeft: 8,
  },
  
  // Progress styles
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
  },
  
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  clearButton: {
    padding: 4,
  },
  
  progressBarContainer: {
    marginTop: 8,
  },
  
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  
  progressError: {
    backgroundColor: '#EF4444',
  },
  
  statusContainer: {
    marginTop: 8,
  },
  
  statusText: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  completeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
