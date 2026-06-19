import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { ThemedToaster } from "./components/theme/ThemedToaster";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <Provider store={store}>
        <App />
        <ThemedToaster />
      </Provider>
    </ThemeProvider>
  </React.StrictMode>
);
