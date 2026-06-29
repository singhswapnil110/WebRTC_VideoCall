import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Icon } from "./Icon";

export const Home = () => {
  const navigate = useNavigate();
  const inputRef = useRef();

  const toggleTheme = () => {
    const html = document.documentElement;
    const next = html.dataset.theme === "dark" ? "light" : "dark";
    html.dataset.theme = next;
    localStorage.setItem("sumvad-theme", next);
  };

  const navigateToRoom = (roomID) => {
    roomID ||= uuidv4();
    navigate(`/room/${roomID}`);
  };

  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="brand">
          Sum<span className="accent">वाद</span>
        </div>
        <button className="theme-pill" onClick={toggleTheme}>
          <div className="pill-icon-wrap">
            <Icon name="sun" className="pill-sun" width={15} height={15} strokeWidth={2.2} />
            <Icon name="moon" className="pill-moon" width={15} height={15} strokeWidth={2.2} />
          </div>
        </button>
      </nav>

      <div className="home-body">
        <div className="home-hero">
          <h1>Video calls,<br/><span className="accent">minus the noise.</span></h1>
          <p>Create a room in one click. Share the link. Everyone joins instantly.</p>
        </div>

        <div className="home-actions">
          <button className="btn-primary" onClick={() => navigateToRoom()}>
            <Icon name="video" width={20} height={20} strokeWidth={2.5} />
            New Meeting
          </button>

          <div className="action-divider">or join existing</div>

          <div className="join-row">
            <input
              type="text"
              className="input-solid"
              placeholder="Enter room code"
              ref={inputRef}
            />
            <button
              className="btn-solid"
              onClick={() => {
                const val = inputRef.current?.value?.trim();
                if (val) navigateToRoom(val);
              }}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
