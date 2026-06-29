import { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./components/Home";
import { Meeting } from "./components/Meeting";

function App() {
  useEffect(() => {
    const stored = localStorage.getItem("sumvad-theme");
    if (stored) {
      document.documentElement.dataset.theme = stored;
    }
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/room/:roomID" element={<Meeting />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
