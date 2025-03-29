import "./App.css";

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import Game from "./pages/Game";
import Home from "./pages/Home";

function App() {
  return (
    <Router>
      <div className="max-w-7xl mx-auto p-5">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:gameId" element={<Game />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
