function registerListeners() {
    chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
        urls: URLS
    }, ["requestBody", "extraHeaders"]);
    
    
    chrome.webRequest.onSendHeaders.addListener(onSendHeaders, {
        urls: URLS
    }, ["requestHeaders"]);
}    

// Only intercept the first request
let tabId = null;
// String
let requestId = null;
// String
let dsid = null;

// Headers
// Array of {name, value}
let headers = null;

// Grabs request body
function onBeforeRequest(details) {
    if (requestId !== null) {
        return;
    }

    console.trace("onBeforeRequest", details);

    tabId = details.tabId;

    requestId = details.requestId;

    const raw = details.requestBody.raw[0].bytes;
    var decoder = new TextDecoder();
    const str = decoder.decode(raw);
    const obj = JSON.parse(str);

    dsid = obj["dsid"];
}

// Grabs request header
function onSendHeaders(details) {
    if (requestId !== details.requestId) {
        return;
    }

    console.trace("onSendHeaders", details);

    headers = details.requestHeaders;
}

// Listen HTTP requests to this Apple website only
const URLS = ["*://reportaproblem.apple.com/api/purchase/search/*"];

(function main() {
    console.log("background.js main called",);

    registerListeners();
})();
