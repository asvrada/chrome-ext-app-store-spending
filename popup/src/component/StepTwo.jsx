import { useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Line } from "rc-progress";
import { useTranslation } from "react-i18next";
import Indicator from "./Indicator";
import { MessengerContext } from "../context";

import { changeState, FetchJobState } from "../store/stateSlice";

export default function StepTwo() {
  const messenger = useContext(MessengerContext);
  const { state, p } = useSelector((state) => state.state);
  const dispatch = useDispatch();
  const { t } = useTranslation();

  // If Not Ready, don't show Step Two
  if (state === FetchJobState.NOT_READY) {
    return null;
  }

  const componentBtnStart = (
    <button
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      onClick={() => {
        messenger.sendMessage({
          type: "START",
        });
        dispatch(changeState(FetchJobState.RUNNING));
      }}
    >
      {t("btn_start")}
    </button>
  );

  const componentBtnAbort = (
    <button
      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
      onClick={() => {
        messenger.sendMessage({
          type: "ABORT",
        });
        dispatch(changeState(FetchJobState.ABORTED));
      }}
    >
      {t("btn_abort")}
    </button>
  );

  const componentBtnReset = (
    <button
      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
      onClick={() => {
        messenger.sendMessage({
          type: "RESET",
        });
        dispatch(changeState(FetchJobState.NOT_READY));
      }}
    >
      {t("btn_reset")}
    </button>
  );

  const componentProgress = (
    <div className="p-2">
      <Line
        className="w-4/5 mx-auto"
        percent={p}
        strokeWidth={4}
        strokeColor="#1698F4"
      />
    </div>
  );

  const componentPromptStart = (
    <strong>
      <span>&#9888;&#65039;&#160;</span>
      {state === FetchJobState.RUNNING
        ? t("heading_running")
        : t("heading_not_started")}
    </strong>
  );

  const componentPromptReset = (
    <div>
      <div>
        {state === FetchJobState.ABORTED ? (
          <strong>&#9940;&#65039;&#160;{t("status_aborted")}</strong>
        ) : (
          <strong>&#9989;&#160;{t("status_finished")}</strong>
        )}
      </div>
      <div>{t("heading_reset")}</div>
    </div>
  );

  return (
    <div className="m-4 p-2 flex justify-around items-center border-2 rounded-lg border-black">
      <Indicator count={2} />

      <div className="flex-auto">
        <div className="mb-0.5">
          {state === FetchJobState.FINISHED || state === FetchJobState.ABORTED
            ? componentPromptReset
            : componentPromptStart}
        </div>

        {state === FetchJobState.RUNNING ? componentProgress : null}

        <div>
          {state === FetchJobState.NOT_STARTED ? componentBtnStart : null}
          {state === FetchJobState.RUNNING ? componentBtnAbort : null}
          {state === FetchJobState.FINISHED || state === FetchJobState.ABORTED
            ? componentBtnReset
            : null}
        </div>
      </div>
    </div>
  );
}
