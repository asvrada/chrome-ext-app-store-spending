// CONST
// Listen HTTP requests to this Apple website only
const URLS = ["*://reportaproblem.apple.com/api/purchase/search/*"];

// GLOBAL VARIABLES
let requestHistory = null;
let mapTabIdFetchJobs = null;

// Store HTTP request history
// Key: tab ID
class RequestHistory {
    constructor() {
        // Map<<tabId, requestId>, dsid>>
        this.mapTabIdDsid = new Map();
        // Map<<tabId, requestId>, dsid>>
        this.mapTabIdHeaders = new Map();

        this.lastTabId = null;
        this.lastRequestId = null;
    }

    toKey(tabId, requestId) {
        return tabId.toString() + "-" + requestId.toString();
    }

    fromKey(key) {
        let arr = key.split("-");
        return {
            tabId: arr[0],
            requestId: arr[1]
        };
    }

    recordBeforeRequest(details) {
        // Grab key
        const tabId = details.tabId;
        const requestId = details.requestId;
        const key = this.toKey(tabId, requestId);

        // Grab dsid
        const raw = details.requestBody.raw[0].bytes;
        const decoder = new TextDecoder();
        const str = decoder.decode(raw);
        const obj = JSON.parse(str);

        const dsid = obj["dsid"];

        // Set Map
        this.mapTabIdDsid.set(key, dsid);
        // console.log("map_tabId_dsid", this.map_tabId_dsid);
    }

    recordSendHeaders(details) {
        // Grab key
        const tabId = details.tabId;
        const requestId = details.requestId;
        const key = this.toKey(tabId, requestId);

        const headers = details.requestHeaders;

        // Set Map
        this.mapTabIdHeaders.set(key, headers);
        // console.log("map_tabId_headers", this.map_tabId_headers);

        // Set the last tabId and requestId here
        this.lastTabId = tabId;
        this.lastRequestId = requestId;
    }
}

class FetchJob {
    constructor(dsid, arr_headers) {
        this.dsid = dsid;
        this.headers = {};

        // convert array of headers into dict
        for (const each of arr_headers) {
            let k = each["name"];
            let v = each["value"];
            this.headers[k] = v;
        }

        // 0: stopped
        // 1: running
        this.status = 0;
    }

    stop() {
        this.status = 0;
    }

    // Fetch everything
    async start() {
        this.status = 1;

        let result = await this.doFetch(null);

        while (this.status === 1 && result.nextBatchId !== null) {
            // Sleep
            await new Promise(r => setTimeout(r, 400));

            result = await this.doFetch(result.nextBatchId);
        }
    }

    // Fetch once
    async doFetch(batchId) {
        const body = batchId === null ? {
            dsid: this.dsid,
        } : {
            batchId,
            dsid: this.dsid,
        };

        const res = await fetch("https://reportaproblem.apple.com/api/purchase/search", {
            "headers": {
                "accept-language": "en-US,en;q=0.9",
                ...this.headers
            },
            "referrer": "https://reportaproblem.apple.com/?s=6",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": JSON.stringify(body),
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        });

        if (res.status !== 200) {
            throw "Fetch failed";
        }

        const data = await res.json();
        const nextBatchId = data.nextBatchId === "" ? null : data.nextBatchId;

        return {
            nextBatchId,
            purchases: data.purchases
        };
    }
}

function registerListeners() {
    chrome.webRequest.onBeforeRequest.addListener((details) => {
        requestHistory.recordBeforeRequest(details);
    }, {
        urls: URLS
    }, ["requestBody", "extraHeaders"]);


    chrome.webRequest.onSendHeaders.addListener((details) => {
        requestHistory.recordSendHeaders(details);
    }, {
        urls: URLS
    }, ["requestHeaders"]);

    // Listen to messages from popup.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Got message", request);

        if (request.message === "START") {
            const tabId = request.tabId;

            startFetchJob(tabId);
        } else if (request.message === "STOP") {
            const tabId = request.tabId;

            stopFetchJob(tabId);
        }
    });
}

// // Unregister listeners when we start fetching
// function unregisterListeners() {
//     chrome.webRequest.onBeforeRequest.removeListener();
//     chrome.webRequest.onSendHeaders.removeListener();
// }

function startFetchJob(tabId) {
    if (requestHistory.lastTabId === null
        || requestHistory.lastRequestId === null) {
        throw "Refresh page and try again";
    }

    const key = requestHistory.toKey(requestHistory.lastTabId, requestHistory.lastRequestId);
    const dsid = requestHistory.mapTabIdDsid.get(key);
    const arr_headers = requestHistory.mapTabIdHeaders.get(key);

    // Create a FetchJob for this tabId
    if (mapTabIdFetchJobs.has(tabId)
        && mapTabIdFetchJobs.get(tabId).status === 1) {
        throw "Already started a Fetch Job for current tab";
    }

    const fetchJob = new FetchJob(dsid, arr_headers);
    mapTabIdFetchJobs.set(tabId, fetchJob);
    fetchJob.start();
}

function stopFetchJob(tabId) {
    mapTabIdFetchJobs.has(tabId) && mapTabIdFetchJobs.get(tabId).stop();
}

// Reset all global variables
function reset() {
    requestHistory = new RequestHistory();
    mapTabIdFetchJobs = new Map();
}

(function main() {
    console.log("background.js main called",);

    reset();
    registerListeners();
})();
