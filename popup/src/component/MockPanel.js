import {useDispatch} from "react-redux";
import {handleLoadState, FetchJobState, changeState, handleUpdate} from "../store/stateSlice";
import {useEffect} from "react";

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
                    state: FetchJobState.FINISHED,
                    results: {totalAmount: [{currency: "$$$", amount: 9999.99}, {currency: "¥¥¥", amount: 19999.99}]}
                }))}>Finished
                </button>
            </div>
        </div>
    )
}