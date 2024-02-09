import { handleLoadState, handleUpdate } from "./store/stateSlice";
import { isDev } from "./context";

class Messenger {
  constructor(dispatch) {
    this.dispatch = dispatch;

    if (isDev()) {
      this.port = null;
    } else {
      // eslint-disable-next-line
      this.port = chrome.runtime.connect({
        name: "asurada-app-store-spending",
      });

      this.port.onMessage.addListener((msg) => this.handleOnMessage(msg));
    }
  }

  /**
   * Handle message from service worker
   * @param {{type: string, payload: any}} msg
   */
  handleOnMessage(msg) {
    console.log("Got message from service worker", msg);
    const { type, payload } = msg;

    if (type === "LOAD_STATE") {
      this.dispatch(handleLoadState(payload));
    } else if (type === "UPDATE") {
      this.dispatch(handleUpdate(payload));
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

export default Messenger;
