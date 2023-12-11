const ID_BTN_START_ANALYZE = "btnStartAnalyze";
const ID_BTN_ABORT_ANALYZE = "btnStopAnalyze";
const ID_DIV_RESULTS = "results";
const URL_REPORT_PROBLEM_APPLE = "reportaproblem.apple.com";

const btnStartAnalyze = document.getElementById(ID_BTN_START_ANALYZE);
const btnAbortAnalyze = document.getElementById(ID_BTN_ABORT_ANALYZE);
const divResults = document.getElementById(ID_DIV_RESULTS);

/** @type {ServiceWorkerInterface} */
let serviceWorkerInterface = null;

class ServiceWorkerInterface {
    constructor() {
        this.port = chrome.runtime.connect({ name: "asurada-app-store-spending" });

        this.port.onMessage.addListener((msg) => this.handleOnMessage(msg));
    }

    /**
     * Handle message from service worker
     * @param {{type: string, payload: any}} msg 
     */
    handleOnMessage(msg) {
        console.log("Got message from service worker", msg);
        const { type, payload } = msg;

        if (type === "LOAD_STATE") {
            const state = payload.state;
            if (state === 0) {
                // NOT_STARTED
            } else if (state === 1) {
                // RUNNING
            } else if (state === 2) {
                // FINISHED
                updateTotalAmount(payload.results.totalAmount);
            } else if (state === 3) {
                // ABORTED
                updateTotalAmount(payload.results.totalAmount);
            } else if (state === 4) {
                // NOT_READY
                // todo: prompt to refresh page
            } else {
                console.error("Unrecognized state", payload);
                throw "5???";
            }
        } else if (type === "UPDATE") {
            /** @type {number} 0-100 */
            const progress = payload.p;
        } else {
            // Unrecognized message
            console.error("Unrecognized message from service worker", msg);
        }
    }

    /**
     * Send a message to service worker
     * @param {{type: string, payload: any}} message Outbound message to service worker
     */
    sendMessage(message) {
        if (!this.port) {
            return;
        }

        this.port.postMessage(message);
    }
}

function onBtnStartAnalyze() {
    serviceWorkerInterface.sendMessage({
        type: "START",
    });
}

function onBtnAbortAnalyze() {
    serviceWorkerInterface.sendMessage({
        type: "ABORT",
    });
}

function initUI() {
}

/**
 * 
 * @param {Array<{currency: string, amount: number} totalAmount 
 */
function updateTotalAmount(totalAmount) {
    // Update UI to display the results
    let html = "";
    totalAmount.forEach((each) => {
        html += `<p>${each.currency}${each.amount}</p>`;
    });
    divResults.innerHTML = html;
}

function registerListeners() {
    // Register button callback
    document.addEventListener('DOMContentLoaded', () => {
        btnStartAnalyze.addEventListener('click', onBtnStartAnalyze, false);
        btnAbortAnalyze.addEventListener('click', onBtnAbortAnalyze, false);
    }, false)

    serviceWorkerInterface = new ServiceWorkerInterface();
}

(function main() {
    console.log("popup.js main called");

    // Get current Tab
    chrome.tabs.query({ active: true, currentWindow: true },
        (tabs) => {
            var currentTab = tabs[0]; // there will be only one in this array

            if (currentTab
                && currentTab.hasOwnProperty("url")
                && currentTab.url.includes(URL_REPORT_PROBLEM_APPLE)) {
                serviceWorkerInterface.sendMessage({ type: "GET_STATE" });
            } else {
                console.error("Only works on Apple website");
                // todo: show UI error
            }
        });

    registerListeners();

    // Init UI
    initUI();
})();
