const ID_BTN_START_ANALYZE = "btnStartAnalyze";
const ID_DIV_WRONG_URL = "errorWrongUrl";
const URL_REPORT_PROBLEM_APPLE = "reportaproblem.apple.com";

const btnStartAnalyze = document.getElementById(ID_BTN_START_ANALYZE);
const divErrorWrongUrl = document.getElementById(ID_DIV_WRONG_URL);

function onBtnStartAnalyze() {
    // 1. check if the current tab is the target URL
    chrome.tabs.query({ active: true, currentWindow: true },
        (tabs) => {
            var currentTab = tabs[0]; // there will be only one in this array

            if (currentTab.hasOwnProperty("url")
                && currentTab.url.includes(URL_REPORT_PROBLEM_APPLE)) {
                // TODO: send message to service work to trigger content script
            } else {
                // Show error on UI
                divErrorWrongUrl.style.display = "block";
            }
        });
}

function initUI() {
    divErrorWrongUrl.style.display = "none";
}

(function main() {
    console.log("popup.js main called");

    // Register button callback
    document.addEventListener('DOMContentLoaded', function () {
        btnStartAnalyze.addEventListener('click', onBtnStartAnalyze, false);
    }, false)

    // Init UI
    initUI();
})();
