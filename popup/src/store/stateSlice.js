import {createSlice} from '@reduxjs/toolkit'

export const FetchJobState = {
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

export const stateSlice = createSlice({
    name: 'state',
    initialState: {
        isTargetWebsite: false,
        state: FetchJobState.NOT_READY,
        results: {
            totalAmount: null
        },
        p: 0
    },
    reducers: {
        handleLoadState: (state, action) => {
            state.state = action.payload.state;
            state.results = action.payload.results;
        },
        handleUpdate: (state, action) => {
            state.p = action.payload.p;
        },
        changeState: (state, action) => {
            state.state = action.payload;
        },
        setIsTargetWebsite: (state, action) => {
            state.isTargetWebsite = action.payload;
        },
    },
})

// Action creators are generated for each case reducer function
export const {handleLoadState, handleUpdate, changeState, setIsTargetWebsite} = stateSlice.actions

export default stateSlice.reducer