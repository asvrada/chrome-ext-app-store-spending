const ID_BTN_START_ANALYZE = "btnStartAnalyze";
const ID_BTN_ABORT_ANALYZE = "btnStopAnalyze";
const ID_DIV_WRONG_URL = "errorWrongUrl";
const ID_DIV_RESULTS = "results";
const URL_REPORT_PROBLEM_APPLE = "reportaproblem.apple.com";

const btnStartAnalyze = document.getElementById(ID_BTN_START_ANALYZE);
const btnAbortAnalyze = document.getElementById(ID_BTN_ABORT_ANALYZE);
const divErrorWrongUrl = document.getElementById(ID_DIV_WRONG_URL);
const divResults = document.getElementById(ID_DIV_RESULTS);

/** @type {{id: number, url: string}} */
let currentTab = null;
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

        if (type === "UPDATE") {
            /** @type {Array<{currency: string, amount: number}>} */
            const totalAmount = payload.totalAmount;
            if (totalAmount === null) {
                // No final results yet
                return;
            }

            // Update UI to display the results
            let html = "";
            totalAmount.forEach((each) => {
                html += `<p>${each.currency}${each.amount}</p>`;
            });
            divResults.innerHTML = html;
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

        this.port.postMessage({
            tabId: currentTab.id,
            ...message
        });
    }
}

function onBtnStartAnalyze() {
    chrome.runtime.sendMessage({ message: "START", tabId: currentTab.id });
}

function onBtnAbortAnalyze() {
    chrome.runtime.sendMessage({ message: "ABORT", tabId: currentTab.id });
}

function initUI() {
    divErrorWrongUrl.style.display = "none";
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
            var innerCurrentTab = tabs[0]; // there will be only one in this array

            if (innerCurrentTab
                && innerCurrentTab.hasOwnProperty("url")
                && innerCurrentTab.url.includes(URL_REPORT_PROBLEM_APPLE)) {

                currentTab = innerCurrentTab;

                // Get update
                serviceWorkerInterface.sendMessage({ type: "UPDATE" });
            } else {
                // Show error on UI
                divErrorWrongUrl.style.display = "block";
            }
        });

    registerListeners();

    // Init UI
    initUI();
})();
