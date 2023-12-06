const FetchJobState = {
    NOT_STARTED: 0,
    RUNNING: 1,
    ABORTED: 2
};

// Store HTTP request history
// Key: tab ID
class RequestHistory {
    constructor() {
        // Map<<tabId, requestId>, dsid>>
        /** @type {Map<string, string>} */
        this.mapTabIdDsid = new Map();
        // Map<<tabId, requestId>, dsid>>
        /** @type {Map<string, Array<{name: string, value: string}>} */
        this.mapTabIdHeaders = new Map();

        this.lastTabId = null;
        this.lastRequestId = null;
    }

    /**
     * Combine tabId and requestId into a key
     * @param {number} tabId 
     * @param {string} requestId 
     * @returns {string} A key for the Map
     */
    toKey(tabId, requestId) {
        return tabId.toString() + "-" + requestId.toString();
    }

    /**
     * Separate tabId and requestId from a key 
     * @param {string} key 
     * @returns {{tabId: string, requestId: string}}
     */
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

class Item {
    constructor(name, type, amount) {
        // nameForDisplay
        /** @type {string} */
        this.name = name;
        // mediaType
        /** @type {string} */
        this.type = type;
        // amountPaid
        // todo: change to track currency
        /** @type {string} */
        this.amountPaid = amount;
    }
}

class PurchaseDay {
    constructor() {
        // purchaseDate
        /** @type {Date} */
        this.date = null;
        // estimatedTotalAmount
        // todo: change to track currency
        /** @type {string} */
        this.totalAmount = null;
        // List of Item
        // plis
        /** @type {Array<Item>} */
        this.items = [];
    }

    /**
     * Add an item to purchase history for this day
     * @param {Item} item A Item class
     */
    addItem(item) {
        this.items.push(item);
    }
}

// Store the purchase history
class PurchaseHistory {
    constructor() {
        /** @type {string | null} */
        this.nextBatchId = null;
        /** @type {boolean} */
        this.initialBatch = true;
        /** @type {Array<PurchaseDay>} */
        this.days = [];
    }

    /**
     * Parse a single purchase JSON object
     * @param {any} purchase The JSON object from HTTP request
     */
    handlePurchase(purchase) {
        const purchaseDay = new PurchaseDay();
        this.days.push(purchaseDay);

        purchaseDay.date = new Date(purchase["purchaseDate"]);
        purchaseDay.totalAmount = purchase["estimatedTotalAmount"];

        const items = purchase["plis"];
        items.forEach((item) => {
            const name = item["localizedContent"]["nameForDisplay"];
            const type = item["localizedContent"]["mediaType"];
            const amount = item["amountPaid"];

            const purchaseItem = new Item(name, type, amount);
            purchaseDay.addItem(purchaseItem);
        });
    }

    /**
     * Handle a HTTP request
     * @param {*} data JSON data from the HTTP request
     */
    visit(data) {
        const currentBatchId = data["query"]["batchId"];

        if (!this.initialBatch && currentBatchId !== this.nextBatchId) {
            throw "Batch ID mismatch";
        }

        if (this.initialBatch) {
            this.initialBatch = false;
        }

        this.nextBatchId = data["nextBatchId"] === "" ? null : data["nextBatchId"];

        const purchases = data["purchases"];
        purchases.forEach((purchase) => {
            this.handlePurchase(purchase);
        });
    }
}

class FetchJob {
    /**
     * Create a Fetch Job for App Store Account
     * @param {string} dsid 
     * @param {Array<{name: string, value: string}} arr_headers 
     */
    constructor(dsid, arr_headers) {
        this.dsid = dsid;
        this.headers = {};
        this.status = FetchJobState.NOT_STARTED;
        this.history = new PurchaseHistory();

        // convert array of headers into dict
        for (const each of arr_headers) {
            let k = each["name"];
            let v = each["value"];
            this.headers[k] = v;
        }
    }

    abort() {
        this.status = FetchJobState.ABORTED;
    }

    // Fetch everything
    async start() {
        this.status = FetchJobState.RUNNING;

        let result = await this.doFetch(null);
        this.history.visit(result.data);

        while (this.status === FetchJobState.RUNNING && result.nextBatchId !== null) {
            // Sleep
            await new Promise(r => setTimeout(r, 400));

            result = await this.doFetch(result.nextBatchId);
            this.history.visit(result.data);
        }
    }

    /**
     * Call fetch once for given batchId
     * @param {string} batchId 
     * @returns {Promise<{nextBatchId: string, data: any}>}
     */
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
            data
        };
    }
}

export { RequestHistory, Item, PurchaseDay, PurchaseHistory, FetchJob, FetchJobState };
