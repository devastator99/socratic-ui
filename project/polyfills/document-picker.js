const createDocumentPickerPolyfill = () => {
  // Web implementation for document picker
  return {
    types: {
      allFiles: "*/*",
      images: "image/*",
      pdf: "application/pdf",
      plainText: "text/plain",
      audio: "audio/*",
      video: "video/*",
      csv: "text/csv",
      zip: "application/zip",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    },
    pick: async ({ type, allowMultiSelection = false }) => {
      return new Promise((resolve, reject) => {
        try {
          // Create a file input element
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = allowMultiSelection;
          
          // Set accepted file types
          if (type && Array.isArray(type)) {
            input.accept = type.join(',');
          }
          
          // Handle file selection
          input.onchange = (event) => {
            const files = Array.from(event.target.files || []);
            const results = files.map(file => ({
              uri: URL.createObjectURL(file),
              name: file.name,
              type: file.type,
              size: file.size,
              // Add additional properties to match native implementation
              fileCopyUri: URL.createObjectURL(file),
              copyError: null,
              file // Include the actual File object for web usage
            }));
            
            resolve(results);
          };
          
          // Handle cancellation
          input.oncancel = () => {
            reject(new Error('User cancelled document picker'));
          };
          
          // Trigger the file picker
          input.click();
        } catch (error) {
          reject(error);
        }
      });
    },
    pickSingle: async (options) => {
      const results = await createDocumentPickerPolyfill().pick({
        ...options,
        allowMultiSelection: false
      });
      return results[0];
    },
    pickDirectory: async () => {
      throw new Error('pickDirectory is not supported on web');
    },
    isCancel: (err) => {
      return err && err.message === 'User cancelled document picker';
    }
  };
};

const DocumentPickerPolyfill = createDocumentPickerPolyfill();

module.exports = DocumentPickerPolyfill;
module.exports.default = DocumentPickerPolyfill;