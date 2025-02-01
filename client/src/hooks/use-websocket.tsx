import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket(onMessage: (data: any) => void) {
  const ws = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Usar la URL actual del navegador para construir la URL del WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    function connect() {
      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('Conexión WebSocket establecida');
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (error) {
            console.error('Error al procesar mensaje WebSocket:', error);
          }
        };

        ws.current.onerror = (error) => {
          console.error('Error WebSocket:', error);
          toast({
            title: "Error de conexión",
            description: "No se pudo establecer la conexión con el servidor. Reintentando...",
            variant: "destructive",
          });
        };

        ws.current.onclose = () => {
          console.log('Conexión WebSocket cerrada. Intentando reconectar...');
          setTimeout(connect, 3000);
        };
      } catch (error) {
        console.error('Error al crear conexión WebSocket:', error);
        setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [onMessage]);

  const sendMessage = (data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket no está conectado. El mensaje se enviará cuando se establezca la conexión.');
    }
  };

  return { sendMessage };
}