// Provide minimal shims for libraries that expect Node-like globals in the browser
declare global {
  interface Window {
    process?: any;
    global?: any;
  }
}

if (typeof window !== 'undefined') {
  if (typeof window.process === 'undefined') {
    window.process = { env: {} };
  }
  if (typeof window.global === 'undefined') {
    window.global = window;
  }
}

export {};


