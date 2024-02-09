import {useDispatch} from "react-redux";
import {handleLoadState, FetchJobState, changeState, handleUpdate} from "../store/stateSlice";
import {useEffect} from "react";

const MOCK_PURCHASES = [
    {
        date: (new Date()).toISOString(),
        name: "name 1",
        detail: "detail 1",
        type: "type 1",
        amountPaid: {
            currency: "$",
            amount: 123
        }
    }
]

export default function MockPanel() {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(handleUpdate({p: 50}));
    }, [dispatch]);

    return (
        <div className="border-2 border-yellow-400 fixed bottom-0 left-0 right-0">
            <h2 className="text-center">Mock Panel</h2>

            <div className="flex justify-around">
                <button onClick={() => dispatch(changeState(FetchJobState.NOT_READY))}>Not Ready</button>
                <button onClick={() => dispatch(changeState(FetchJobState.NOT_STARTED))}>Not Started</button>
                <button onClick={() => dispatch(changeState(FetchJobState.RUNNING))}>Running</button>
                <button onClick={() => dispatch(handleLoadState({
                    state: FetchJobState.ABORTED,
                    results: {totalAmount: [{currency: "$$$", amount: 9999.99}, {currency: "¥¥¥", amount: 19999.99}]}
                }))}>Aborted
                </button>
                <button onClick={() => dispatch(handleLoadState({
                    state: FetchJobState.ABORTED,
                    results: {totalAmount: []}
                }))}>Aborted empty
                </button>
                <button onClick={() => dispatch(handleLoadState({
                    state: FetchJobState.FINISHED,
                    results: {purchases: MOCK_PURCHASES, totalAmount: [{currency: "$$$", amount: 9999.99}, {currency: "¥¥¥", amount: 19999.99}]}
                }))}>Finished
                </button>
                <button onClick={() => dispatch(handleLoadState({
                    state: FetchJobState.FINISHED,
                    results: {purchases: [], totalAmount: []}
                }))}>Finished empty
                </button>
            </div>
        </div>
    )
}