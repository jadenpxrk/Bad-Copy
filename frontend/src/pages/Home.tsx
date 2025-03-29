import apiService from "../utils/apiService";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Home = () => {
  const [playerName, setPlayerName] = useState("");
  const [gameId, setGameId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const gameId = await apiService.createGame();
      navigate(`/game/${gameId}`, { state: { playerName, isCreator: true } });
    } catch (err) {
      setError("Failed to create game. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!gameId.trim()) {
      setError("Please enter a game ID");
      return;
    }

    navigate(`/game/${gameId}`, { state: { playerName, isCreator: false } });
  };

  return (
    <div className="flex flex-col items-center py-10 px-5 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-5 text-blue-500">
        Speed Sketch Showdown
      </h1>
      <p className="text-lg mb-8">
        Compete to draw a reference image in 30 seconds!
      </p>

      <div className="w-full mb-6">
        <label htmlFor="playerName" className="block font-semibold mb-1">
          Your Name
        </label>
        <input
          type="text"
          id="playerName"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          className="w-full p-3 border border-gray-300 rounded text-base"
          required
        />
      </div>

      <div className="w-full flex flex-wrap gap-6 mt-5">
        <div className="flex-1 min-w-80 bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold mb-4 text-blue-500">
            Start a New Game
          </h2>
          <p className="mb-4">Create a new game and invite a friend to join</p>
          <button
            onClick={handleCreateGame}
            disabled={isLoading}
            className="w-full py-3 px-5 bg-blue-500 text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "Create Game"}
          </button>
        </div>

        <div className="flex-1 min-w-80 bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold mb-4 text-blue-500">Join a Game</h2>
          <p className="mb-4">Enter a game ID to join an existing game</p>
          <div className="mb-4">
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Enter game ID"
              className="w-full p-3 border border-gray-300 rounded text-base"
              required
            />
          </div>
          <button
            onClick={handleJoinGame}
            disabled={isLoading}
            className="w-full py-3 px-5 bg-green-500 text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Join Game
          </button>
        </div>
      </div>

      {error && (
        <div className="w-full mt-5 p-3 bg-red-100 text-red-600 rounded-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
};

export default Home;
