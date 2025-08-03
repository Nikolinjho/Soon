/**
 * Get the appropriate renderer object based on the environment
 * @returns {Object} ipcRenderer in Electron, empty object in web
 */
const getRenderer = () => {
  // Check if we're in an Electron environment
  if (typeof window !== 'undefined' && window.require) {
    try {
      return window.require('electron').ipcRenderer;
    } catch (error) {
      console.warn('Failed to load electron ipcRenderer:', error);
      return {};
    }
  }

  // Web environment - return empty object
  return {};
};

/**
 * Check if the current environment is Electron
 * @returns {boolean} True if running in Electron
 */
const isElectron = () => {
  return typeof window !== 'undefined' && window.require;
};

/**
 * Check if the current environment is web browser
 * @returns {boolean} True if running in web browser
 */
const isWeb = () => {
  return !isElectron();
};

export { getRenderer, isElectron, isWeb };
