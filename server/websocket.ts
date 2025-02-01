import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws",
    clientTracking: true 
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection established");

    ws.on("message", (message: string) => {
      // Broadcast attendance updates to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  return wss;
}