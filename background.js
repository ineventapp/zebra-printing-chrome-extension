importScripts('ipp.js'); // Import the IPP library

console.log('[InEvent Zebra Printer] loaded: background.js', brother)

function dataUrlToArrayBuffer(dataUrl) {
  // Decode the base64 string
  const base64String = dataUrl.split(',')[1];
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}

function doZebraRequest(message, sendResponse) {
  const controller = new AbortController();
  const signal = controller.signal;

  const timeoutId = setTimeout(() => {
      controller.abort();
      sendResponse({ success: false, data: 'Request timed out' });
  }, 5000);

  console.log("doZebraRequest", message);

  fetch(message.url, {
    method: message.method,
    body: message.zpl,
    mode: 'no-cors',
    signal: signal
  })
  .then(response => {
    if (response.status < 200 || response.status > 299) {
      console.log('Error:', 'status: ' + response.status);
      sendResponse({ success: false, data: response.status });
    } else {
      return response.text()
    }
  })
  .then(data => {
    clearTimeout(timeoutId);
    console.log('response', 'received');
    sendResponse({ success: true, data: data });
  })
  .catch(error => {
    console.log('Error:', error);
    sendResponse({ success: false, data: error });
  });
};

function doBrotherRequest(message, sendResponse) {
  console.log("doBrotherRequest", message);

  if (!message.pngData) {
    doZebraRequest({
      url: message.url,
      method: "GET"
    }, sendResponse);
    return;
  }

  console.log("doBrotherRequestArrayBuffer", message, dataUrlToArrayBuffer(message.pngData));

  brother.printPngBuffer(message.url, Buffer.from(dataUrlToArrayBuffer(message.pngData))).then((res) => {
    console.log('success', res);
    sendResponse({ success: true, data: [ 'Print job submitted successfully', res ] });
  }).catch((err) => {
    console.log('error', err);
    sendResponse({ success: false, data: [ 'Error submitting print job', err ] });
  })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  chrome.permissions.getAll((permissions) => {
    const allowedUrls = permissions.origins || [];
    const url = message.url.replace(":631", "");

    if (allowedUrls.includes(url)) {
      if (message.type == 'in_zebra_printer') {
        doZebraRequest(message, sendResponse);
      } else if (message.type == 'in_brother_printer'){ 
        doBrotherRequest(message, sendResponse);
      } else {
        sendResponse({ success: false, data: 'invalid type!' });
      }
    } else {
      chrome.permissions.request({
        origins: [ url ]
      }, (granted) => {
        if (granted) {
          if (message.type == 'in_zebra_printer') {
            doZebraRequest(message, sendResponse) ;
          } else if (message.type == 'in_brother_printer'){ 
            doBrotherRequest(message, sendResponse);
          } else {
            sendResponse({ success: false, data: 'invalid type!' });
          }
        } else {
          sendResponse({ success: false, data: 'permission denied' });
        }
      });
    }
  });

  return true;
});
  