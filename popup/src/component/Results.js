import {useSelector} from "react-redux";
import {useTranslation} from "react-i18next";

import {FetchJobState} from "../store/stateSlice";
import {generateCSV} from "../helper";

// Question and Answer
function QAPanel() {
    const {t} = useTranslation();

    return (<span className="ml-1 group relative">
        <div className="w-3.5 h-auto inline-block opacity-50">
            <svg fill="#000000" version="1.1" xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 29.536 29.536">
<g>
	<path d="M14.768,0C6.611,0,0,6.609,0,14.768c0,8.155,6.611,14.767,14.768,14.767s14.768-6.612,14.768-14.767
		C29.535,6.609,22.924,0,14.768,0z M14.768,27.126c-6.828,0-12.361-5.532-12.361-12.359c0-6.828,5.533-12.362,12.361-12.362
		c6.826,0,12.359,5.535,12.359,12.362C27.127,21.594,21.594,27.126,14.768,27.126z"/>
	<path d="M14.385,19.337c-1.338,0-2.289,0.951-2.289,2.34c0,1.336,0.926,2.339,2.289,2.339c1.414,0,2.314-1.003,2.314-2.339
		C16.672,20.288,15.771,19.337,14.385,19.337z"/>
	<path d="M14.742,6.092c-1.824,0-3.34,0.513-4.293,1.053l0.875,2.804c0.668-0.462,1.697-0.772,2.545-0.772
		c1.285,0.027,1.879,0.644,1.879,1.543c0,0.85-0.67,1.697-1.494,2.701c-1.156,1.364-1.594,2.701-1.516,4.012l0.025,0.669h3.42
		v-0.463c-0.025-1.158,0.387-2.162,1.311-3.215c0.979-1.08,2.211-2.366,2.211-4.321C19.705,7.968,18.139,6.092,14.742,6.092z"/>
</g>
</svg>
        </div>

        <div
            className="w-80 p-2 rounded-lg bg-gray-200 shadow-md hidden hover:block group-hover:block absolute -right-2 bottom-4 text-left">
            <div className="text-base font-normal">{t("qa_accurate_q")}&#63;</div>
            <div className="text-sm font-light">{t("qa_accurate_a")}</div>
        </div>
    </span>);
}

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

function DownloadResult() {
    const state = useSelector((state) => state.state);
    const purchases = state.results.purchases || null;

    if (!purchases) {
        return null;
    }

    function onClick() {
        const CSV = generateCSV(purchases);

        const a = window.document.createElement('a');
        a.href = window.URL.createObjectURL(CSV);
        a.download = 'purchases.csv';

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    return (
        <button type="button"
                onClick={onClick}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 mt-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">
            Download your data as CSV
        </button>
    );
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
            <div className="text-lg font-bold">{t("result_title")}&#58;<QAPanel/></div>

            {state === FetchJobState.ABORTED ?
                <div><span className="text-red-600">&#9888;&#65039;&#160;</span>{t("result_incomplete")}</div> : null}
            {state === FetchJobState.RUNNING
                ? <div className="">&#40;{t("result_pending")}&#41;</div>
                : <div>{componentTotalAmount}</div>}

            {state === FetchJobState.FINISHED ? <DownloadResult/> : null}
        </div>
    );
}