import { Purchase, RequestHistory, FetchJob, FetchJobState } from "./classes.js";
import { FreeItemFilter, SingleEntryConverter, TotalAmountAggregator } from "./postprocessing.js";

// CONST
// Listen HTTP requests to this Apple website only
const URLS = ["*://reportaproblem.apple.com/api/purchase/search/*"];

// GLOBAL VARIABLES
/** @type {PopupMessageInterface} */
let popupMessenger = null;
/** @type {State} Service Worker state */
let state = null;

// Stores every variable the service worker needs
class State {
    constructor() {
        /** @type {RequestHistory} Store HTTP request related information */
        this.requestHistory = new RequestHistory();

        /** @type {FetchJob | null} */
        this.fetchJob = null;

        /** @type {{purchases: null | Array<Purchase>, totalAmount: null | Array<Currency>}} */
        this.results = {
            purchases: null,
            totalAmount: null
        };
    }

    static getInstance() {
        return state;
    }

    /**
     * Get FetchJob.
     * @returns {null | FetchJob}
     */
    getFetchJob() {
        return this.fetchJob;
    }

    /**
     * Throw if already created
     * @returns {FetchJob} the created FetchJob
     */
    createFetchJob(dsid, arr_headers) {
        if (this.getFetchJob() !== null) {
            throw "createFetchJob failed: Already created FetchJob";
        }

        this.fetchJob = new FetchJob(dsid, arr_headers);

        return this.getFetchJob();
    }

    /**
     * 
     * @param {Array<Purchase>} purchase 
     */
    setPurchases(purchase) {
        this.results.purchases = purchase;
    }

    /**
     * 
     * @param {Array<Currency>} totalAmount 
     */
    setTotalAmount(totalAmount) {
        this.results.totalAmount = totalAmount;
    }

    /**
     * Send current state to popup
     */
    sendLoadState() {
        // Determine FetchJobState
        let state = FetchJobState.NOT_READY;
        if (this.fetchJob) {
            // Take fetchJob's status if we have one
            state = this.fetchJob.status;
        } else if (this.requestHistory.lastRequestId) {
            // Otherwise determine from HTTP request history
            state = FetchJobState.NOT_STARTED;
        }

        popupMessenger.sendMessage({
            type: "LOAD_STATE",
            payload: {
                state,
                results: {
                    purchases: null, // ignore for now
                    totalAmount: this.results.totalAmount
                }
            }
        });
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
     * @param {{type: string, payload: any}} msg Incoming message from popup
     */
    handleOnMessage(msg) {
        console.log("Got message from popup", msg);
        const { type, payload } = msg;

        if (type === "START") {
            startFetchJob();
        } else if (type === "ABORT") {
            abortFetchJob();
        } else if (type === "GET_STATE") {
            State.getInstance().sendLoadState();
        } else {
            // Unrecognized message
            console.error("Unrecognized message from popup", msg);
        }
    }

    /**
     * Send a message to popup
     * @param {{type: string, payload: any}} message Outbound message to popup
     */
    sendMessage(message) {
        console.log("Sending message to popup", message);
        if (!this.port) {
            console.error("Send failed, port not open");
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
}

async function startFetchJob() {
    const requestHistory = State.getInstance().requestHistory;
    const lastRequestId = requestHistory.lastRequestId;
    if (lastRequestId === null) {
        throw "Refresh page and try again";
    }

    const { dsid, headers } = requestHistory.mapRequestIdToInfo.get(lastRequestId);

    // Create a FetchJob
    const existingFetchJob = State.getInstance().getFetchJob();
    if (existingFetchJob !== null
        // Can only start a Fetch Job if it's NOT_STARTED
        && existingFetchJob.status !== FetchJobState.NOT_STARTED) {
        throw "startFetchJob failed: Already started a Fetch Job";
    }

    // Stop HTTP listeners
    unregisterHTTPListeners();

    // Create new FetchJob
    const fetchJob = State.getInstance().createFetchJob(dsid, headers);

    await fetchJob.start();
    postprocessing(fetchJob);

    State.getInstance().sendLoadState();
}

function postprocessing(fetchJob) {
    const filter1 = new FreeItemFilter();
    filter1.filter(fetchJob.history);

    const converter1 = new SingleEntryConverter();
    const purchase = converter1.convert(fetchJob.history);
    console.log("Calculated amount for each item", purchase);

    const aggregator1 = new TotalAmountAggregator();
    const totalAmount = aggregator1.aggregate(purchase);
    console.log("Total cost of all purchases", totalAmount);

    State.getInstance().setPurchases(purchase);
    State.getInstance().setTotalAmount(totalAmount);
}

function abortFetchJob() {
    const fetchJob = State.getInstance().getFetchJob();
    if (fetchJob === null) {
        return;
    }
    fetchJob.abort();
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
