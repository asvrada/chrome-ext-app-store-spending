import { Purchase, RequestHistory, FetchJob, FetchJobState } from "./classes.js";
import { FreeItemFilter, SingleEntryConverter, TotalAmountAggregator } from "./postprocessing.js";

// CONST
// Listen HTTP requests to this Apple website only
const URLS = ["*://reportaproblem.apple.com/api/purchase/search/*"];

// GLOBAL VARIABLES
let mapTabIdResults = null;
let popupMessenger = null;
/** @type {State | null} Service Worker state */
let state = null;

// Stores every variable the service worker needs
class State {
    constructor() {
        /** @type {} Store HTTP request related information */
        this.requestHistory = new RequestHistory();

        /** @type {Map<string, {fetchJob: FetchJob, results: {purchases: Array<Purchase>, amount: Array<Currency>}}} Store state for each tabId */
        this.mapTabIdState = new Map();
    }

    static getInstance() {
        return state;
    }
}

class PopupMessageInterface {
    constructor() {
        this.port = null;

        // service worker accepts incoming long connect from popup.js
        chrome.runtime.onConnect.addListener((port) => this.handleOnConnect(port));
    }

    handleOnDisconnect() {
        this.port = null;
    }

    handleOnConnect(port) {
        // Ignore request from others
        if (port.name !== "asurada-app-store-spending") {
            return;
        }

        // cleanup old
        this.port && this.port.disconnect();
        // assign new
        this.port = port;

        this.port.onMessage.addListener((msg) => this.handleOnMessage(msg));
        this.port.onDisconnect.addListener(() => this.handleOnDisconnect());
    }

    /**
     * Handle a message from popup
     * @param {{type: string, tabId: string, payload: any}} msg Incoming message from popup
     */
    handleOnMessage(msg) {
        console.log("Got message from popup", msg);
        const { type, tabId, payload } = msg;

        if (type === "UPDATE") {
            // Return a current state of everything to popup

            // A map of currency and spending
            const results = mapTabIdResults.has(tabId)
                ? Object.fromEntries(mapTabIdResults.get(tabId)["amount"])
                : null;

            this.sendMessage({
                type: "UPDATE",
                payload: {
                    results
                }
            });
        }
    }

    /**
     * Send a message to popup
     * @param {{type: string, payload: any}} message Outbound message to popup
     */
    sendMessage(message) {
        if (!this.port) {
            return;
        }

        this.port.postMessage(message);
    }
}

function registerHTTPListeners() {
    const requestHistory = State.getInstance().requestHistory;
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
}

// Unregister listeners when we start fetching
function unregisterHTTPListeners() {
    chrome.webRequest.onBeforeRequest.removeListener();
    chrome.webRequest.onSendHeaders.removeListener();
}

function registerListeners() {
    registerHTTPListeners();

    // Listen to messages from popup.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Got message", request);

        if (request.message === "START") {
            const tabId = request.tabId;

            startFetchJob(tabId);
        } else if (request.message === "ABORT") {
            const tabId = request.tabId;

            abortFetchJob(tabId);
        }
    });
}

async function startFetchJob(tabId) {
    const requestHistory = State.getInstance().requestHistory;
    if (requestHistory.lastTabId === null
        || requestHistory.lastRequestId === null) {
        throw "Refresh page and try again";
    }

    const key = requestHistory.toKey(requestHistory.lastTabId, requestHistory.lastRequestId);
    const dsid = requestHistory.mapTabIdDsid.get(key);
    const arr_headers = requestHistory.mapTabIdHeaders.get(key);

    // Create a FetchJob for this tabId
    const mapTabIdFetchJobs = State.getInstance().mapTabIdState;
    if (mapTabIdFetchJobs.has(tabId)
        && mapTabIdFetchJobs.get(tabId).status !== FetchJobState.NOT_STARTED) {
        throw "Already started a Fetch Job for current tab";
    }

    // Stop HTTP listeners
    unregisterHTTPListeners();

    const fetchJob = new FetchJob(dsid, arr_headers);
    mapTabIdFetchJobs.set(tabId, fetchJob);

    await fetchJob.start();
    postprocessing(tabId, fetchJob);

}

function postprocessing(tabId, fetchJob) {
    const filter1 = new FreeItemFilter();
    filter1.filter(fetchJob.history);

    const converter1 = new SingleEntryConverter();
    const data = converter1.convert(fetchJob.history);
    console.log("Calculated amount for each item", data);

    const aggregator1 = new TotalAmountAggregator();
    const totalAmount = aggregator1.aggregate(data);
    console.log("Total cost of all purchases", totalAmount);

    mapTabIdResults.set(tabId, {
        purchases: data,
        amount: totalAmount
    });

    popupMessenger.sendMessage({
        type: "UPDATE",
        payload: {
            results: Object.fromEntries(totalAmount)
        }
    })
}

function abortFetchJob(tabId) {
    const mapTabIdFetchJobs = State.getInstance().mapTabIdState;
    mapTabIdFetchJobs.has(tabId) && mapTabIdFetchJobs.get(tabId).abort();
}

// Reset all global variables
function reset() {
    state = new State();

    mapTabIdResults = new Map();
    popupMessenger = new PopupMessageInterface();
}

(function main() {
    console.log("service-worker.js main called",);

    reset();
    registerListeners();
})();

// So other components can call State.getInstance
export {State};
