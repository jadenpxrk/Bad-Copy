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
    "waiting" | "ready" | "active" | "finished"
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
  const [startingGame, setStartingGame] = useState(false);

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
        setGameStatus(
          gameInfo.status as "waiting" | "ready" | "active" | "finished"
        );

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

      // If two players have joined, update status to ready
      if (players.length === 1) {
        setGameStatus("ready");
      }
    });

    socketService.onGameStart((data) => {
      console.log("Game started with reference image:", data.reference_image);
      setGameStatus("active");
      setStartingGame(false);
      setReferenceImage(data.reference_image);
      setGameResults(null);
      setPlayAgainRequested(false);
    });

    socketService.onTimeUp(() => {
      console.log("Time is up, setting game status to finished");
      // Make a final save of the drawing before finishing
      if (gameId && playerId && latestDrawing) {
        console.log("Saving final drawing before game ends");
        socketService.submitDrawing(gameId, playerId, latestDrawing);
      }
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

  // Update to detect when players.length changes
  useEffect(() => {
    if (players.length === 2 && gameStatus === "waiting") {
      setGameStatus("ready");
    }
  }, [players, gameStatus]);

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

  const handleStartGame = () => {
    if (gameId && playerId && state.isCreator) {
      setStartingGame(true);
      socketService.startGame(gameId, playerId);
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
      <div className="card max-w-xl mx-auto my-24 bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <h2 className="card-title text-2xl font-bold text-error">Error</h2>
          <p className="mb-6">{error}</p>
          <div className="card-actions">
            <button onClick={() => navigate("/")} className="btn btn-primary">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-5">Bad Copy</h1>
        {(gameStatus === "waiting" || gameStatus === "ready") && (
          <div className="card max-w-2xl mx-auto bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl font-bold mb-4 justify-center">
                {gameStatus === "waiting"
                  ? "Waiting for Players"
                  : "Ready to Start"}
              </h2>

              {gameStatus === "waiting" && (
                <p className="mb-6">Waiting for another player to join...</p>
              )}

              {gameStatus === "ready" && (
                <p className="mb-6">
                  {state.isCreator
                    ? "All players have joined! Click start when you're ready."
                    : "All players have joined! Waiting for the host to start the game..."}
                </p>
              )}

              <div className="p-4 mb-6 bg-base-200 rounded-lg">
                <p className="mb-2">Share this link with a friend:</p>
                <div className="join w-full">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/game/${gameId}`}
                    className="input input-bordered join-item w-full"
                  />
                  <button
                    onClick={handleCopyGameLink}
                    className="btn btn-primary join-item"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-bold mb-2">Players:</h3>
                <ul className="space-y-2">
                  {players.map((player) => (
                    <li key={player.id} className="p-3 bg-base-200 rounded-lg">
                      {player.name} {playerId === player.id ? "(You)" : ""}
                      {state.isCreator && playerId === player.id && " (Host)"}
                    </li>
                  ))}
                </ul>
              </div>

              {gameStatus === "ready" && state.isCreator && (
                <div className="card-actions justify-center mt-6">
                  <button
                    onClick={handleStartGame}
                    className="btn btn-primary btn-lg"
                    disabled={startingGame}
                  >
                    {startingGame ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Starting Game...
                      </>
                    ) : (
                      "Start Game"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {gameStatus === "active" && (
        <div className="flex flex-col items-center">
          <div className="flex flex-col w-full max-w-3xl mx-auto gap-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-xl font-bold mb-4 text-primary">
                  Reference Image
                </h3>
                {referenceImage ? (
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="w-full max-h-80 object-contain border border-base-300 rounded-lg"
                  />
                ) : (
                  <div className="w-full h-40 flex items-center justify-center bg-base-200 rounded-lg">
                    <span className="loading loading-spinner loading-md"></span>
                    <span className="ml-2">Loading reference image...</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-center my-5">
              <Timer
                initialTime={30}
                isRunning={gameStatus === "active"}
                onTimeUp={() => {}}
              />
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-xl font-bold mb-4 text-primary">
                  Your Drawing
                </h3>
                <DrawingCanvas
                  onSave={handleDrawingSave}
                  isTimerRunning={gameStatus === "active"}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {gameStatus === "finished" && !gameResults && (
        <div className="card max-w-4xl mx-auto bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title text-2xl font-bold text-center mb-8 text-primary justify-center">
              Time's Up!
            </h2>
            <div className="text-center p-8">
              <div className="mb-8">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
              <p className="text-lg mb-4">
                Processing drawings and calculating results...
              </p>
              <p className="text-md text-base-content/60">
                {loadingTimeout
                  ? "Taking longer than expected. Make sure both players have submitted drawings."
                  : "This should only take a moment"}
              </p>
              {loadingTimeout && (
                <div className="mt-8">
                  <button
                    onClick={() => navigate("/")}
                    className="btn btn-primary"
                  >
                    Back to Home
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {gameStatus === "finished" && gameResults && (
        <div className="card max-w-4xl mx-auto bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl font-bold text-center mb-8 text-primary justify-center">
              Game Results
            </h2>

            <div className="grid gap-6 mb-8">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-4 text-primary">
                  Reference Image
                </h3>
                <img
                  src={gameResults.reference_image}
                  alt="Reference"
                  className="max-w-full max-h-60 object-contain mx-auto border border-base-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`card bg-base-100 shadow-md ${
                      gameResults.winner === player.id
                        ? "border-4 border-success"
                        : ""
                    }`}
                  >
                    <div className="card-body">
                      <h3 className="card-title text-xl font-bold mb-3 text-primary justify-center">
                        {player.name} {playerId === player.id ? "(You)" : ""}
                      </h3>
                      {gameResults.drawings[player.id] ? (
                        <>
                          <img
                            src={gameResults.drawings[player.id]}
                            alt={`${player.name}'s drawing`}
                            className="w-full max-h-60 object-contain border border-base-300 bg-base-100 rounded-lg mb-4"
                          />
                          <p className="text-xl font-bold text-base-content text-center">
                            Similarity: {gameResults.scores[player.id]}%
                            {gameResults.winner === player.id && (
                              <span className="badge badge-success ml-2">
                                Winner!
                              </span>
                            )}
                          </p>
                        </>
                      ) : (
                        <div className="h-48 flex items-center justify-center bg-base-200 text-base-content/60 rounded-lg">
                          No drawing submitted
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mt-8">
              {isOtherPlayerReady() && !playAgainRequested && (
                <div className="alert alert-success mb-4">
                  <span>{getOtherPlayer()?.name} wants to play again!</span>
                </div>
              )}
              {playAgainRequested && isOtherPlayerReady() && (
                <div className="alert alert-info mb-4">
                  <span>Both players ready! Waiting to start...</span>
                </div>
              )}
              <button
                onClick={handlePlayAgain}
                disabled={playAgainRequested}
                className="btn btn-success btn-lg"
              >
                {playAgainRequested ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>{" "}
                    Waiting for other player...
                  </>
                ) : (
                  "Play Again"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
