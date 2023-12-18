import {configureStore} from '@reduxjs/toolkit'
import stateReducer from "./stateSlice";

export default configureStore({
    reducer: {
        state: stateReducer
    },
})
