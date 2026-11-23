(function() {
    // Check if we're on YouTube or a chrome:// page
    if (window.location.href.toLowerCase().includes('youtube') || 
        window.location.href.toLowerCase().startsWith('chrome://')) {
        return;
    }

    const redirectUrl = (url) => {
        if (typeof url === 'string' && (url.startsWith('chrome-extension://') || url.includes('deojfdehldjjfmcjcfaojgaibalafifc'))) {
            if (url.includes('mock_manifest.json')) return url;
            if (url.includes('manifest.json')) {
                return url.replace(/manifest\.json$/, 'data/inject/mock_code/mock_manifest.json');
            }
            if (url.includes('minifiedBackground.js') && !url.includes('mock_code')) {
                return url.replace(/minifiedBackground\.js$/, 'data/inject/mock_code/minifiedBackground.js');
            }
            if ((url.includes('minifiedContent-script.js') || url.includes('minifiedContent.js')) && !url.includes('mock_code')) {
                return url.replace(/minifiedContent(?:-script)?\.js$/, 'data/inject/mock_code/minifiedContent-script.js');
            }
            if (url.includes('rules.json') && !url.includes('mock_code')) {
                return url.replace(/rules\.json$/, 'data/inject/mock_code/rules.json');
            }
        }
        return url;
    };

    // Override fetch to redirect extension file requests
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        try {
            if (args[0]) {
                args[0] = redirectUrl(args[0]);
            }
            return await originalFetch.apply(this, args);
        } catch (error) {
            return await originalFetch.apply(this, args);
        }
    };

    // Override XMLHttpRequest to redirect extension file requests
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        try {
            if (url) {
                url = redirectUrl(url);
            }
        } catch (e) {}
        return originalOpen.call(this, method, url, ...rest);
    };

    console.log('✅ Mock code fetch & XHR interceptors installed for NeoExamShield');
})();
