// Temporary mock for expo-permissions
const Permissions = {
  AUDIO_RECORDING: 'audioRecording',
  askAsync: async (permission: string) => {
    console.log('Permissions.askAsync:', permission);
    return { status: 'granted' };
  }
};

export default Permissions;
