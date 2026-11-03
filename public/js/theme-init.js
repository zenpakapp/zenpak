// Applies the light / dark choice made in the app (stored by client/composables/useTheme.js) to the
// pages the server renders. "auto" or no choice leaves the system setting to the stylesheet.
// An external file: the content security policy does not allow inline scripts.
(function applyStoredTheme() {
    try {
        var mode = localStorage.getItem('lp-theme');
        if (mode === 'light' || mode === 'dark') document.documentElement.setAttribute('data-theme', mode);
    } catch (err) {
        // Storage blocked: the system setting applies.
    }
}());
