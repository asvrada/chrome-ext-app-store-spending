import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Trans, useTranslation } from "react-i18next";

import StepTwo from "./component/StepTwo";
import Results from "./component/Results";
import MockPanel from "./component/MockPanel";
import Indicator from "./component/Indicator";

import { FetchJobState, setIsTargetWebsite } from "./store/stateSlice";
import { isDev, MessengerContext } from "./context";
import Messenger from "./Messenger";

import "./App.css";
import SettingLanguage from "./component/SettingLanguage";

function PleaseRefresh() {
  const { t } = useTranslation();

  return (
    <div className="mx-4 py-4 rounded-lg bg-red-600">
      <div className="text-xl font-bold text-white">{t("please_refresh")}</div>
    </div>
  );
}

function App() {
  const { state, isTargetWebsite } = useSelector((state) => state.state);
  const dispatch = useDispatch();
  const [messenger, setMessenger] = useState(null);

  const { t } = useTranslation();

  useEffect(() => {
    if (messenger === null) {
      return;
    }
    if (isDev()) {
      // DEV
      dispatch(setIsTargetWebsite(true));
    } else {
      // PROD
      // Get current Tab
      // eslint-disable-next-line
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0]; // there will be only one in this array

        if (
          currentTab &&
          currentTab.hasOwn("url") &&
          currentTab.url.includes("reportaproblem.apple.com")
        ) {
          dispatch(setIsTargetWebsite(true));
          messenger.sendMessage({ type: "GET_STATE" });
        } else {
          dispatch(setIsTargetWebsite(false));
        }
      });
    }
  }, [messenger, dispatch]);

  useEffect(() => {
    setMessenger(new Messenger(dispatch));
  }, [dispatch]);

  return (
    <MessengerContext.Provider value={messenger}>
      <div className="App text-base text-center font-sans pb-4">
        {isDev() ? <MockPanel /> : null}
        <SettingLanguage />

        <div className="flex justify-center items-center m-4">
          <div className="mr-4">
            <img
              className="w-20"
              src="./3rdparty/App_Store.png"
              alt="App Store Logo"
            />
          </div>

          <div className="text-2xl font-bold">
            <Trans i18nKey="title-comp"></Trans>
          </div>
        </div>

        <div className="m-4 p-2 flex justify-around items-center border-2 rounded-lg border-black">
          <Indicator count={1} />

          <div className="flex-auto">
            <div>
              <strong>
                <span>&#8505;&#160;</span>
                {t("heading_step1")}
              </strong>
            </div>
            <div>
              {t("please")}
              <a
                className="text-blue-600 underline decoration-solid decoration-2 decoration-blue-600"
                href="https://reportaproblem.apple.com/?s=6"
                target="_blank"
                rel="noreferrer"
              >
                {t("link_apple")}
              </a>
              {t("and")}
              <strong>{t("login")}</strong>
            </div>
          </div>
        </div>

        {isTargetWebsite ? (
          <>
            {state === FetchJobState.NOT_READY ? <PleaseRefresh /> : null}

            <StepTwo />

            <Results />
          </>
        ) : null}
      </div>
    </MessengerContext.Provider>
  );
}

export default App;
