import {
  Action,
  configureStore,
  ThunkAction,
} from "@reduxjs/toolkit";

export const makeStore = () => {
  return configureStore({
    reducer: {},
  });
};

export type AppStore = ReturnType<typeof makeStore>;

export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
