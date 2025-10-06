// Temporary mock for expo-speech
const Speech = {
  speak: (text: string) => {
    console.log('Speech.speak:', text);
    return Promise.resolve();
  },
  stop: () => {
    console.log('Speech.stop');
    return Promise.resolve();
  },
  isSpeakingAsync: () => {
    return Promise.resolve(false);
  }
};

export default Speech;
