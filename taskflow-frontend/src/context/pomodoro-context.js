import { createContext, useContext } from "react";

export const PomodoroContext = createContext(null);

export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error("usePomodoro must be used within a PomodoroProvider");
  }
  return context;
};
