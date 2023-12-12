import {PopupMessenger, State} from "./service-worker.js";

const FetchJobState = {
    // FetchJob ready to start
    NOT_STARTED: 0,
    // FetchJob running
    RUNNING: 1,
    // FetchJob finished without error
    FINISHED: 2,
    // FetchJob started but aborted
    ABORTED: 3,
    // No dsid info recorded, need to refresh
    NOT_READY: 4
};

/**
 * A simple object that represents currency and amount of this currency
 */
class Currency {
    constructor() {
        /** @type {number} */
        this.amount = null;
        /** @type {string} Symbol of currency */
        this.currency = null;
    }

    /**
     * Parse a string into a Currency object
     * @param {string} amount 
     * @returns {Currency}
     */
    static from(amount) {
        const currency = new Currency();

        // Find index of first digit
        let index = 0;
        while (index < amount.length && !('0' <= amount[index] && amount[index] <= '9')) {
            index++;
        }
        if (index == amount.length) {
            throw "Invalid amount", amount;
        }

        currency.amount = parseFloat(amount.substring(index));
        if (isNaN(currency.amount)) {
            console.error("Failed to parse", amount);
            currency.amount = 0;
        }
        currency.currency = amount.substring(0, index);

        return currency;
    }
}

/**
 * Store HTTP request history
 * So we can find the dsid and headers for the next HTTP request
 */
class RequestHistory {
    constructor() {
        /** @type {Map<String, {dsid: string, headers: null | Array<{name: string, value: string}}>} */
        this.mapRequestIdToInfo = new Map();

        /** @type {string} */
        this.lastRequestId = null;
    }

    recordBeforeRequest(details) {
        const requestId = details.requestId;

        // Grab dsid
        const raw = details.requestBody.raw[0].bytes;
        const decoder = new TextDecoder();
        const str = decoder.decode(raw);
        const obj = JSON.parse(str);

        const dsid = obj["dsid"];

        // Init entry in Map
        this.mapRequestIdToInfo.set(requestId, {dsid, headers: null});
    }

    recordSendHeaders(details) {
        const requestId = details.requestId;

        // check if requestId valid
        const entry = this.mapRequestIdToInfo.get(requestId);
        if (entry === undefined) {
            throw "Unexpected: requestId missing";
        }

        // Grab headers
        const headers = details.requestHeaders;

        // Set Map
        this.mapRequestIdToInfo.set(requestId, {
            dsid: entry.dsid,
            headers
        });

        // Set the last requestId here
        this.lastRequestId = requestId;

        State.getInstance().sendLoadState();
    }
}

class Item {
    /**
     * 
     * @param {string} name 
     * @param {string} type 
     * @param {string} amount 
     */
    constructor(name, type, amount) {
        // nameForDisplay
        /** @type {string} */
        this.name = name;
        // mediaType
        /** @type {string} */
        this.type = type;
        // amountPaid
        /** @type {Currency} */
        this.amountPaid = Currency.from(amount);
    }
}

/**
 * An entry that represents a purchase of a single item (App, Movie, Song, etc)
 */
class Purchase {
    constructor() {
        /** @type {Date} */
        this.date = null;

        /** @type {string} */
        this.name = null;
        /** @type {string} */
        this.type = null;

        /** @type {Currency} Amount, including tax */
        this.amountPaid = null;
    }
}

/**
 * Store purchase history for a single day
 */
class PurchaseDay {
    constructor() {
        /** @type {Date} */
        this.date = null;
        /** @type {Currency} */
        this.totalAmount = null;
        // List of Item
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

/**
 * Store entire purchase history for a given apple account
 */
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
        purchaseDay.totalAmount = Currency.from(purchase["estimatedTotalAmount"]);

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

/**
 * A component that fetches data from Apple website
 */
class FetchJob {
    /**
     * 
     * @param {string} dsid 
     * @param {Array<{name: string, value: string}} arr_headers 
     */
    constructor(dsid, arr_headers) {
        this.dsid = dsid;
        this.headers = {};
        this.status = FetchJobState.NOT_STARTED;
        /** @type {PurchaseHistory} Store all purchases history here */
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

        try {
            let result = await this.doFetch(null);
            this.history.visit(result.data);

            while (this.status === FetchJobState.RUNNING
                && result.nextBatchId !== null) {
                // Sleep
                await new Promise(r => setTimeout(r, 400));

                result = await this.doFetch(result.nextBatchId);
                this.history.visit(result.data);

                // Send progress update
                PopupMessenger.getInstance().sendMessage({
                    type: "UPDATE",
                    payload: {
                        p: 50
                    }
                });
            }
        } catch (e) {
            this.status = FetchJobState.ABORTED;
            console.error(e);
        }

        if (this.status !== FetchJobState.ABORTED) {
            this.status = FetchJobState.FINISHED;
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

export {
    Currency,
    RequestHistory,
    Item,
    Purchase,
    PurchaseDay,
    PurchaseHistory,
    FetchJob,
    FetchJobState
};
