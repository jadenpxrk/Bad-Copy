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
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold text-primary mb-5">Bad Copy</h1>
          <p className="text-lg mb-8">
            Compete to draw a reference image in 30 seconds!
          </p>

          <div className="form-control w-full mb-6">
            <label className="label">
              <span className="label-text font-semibold">Your Name</span>
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="flex flex-wrap gap-6 mt-5 justify-center">
            <div className="card w-96 bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl font-bold text-primary justify-center">
                  Start a New Game
                </h2>
                <p>Create a new game and invite a friend to join</p>
                <div className="card-actions justify-end mt-4">
                  <button
                    onClick={handleCreateGame}
                    disabled={isLoading}
                    className="btn btn-primary w-full"
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      ""
                    )}
                    {isLoading ? "Creating..." : "Create Game"}
                  </button>
                </div>
              </div>
            </div>

            <div className="card w-96 bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl font-bold text-primary justify-center">
                  Join a Game
                </h2>
                <p>Enter a game ID provided by your friend</p>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Game ID</span>
                  </label>
                  <input
                    type="text"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    placeholder="Paste game ID here"
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                <div className="card-actions justify-end mt-4">
                  <button
                    onClick={handleJoinGame}
                    disabled={isLoading}
                    className="btn btn-success w-full"
                  >
                    Join Game
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error mt-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
