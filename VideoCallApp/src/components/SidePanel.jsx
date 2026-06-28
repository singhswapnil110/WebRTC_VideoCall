import React from "react";

export const SidePanel = ({ open, children }) => (
  <div className={`side-panel ${open ? "open" : ""}`}>
    {open ? children : null}
  </div>
);
