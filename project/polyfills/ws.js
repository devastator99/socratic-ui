// WebSocket polyfill for web builds
// This provides a compatible interface for Node.js 'ws' module in web environments

class WebSocketPolyfill {
  constructor(url, protocols) {
    if (typeof WebSocket !== 'undefined') {
      return new WebSocket(url, protocols);
    }
    
    // Fallback for environments without WebSocket
    console.warn('WebSocket not available in this environment');
    return {
      readyState: 3, // CLOSED
      close: () => {},
      send: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
}

WebSocketPolyfill.CONNECTING = 0;
WebSocketPolyfill.OPEN = 1;
WebSocketPolyfill.CLOSING = 2;
WebSocketPolyfill.CLOSED = 3;

module.exports = WebSocketPolyfill;
module.exports.default = WebSocketPolyfill;
