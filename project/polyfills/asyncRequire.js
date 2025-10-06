// Polyfill for metro-runtime/src/modules/asyncRequire
// This is used when metro-runtime is not available but Solana wallet adapters expect it

// Simple async require implementation for web compatibility
function asyncRequire(moduleId) {
  return Promise.resolve(require(moduleId));
}

// Export for CommonJS
module.exports = asyncRequire;

// Export for ES modules
module.exports.default = asyncRequire;

// Also export as named export
module.exports.asyncRequire = asyncRequire;
