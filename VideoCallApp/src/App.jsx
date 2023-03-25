import { useState } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./components/Home";
import { Meeting } from "./components/Meeting";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App h-screen w-screen">
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
