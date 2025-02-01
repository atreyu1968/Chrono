import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true,
    path: "/ws"
  });

  // Manejar el upgrade de la conexión HTTP a WebSocket
  server.on('upgrade', (request, socket, head) => {
    if (request.headers['sec-websocket-protocol'] === 'vite-hmr') {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Nueva conexión WebSocket establecida");

    ws.on("message", (message: string) => {
      try {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      } catch (error) {
        console.error("Error al procesar mensaje WebSocket:", error);
      }
    });

    ws.on("close", () => {
      console.log("Cliente desconectado");
    });

    ws.on("error", (error) => {
      console.error("Error en WebSocket:", error);
    });

    try {
      ws.send(JSON.stringify({
        type: "connection",
        message: "Conexión establecida correctamente"
      }));
    } catch (error) {
      console.error("Error al enviar mensaje de confirmación:", error);
    }
  });

  return wss;
}