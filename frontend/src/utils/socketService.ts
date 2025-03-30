import { Socket, io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface Player {
  id: string;
  name: string;
}

interface JoinGameResponse {
  player_id: string;
}

interface GameStartData {
  reference_image: string;
}

interface PlayerReadyData {
  player_id: string;
  player_name: string;
}

interface GameResultsData {
  scores: Record<string, number>;
  winner: string;
  reference_image: string;
  drawings: Record<string, string>;
}

interface ErrorData {
  message: string;
}

class SocketService {
  private socket: Socket | null = null;

  connect(): void {
    if (!this.socket) {
      try {
        this.socket = io(API_URL);
        console.log("Socket connected to", API_URL);
      } catch (error) {
        console.error("Socket connection failed:", error);
      }
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("Socket disconnected");
    }
  }

  joinGame(
    gameId: string,
    playerName: string,
    callback: (data: JoinGameResponse) => void
  ): void {
    if (!this.socket) this.connect();
    this.socket?.emit(
      "join_game",
      { game_id: gameId, player_name: playerName },
      callback
    );
  }

  submitDrawing(gameId: string, playerId: string, drawingData: string): void {
    if (!this.socket) {
      console.error("Socket not connected when trying to submit drawing");
      this.connect();
    }

    console.log(`Submitting drawing for player ${playerId} in game ${gameId}`);

    try {
      this.socket?.emit("submit_drawing", {
        game_id: gameId,
        player_id: playerId,
        drawing_data: drawingData,
      });
      console.log("Drawing submitted successfully");
    } catch (error) {
      console.error("Error submitting drawing:", error);
    }
  }

  playAgain(gameId: string, playerId: string): void {
    this.socket?.emit("play_again", {
      game_id: gameId,
      player_id: playerId,
    });
  }

  startGame(gameId: string, playerId: string): void {
    console.log(`Starting game ${gameId} by player ${playerId}`);
    this.socket?.emit("start_game", {
      game_id: gameId,
      player_id: playerId,
    });
  }

  onPlayerJoined(callback: (data: Player) => void): void {
    this.socket?.on("player_joined", callback);
  }

  onGameStart(callback: (data: GameStartData) => void): void {
    this.socket?.on("game_start", callback);
  }

  onTimeUp(callback: () => void): void {
    this.socket?.on("time_up", () => {
      console.log("Time up event received");
      callback();
    });
  }

  onGameResults(callback: (data: GameResultsData) => void): void {
    this.socket?.on("game_results", (data) => {
      console.log("Game results received:", data);
      callback(data);
    });
  }

  onPlayerReady(callback: (data: PlayerReadyData) => void): void {
    this.socket?.on("player_ready", (data) => {
      console.log("Player ready for another game:", data);
      callback(data);
    });
  }

  onError(callback: (data: ErrorData) => void): void {
    this.socket?.on("error", callback);
  }

  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
