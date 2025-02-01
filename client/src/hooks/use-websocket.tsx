import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket(onMessage: (data: any) => void) {
  const ws = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    function connect() {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Error de conexión",
          description: "No se pudo establecer la conexión con el servidor",
          variant: "destructive",
        });
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected. Attempting to reconnect...');
        setTimeout(connect, 3000);
      };
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
    }
  };

  return { sendMessage };
}
