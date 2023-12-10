import { Purchase, RequestHistory, FetchJob, FetchJobState } from "./classes.js";
import { FreeItemFilter, SingleEntryConverter, TotalAmountAggregator } from "./postprocessing.js";

// CONST
// Listen HTTP requests to this Apple website only
const URLS = ["*://reportaproblem.apple.com/api/purchase/search/*"];

// GLOBAL VARIABLES
let popupMessenger = null;
/** @type {State | null} Service Worker state */
let state = null;

// Stores every variable the service worker needs
class State {
    constructor() {
        /** @type {RequestHistory} Store HTTP request related information */
        this.requestHistory = new RequestHistory();

        /** 
         * Store state for each tabId
         * totalAmount may store difference currency,
         *   this is because App Store account can change region,
         *   thus the currency it uses.
         *   Each currency represents the amount paid in that currency ALONE.
         * @type {Map<number, {fetchJob: null | FetchJob, results: {purchases: null | Array<Purchase>, totalAmount: null | Array<Currency>}}}
         */
        this.mapTabIdState = new Map();
    }

    static getInstance() {
        return state;
    }

    /**
     * If don't exist, create, otherwise do nothing
     * @param {number} tabId 
     */
    _createStateIfMissing(tabId) {
        if (!this.mapTabIdState.has(tabId)) {
            this.mapTabIdState.set(tabId, {
                fetchJob: null,
                results: {
                    purchases: null,
                    totalAmount: null
                }
            });
        }
    }

    /**
     * Throw error if tabId doesn't exist
     * @param {number} tabId 
     * @returns {{fetchJob: null | FetchJob, results: {purchases: null | Array<Purchase>, totalAmount: null | Array<Currency>}}}
     */
    getState(tabId) {
        if (!this.mapTabIdState.has(tabId)) {
            throw "Unexpected: tabId doesn't exist";
        }

        return this.mapTabIdState.get(tabId);
    }

    /**
     * Get FetchJob for given tabId.
     * @param {number} tabId 
     * @returns {null | FetchJob}
     */
    getFetchJob(tabId) {
        this._createStateIfMissing(tabId);

        return this.mapTabIdState.get(tabId).fetchJob;
    }

    /**
     * Throw if already created
     * @param {number} tabId 
     * @returns {FetchJob} the created FetchJob
     */
    createFetchJob(tabId, dsid, arr_headers) {
        this._createStateIfMissing(tabId);

        const stateTabId = this.mapTabIdState.get(tabId);
        if (stateTabId.fetchJob !== null) {
            throw "createFetchJobByTabId failed: Already created FetchJob for this tabId";
        }

        stateTabId.fetchJob = new FetchJob(dsid, arr_headers);

        return stateTabId.fetchJob;
    }

    /**
     * 
     * @param {number} tabId 
     * @param {Array<Purchase>} purchase 
     */
    setPurchases(tabId, purchase) {
        const results = this.getState(tabId).results;

        results.purchases = purchase;
    }

    /**
     * 
     * @param {number} tabId 
     * @param {Array<Currency>} totalAmount 
     */
    setTotalAmount(tabId, totalAmount) {
        const results = this.getState(tabId).results;

        results.totalAmount = totalAmount;
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
     * @param {{type: string, tabId: number, payload: any}} msg Incoming message from popup
     */
    handleOnMessage(msg) {
        console.log("Got message from popup", msg);
        const { type, tabId, payload } = msg;

        if (type === "UPDATE") {
            // Return a current state of everything to popup

            // TODO: now is an array
            // A map of currency and spending
            const totalAmount = State.getInstance().getState(tabId).results.totalAmount;

            const results = totalAmount
                ? Object.fromEntries(totalAmount)
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
    const existingFetchJob = State.getInstance().getFetchJob(tabId);
    if (existingFetchJob !== null && existingFetchJob.status !== FetchJobState.NOT_STARTED) {
        throw "startFetchJob failed: Already started a Fetch Job for current tab";
    }

    // todo: re-check
    // Stop HTTP listeners
    unregisterHTTPListeners();

    // Create new FetchJob
    const fetchJob = State.getInstance().createFetchJob(tabId, dsid, arr_headers);

    await fetchJob.start();
    postprocessing(tabId, fetchJob);
}

function postprocessing(tabId, fetchJob) {
    const filter1 = new FreeItemFilter();
    filter1.filter(fetchJob.history);

    const converter1 = new SingleEntryConverter();
    const purchase = converter1.convert(fetchJob.history);
    console.log("Calculated amount for each item", purchase);

    const aggregator1 = new TotalAmountAggregator();
    const totalAmount = aggregator1.aggregate(purchase);
    console.log("Total cost of all purchases", totalAmount);

    State.getInstance().setPurchases(tabId, purchase);
    // TODO: wrong type
    State.getInstance().setTotalAmount(tabId, totalAmount);

    popupMessenger.sendMessage({
        type: "UPDATE",
        payload: {
            results: Object.fromEntries(totalAmount)
        }
    })
}

function abortFetchJob(tabId) {
    const fetchJob = State.getInstance().getFetchJob(tabId);
    if (fetchJob !== null) {
        fetchJob.abort();
    }
}

// Reset all global variables
function reset() {
    state = new State();

    popupMessenger = new PopupMessageInterface();
}

(function main() {
    console.log("service-worker.js main called",);

    reset();
    registerListeners();
})();

// So other components can call State.getInstance
export { State };
