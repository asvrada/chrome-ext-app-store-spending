import { createContext } from "react";

export function isDev() {
  return !process.env.NODE_ENV || process.env.NODE_ENV === "development";
}

export const MessengerContext = createContext(null);
