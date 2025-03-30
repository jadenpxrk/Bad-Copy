const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface GameInfo {
  id: string;
  status: string;
  players: Array<{
    id: string;
    name: string;
  }>;
  reference_image: string | null;
}

class ApiService {
  async createGame(): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/api/create-game`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create game");
      }

      const data = await response.json();
      return data.game_id;
    } catch (error) {
      console.error("Error creating game:", error);
      throw error;
    }
  }

  async getGameInfo(gameId: string): Promise<GameInfo> {
    try {
      const response = await fetch(`${API_URL}/api/game/${gameId}`);

      if (!response.ok) {
        throw new Error("Failed to get game info");
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting game info:", error);
      throw error;
    }
  }
}

export default new ApiService();
