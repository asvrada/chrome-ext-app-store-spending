import {useSelector} from "react-redux";
import {useTranslation} from "react-i18next";

import {FetchJobState} from "../store/stateSlice";

function ListAmount({amounts, status}) {
    const {t} = useTranslation();

    if (amounts.length === 0) {
        if (status === FetchJobState.ABORTED) {
            return (<span className="text-lg">
                {t("result_aborted_empty")}
            </span>);
        }
        if (status === FetchJobState.FINISHED) {
            return (<span className="text-lg">
                {t("result_finished_empty")}
            </span>);
        }
    }

    return (<>
        {amounts.map((each, idx) => {
            return (<>
                {idx !== 0 ? <div>+</div> : null}
                <div>
                    {each.currency}{each.amount}
                </div>
            </>);
        })}
    </>);
}

export default function Results() {
    const {state, results} = useSelector((state) => state.state);
    const {t} = useTranslation();

    if (state !== FetchJobState.RUNNING
        && state !== FetchJobState.FINISHED
        && state !== FetchJobState.ABORTED) {
        return null;
    }

    const componentTotalAmount = results.totalAmount
        ? <ListAmount amounts={results.totalAmount} status={state}/>
        : <span>Error</span>;

    return (
        <div>
            <div className="text-lg font-bold">{t("result_title")}&#58;</div>

            {state === FetchJobState.ABORTED ?
                <div><span className="text-red-600">&#9888;&#65039;&#160;</span>{t("result_incomplete")}</div> : null}
            {state === FetchJobState.RUNNING
                ? <div className="">&#40;{t("result_pending")}&#41;</div>
                : <div>{componentTotalAmount}</div>}
        </div>
    );
}