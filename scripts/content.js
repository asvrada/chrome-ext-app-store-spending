let COMMON = null;
// import module
async function import_common() {
    const src = chrome.runtime.getURL("scripts/common.js");
    let { MSG_TEST } = await import(src);

    COMMON = {
        MSG_TEST
    };
}

let dsid = null;
let headers = {};

function send_request(batchId) {
    const body = batchId === null ? {
        dsid,
    } : {
        batchId,
        dsid,
    };

    console.log("Fetching batch", batchId);

    return fetch("https://reportaproblem.apple.com/api/purchase/search", {
        "headers": {
            "accept-language": "en-US,en;q=0.9",
            ...headers
        },
        "referrer": "https://reportaproblem.apple.com/?s=6",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": JSON.stringify(body),
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    });
}

let currentBatchId = null;

async function start() {
    const response = await send_request(currentBatchId);

    if (response.status !== 200) {
        console.error(response);
        throw "Request failed";
    }

    const data = await response.json();

    // TODO Store result
    // const body = data.;
    console.log(data);

    // Find next batch
    const nextBatchId = data["nextBatchId"];

    // Repeat if has next batch
    if (nextBatchId !== "" || nextBatchId !== null) {
        currentBatchId = nextBatchId;
        setTimeout(start, 2000);
    }
}

function addListener() {
    chrome.runtime.onMessage.addListener((response, sender, sendResponse) => {
        if ((response.hasOwnProperty("type")) && response.type === COMMON.MSG_TEST) {
            console.log("Received from background.js", response);

            dsid = response["dsid"];
            // Turn headers into dict
            for (const each of response["headers"]) {
                key = each["name"];
                value = each["value"];

                headers[key] = value;
            }

            setTimeout(start, 1000);
        }
    });
}

(async function main() {
    console.log("content.js main called");

    await import_common();

    addListener();
})();