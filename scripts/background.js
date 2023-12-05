// CONST
// Listen HTTP requests to this Apple website only
const URLS = ["*://reportaproblem.apple.com/api/purchase/search/*"];

// GLOBAL VARIABLES
let requestHistory = null;

// Store HTTP request history
// Key: tab ID
class RequestHistory {
    constructor() {
        // Map<<tabId, requestId>, dsid>>
        this.map_tabId_dsid = new Map();
        // Map<<tabId, requestId>, dsid>>
        this.map_tabId_headers = new Map();

        this.lastTabId = null;
        this.lastRequestId = null;
    }

    to_key(tabId, requestId) {
        return tabId.toString() + "-" + requestId.toString();
    }

    from_key(key) {
        let arr = key.split("-");
        return {
            tabId: arr[0],
            requestId: arr[1]
        };
    }

    record_before_request(details) {
        // Grab key
        const tabId = details.tabId;
        const requestId = details.requestId;
        const key = this.to_key(tabId, requestId);

        // Grab dsid
        const raw = details.requestBody.raw[0].bytes;
        const decoder = new TextDecoder();
        const str = decoder.decode(raw);
        const obj = JSON.parse(str);
    
        const dsid = obj["dsid"];

        // Set Map
        this.map_tabId_dsid.set(key, dsid);
        // console.log("map_tabId_dsid", this.map_tabId_dsid);
    }

    record_send_headers(details) {
        // Grab key
        const tabId = details.tabId;
        const requestId = details.requestId;
        const key = this.to_key(tabId, requestId);

        const headers = details.requestHeaders;

        // Set Map
        this.map_tabId_headers.set(key, headers);
        // console.log("map_tabId_headers", this.map_tabId_headers);

        // Set the last tabId and requestId here
        this.lastTabId = tabId;
        this.lastRequestId = requestId;
    }
}


function registerListeners() {
    chrome.webRequest.onBeforeRequest.addListener((details) => {
        requestHistory.record_before_request(details);
    }, {
        urls: URLS
    }, ["requestBody", "extraHeaders"]);


    chrome.webRequest.onSendHeaders.addListener((details) => {
        requestHistory.record_send_headers(details);
    }, {
        urls: URLS
    }, ["requestHeaders"]);
}

// Unregister listeners when we start fetching
function unregisterListeners() {
    chrome.webRequest.onBeforeRequest.removeListener();
    chrome.webRequest.onSendHeaders.removeListener();
}

// Reset all global variables
function reset() {
    requestHistory = new RequestHistory();
}

(function main() {
    console.log("background.js main called",);

    reset();
    registerListeners();
})();
