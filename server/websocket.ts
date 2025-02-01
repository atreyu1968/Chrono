import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws",
    clientTracking: true,
    perMessageDeflate: false // Deshabilitar la compresión para mayor compatibilidad
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Nueva conexión WebSocket establecida");

    ws.on("message", (message: string) => {
      try {
        // Transmitir actualizaciones de asistencia a todos los clientes conectados
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

    // Enviar mensaje de confirmación al cliente
    try {
      ws.send(JSON.stringify({
        type: "connection",
        message: "Conexión establecida correctamente"
      }));
    } catch (error) {
      console.error("Error al enviar mensaje de confirmación:", error);
    }
  });

  wss.on("error", (error) => {
    console.error("Error en el servidor WebSocket:", error);
  });

  return wss;
}