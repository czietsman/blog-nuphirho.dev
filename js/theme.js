/* nuphirho.dev -- theme.js
 * Manages light/dark theme with system preference detection
 * and manual toggle persisted in localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'nuphirho-theme';

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // localStorage unavailable; degrade gracefully
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateToggleLabel(theme);
  }

  function updateToggleLabel(theme) {
    var button = document.getElementById('theme-toggle');
    if (!button) return;
    if (theme === 'dark') {
      button.textContent = 'Light';
      button.setAttribute('aria-label', 'Switch to light theme');
    } else {
      button.textContent = 'Dark';
      button.setAttribute('aria-label', 'Switch to dark theme');
    }
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function toggleTheme() {
    var current = getCurrentTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setStoredTheme(next);
  }

  // Apply theme immediately to prevent flash
  var stored = getStoredTheme();
  var initial = stored || getSystemTheme();
  applyTheme(initial);

  // Listen for system theme changes (only if no manual preference stored)
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!getStoredTheme()) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Expose toggle for the button
  window.nuphirhoToggleTheme = toggleTheme;

  // Bind button once DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('theme-toggle');
    if (button) {
      updateToggleLabel(getCurrentTheme());
      button.addEventListener('click', toggleTheme);
    }
  });
})();
