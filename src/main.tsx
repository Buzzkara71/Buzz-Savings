import React from "react";
import ReactDOM from "react-dom/client";
import CloudApp from "./CloudApp";
import "./styles.css";
import "./theme.css";
import "./sidebar.css";
import "./finance.css";
import "./cloud.css";
import "./enhancements.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CloudApp />
  </React.StrictMode>,
);
