console.log('[InEvent Zebra Printer] loaded: content.js')

window.addEventListener("message", function (event) {
    if (typeof event.data.type === 'undefined') {
        return;
    }

    if (event.data.type != 'in_zebra_printer' && event.data.type != 'in_brother_printer') {
        return;
    }

    console.log('print', event.data);

    chrome.runtime.sendMessage(event.data, function (response) {
        console.log('response', response);
        window.postMessage({ inZebraResponse: response }, "*");
    });
}, false);

window.postMessage({
    inZebra: {
        extensionId: chrome.runtime.id,
        version: chrome.runtime.getManifest().version
    }
});