# chrome-ext-app-store-spending
 
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
    tabId: number, // optional, only required for popup sends to service worker
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

// 3. Get state
type = "GET_UPDATE"
payload: null
```
