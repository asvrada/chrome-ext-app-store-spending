const ID_BTN_START_ANALYZE = "btnStartAnalyze";
const ID_BTN_ABORT_ANALYZE = "btnStopAnalyze";
const ID_DIV_WRONG_URL = "errorWrongUrl";
const URL_REPORT_PROBLEM_APPLE = "reportaproblem.apple.com";

const btnStartAnalyze = document.getElementById(ID_BTN_START_ANALYZE);
const btnAbortAnalyze = document.getElementById(ID_BTN_ABORT_ANALYZE);
const divErrorWrongUrl = document.getElementById(ID_DIV_WRONG_URL);

let currentTab = null;

function onBtnStartAnalyze() {
    chrome.runtime.sendMessage({ message: "START", tabId: currentTab.id });
}

function onBtnAbortAnalyze() {
    chrome.runtime.sendMessage({ message: "ABORT", tabId: currentTab.id });
}

function initUI() {
    divErrorWrongUrl.style.display = "none";
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
            } else {
                // Show error on UI
                divErrorWrongUrl.style.display = "block";
            }
        });

    // Register button callback
    document.addEventListener('DOMContentLoaded', () => {
        btnStartAnalyze.addEventListener('click', onBtnStartAnalyze, false);
        btnAbortAnalyze.addEventListener('click', onBtnAbortAnalyze, false);
    }, false)

    // Init UI
    initUI();
})();
