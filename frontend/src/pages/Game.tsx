import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import DrawingCanvas from "../components/DrawingCanvas";
import Timer from "../components/Timer";
import apiService from "../utils/apiService";
import socketService from "../utils/socketService";

interface LocationState {
  playerName: string;
  isCreator: boolean;
}

interface GameResults {
  scores: Record<string, number>;
  winner: string;
  reference_image: string;
  drawings: Record<string, string>;
}

const Game = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<
    "waiting" | "active" | "finished"
  >("waiting");
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [gameResults, setGameResults] = useState<GameResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [playAgainRequested, setPlayAgainRequested] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [latestDrawing, setLatestDrawing] = useState<string | null>(null);
  const [playersReady, setPlayersReady] = useState<string[]>([]);

  useEffect(() => {
    if (!gameId || !state?.playerName) {
      navigate("/");
      return;
    }

    socketService.connect();

    const fetchGameInfo = async () => {
      try {
        const gameInfo = await apiService.getGameInfo(gameId);
        setPlayers(gameInfo.players);
        setGameStatus(gameInfo.status as "waiting" | "active" | "finished");

        if (gameInfo.reference_image) {
          setReferenceImage(gameInfo.reference_image);
        }
      } catch (err) {
        setError("Failed to load game information");
        console.error(err);
      }
    };

    fetchGameInfo();

    socketService.joinGame(gameId, state.playerName, (data) => {
      if (data?.player_id) {
        setPlayerId(data.player_id);
        console.log("Joined game with player ID:", data.player_id);
      }
    });

    socketService.onPlayerJoined((player) => {
      console.log("Player joined:", player);
      setPlayers((prev) => {
        if (prev.find((p) => p.id === player.id)) {
          return prev;
        }
        return [...prev, player];
      });
    });

    socketService.onGameStart((data) => {
      console.log("Game started with reference image:", data.reference_image);
      setGameStatus("active");
      setReferenceImage(data.reference_image);
      setGameResults(null);
      setPlayAgainRequested(false);
    });

    socketService.onTimeUp(() => {
      console.log("Time is up, setting game status to finished");
      setGameStatus("finished");

      // Set a timeout to handle case when results aren't received
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 seconds timeout

      return () => clearTimeout(timeoutId);
    });

    socketService.onGameResults((data) => {
      console.log("Game results received:", data);
      setGameResults(data);
      setLoadingTimeout(false);
      setPlayersReady([]);
    });

    socketService.onPlayerReady((data) => {
      console.log("Player ready notification:", data);
      setPlayersReady((prev) => {
        if (prev.includes(data.player_id)) {
          return prev;
        }
        return [...prev, data.player_id];
      });
    });

    socketService.onError((error) => {
      console.error("Socket error:", error);
      setError(error.message);
    });

    return () => {
      socketService.disconnect();
    };
  }, [gameId, navigate, state]);

  useEffect(() => {
    if (gameStatus === "finished" && gameId && playerId && latestDrawing) {
      console.log("Game status changed to finished, submitting drawing now");
      socketService.submitDrawing(gameId, playerId, latestDrawing);
    }
  }, [gameStatus, gameId, playerId, latestDrawing]);

  const handleDrawingSave = (data: string) => {
    console.log("Drawing saved locally");
    setLatestDrawing(data);

    if (gameId && playerId) {
      console.log("Saving drawing in game state:", gameStatus);
      socketService.submitDrawing(gameId, playerId, data);
    } else {
      console.error("Cannot save drawing: missing gameId or playerId");
    }
  };

  const handleCopyGameLink = () => {
    const gameUrl = `${window.location.origin}/game/${gameId}`;
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayAgain = () => {
    if (gameId && playerId) {
      setPlayAgainRequested(true);
      socketService.playAgain(gameId, playerId);
    }
  };

  const getOtherPlayer = () => {
    if (players.length < 2 || !playerId) return null;
    return players.find((p) => p.id !== playerId) || null;
  };

  const isOtherPlayerReady = () => {
    const otherPlayer = getOtherPlayer();
    return otherPlayer && playersReady.includes(otherPlayer.id);
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-24 p-8 text-center bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-red-600 mb-5">Error</h2>
        <p className="mb-6">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-500 mb-5">
          Speed Sketch Showdown
        </h1>
        {gameStatus === "waiting" && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Waiting for Players</h2>
            <p className="mb-6">
              {players.length === 1
                ? "Waiting for another player to join..."
                : "Game will start when both players are ready"}
            </p>
            <div className="p-4 mb-6 bg-gray-50 rounded-lg">
              <p className="mb-2">Share this link with a friend:</p>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/game/${gameId}`}
                  className="flex-1 p-2 border border-gray-300 rounded-l-lg"
                />
                <button
                  onClick={handleCopyGameLink}
                  className="px-4 py-2 bg-blue-500 text-white rounded-r-lg"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="font-bold mb-2">Players:</h3>
              <ul className="space-y-2">
                {players.map((player) => (
                  <li key={player.id} className="p-3 bg-gray-50 rounded-lg">
                    {player.name} {playerId === player.id ? "(You)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {gameStatus === "active" && (
        <div className="flex flex-col items-center">
          <div className="flex flex-col w-full max-w-3xl mx-auto gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4 text-blue-500">
                Reference Image
              </h3>
              {referenceImage ? (
                <img
                  src={referenceImage}
                  alt="Reference"
                  className="w-full max-h-80 object-contain border border-gray-300 rounded-lg"
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-lg">
                  Loading reference image...
                </div>
              )}
            </div>
            <div className="flex justify-center my-5">
              <Timer
                initialTime={30}
                isRunning={gameStatus === "active"}
                onTimeUp={() => {}}
              />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4 text-blue-500">
                Your Drawing
              </h3>
              <DrawingCanvas
                onSave={handleDrawingSave}
                isTimerRunning={gameStatus === "active"}
              />
            </div>
          </div>
        </div>
      )}

      {gameStatus === "finished" && !gameResults && (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-8 text-blue-500">
            Time's Up!
          </h2>
          <div className="text-center p-8">
            <div className="mb-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
            <p className="text-lg mb-4">
              Processing drawings and calculating results...
            </p>
            <p className="text-md text-gray-600">
              {loadingTimeout
                ? "Taking longer than expected. Make sure both players have submitted drawings."
                : "This should only take a moment"}
            </p>
            {loadingTimeout && (
              <div className="mt-8">
                <button
                  onClick={() => navigate("/")}
                  className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg"
                >
                  Back to Home
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {gameStatus === "finished" && gameResults && (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-8 text-blue-500">
            Game Results
          </h2>

          <div className="grid gap-6 mb-8">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-4 text-blue-500">
                Reference Image
              </h3>
              <img
                src={gameResults.reference_image}
                alt="Reference"
                className="max-w-full max-h-60 object-contain mx-auto border border-gray-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="p-6 bg-gray-50 rounded-lg text-center"
                >
                  <h3 className="text-xl font-bold mb-3 text-blue-500">
                    {player.name} {playerId === player.id ? "(You)" : ""}
                  </h3>
                  {gameResults.drawings[player.id] ? (
                    <>
                      <img
                        src={gameResults.drawings[player.id]}
                        alt={`${player.name}'s drawing`}
                        className="w-full max-h-60 object-contain border border-gray-300 bg-white rounded-lg mb-4"
                      />
                      <p className="text-xl font-bold text-gray-700">
                        Similarity: {gameResults.scores[player.id]}%
                        {gameResults.winner === player.id && (
                          <span className="text-green-500 ml-2">(Winner!)</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-gray-200 text-gray-600 rounded-lg">
                      No drawing submitted
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            {isOtherPlayerReady() && !playAgainRequested && (
              <p className="text-green-500 mb-4">
                {getOtherPlayer()?.name} wants to play again!
              </p>
            )}
            {playAgainRequested && isOtherPlayerReady() && (
              <p className="text-blue-500 mb-4">
                Both players ready! Waiting to start...
              </p>
            )}
            <button
              onClick={handlePlayAgain}
              disabled={playAgainRequested}
              className="px-8 py-4 text-xl bg-green-500 text-white rounded-lg font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {playAgainRequested
                ? "Waiting for other player..."
                : "Play Again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
