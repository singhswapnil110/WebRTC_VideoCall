import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ReduxContextWrapper } from "./store/reduxContextWrapper";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ReduxContextWrapper>
      <App />
    </ReduxContextWrapper>
  </React.StrictMode>
);
