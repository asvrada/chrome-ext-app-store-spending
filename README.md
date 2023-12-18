# How much have I spent on App Store?

This is a Google Chrome extension that calculates how much you have spent on App Store.

[View it on Chrome web store](https://chromewebstore.google.com/detail/how-much-did-i-spent-on-a/bgdecjabbhjkhenadhghpkkabmjdhhag?hl=en) and try it out.

![Image](./docs/store_materials/Screenshot-1.png)

## How to install

This extension has been published to Chrome web store. You can [get it here](https://chromewebstore.google.com/detail/how-much-did-i-spent-on-a/bgdecjabbhjkhenadhghpkkabmjdhhag?hl=en) if you are using Chrome browser.

### Manual installation

If you wish to install it using "Load Unpacked" feature in Chrome, you can do so by following the steps below.

TODO

## How to use

TODO

## Design

### Message between Service Worker and popup

Service worker and popup use long term connection to communicate. Like so
```javascript
// service-worker.js
chrome.runtime.onConnect.addListener((port) => this.handleOnConnect(port));
```

Either end can send messages with the following format
```javascript
{
    type: string, // pre-defined enum
    payload: any
}
```

Following section describes all the message types and its payload.

#### From Service Worker to popup
```javascript
// 1. Load state
type = "LOAD_STATE"
payload: {
    state: FetchJobState,
    results: {
        purchases: Array<Purchase> | null,
        totalAmount: Array<Currency> | null
    }
}

// 2. Update
type = "UPDATE"
payload: {
    p: 0-100 // progress of fetch job, from 0 to 100
}
```

#### From popup to Service worker
```javascript
// 1. Start the process
type = "START"
payload: null

// 2. Abort the process
type = "ABORT"
payload: null

// 3. Reset state
type = "RESET"
payload: null

// 4. Get latest state
type = "GET_STATE"
payload: null
```

## Ref
https://www.rapidtables.com/web/html/html-codes.html
