import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import EmployeeLayout from "@/components/layout/employee-layout";
import { Send } from "lucide-react";
import type { SelectMessage, SelectUser } from "@db/schema";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<SelectUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, onMessage } = useWebSocket();

  // Obtener todos los usuarios para poder enviar mensajes
  const { data: users } = useQuery<SelectUser[]>({
    queryKey: ["/api/users"],
  });

  // Obtener mensajes
  const { data: messages } = useQuery<(SelectMessage & { fromUser: SelectUser })[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000, // Refresca cada 5 segundos
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for real-time messages
  useEffect(() => {
    if (!onMessage) return;
    onMessage((data) => {
      if (data.type === "message") {
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      }
    });
  }, [onMessage]);

  // Marcar mensajes como leídos cuando se selecciona un usuario
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/messages/${messageId}`, { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  // Marcar mensajes como leídos cuando se selecciona un usuario y cuando llegan nuevos mensajes
  useEffect(() => {
    if (selectedUser && messages) {
      const unreadMessages = messages.filter(
        m => m.fromUserId === selectedUser.id && m.toUserId === user?.id && !m.read
      );

      // Marca los mensajes como leídos uno por uno
      unreadMessages.forEach(message => {
        markAsReadMutation.mutate(message.id);
      });
    }
  }, [selectedUser, messages, user?.id]);

  // Mutación para enviar mensajes
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !newMessage.trim()) return;
      const response = await apiRequest("POST", "/api/messages", {
        toUserId: selectedUser.id,
        content: newMessage.trim(),
      });

      // Send WebSocket message
      if (sendMessage) {
        sendMessage({
          type: "message",
          data: response,
        });
      }

      return response;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Mensaje enviado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredMessages = messages?.filter(m => 
    (m.fromUserId === user?.id && m.toUserId === selectedUser?.id) ||
    (m.fromUserId === selectedUser?.id && m.toUserId === user?.id)
  ).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()) || [];

  return (
    <EmployeeLayout>
      <div className="container mx-auto py-8">
        <div className="grid gap-8 md:grid-cols-[300px,1fr]">
          {/* Lista de usuarios */}
          <Card>
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {users?.filter(u => u.id !== user?.id).map((u) => {
                const unreadCount = messages?.filter(m => 
                  m.fromUserId === u.id && 
                  m.toUserId === user?.id && 
                  !m.read
                ).length || 0;

                return (
                  <Button
                    key={u.id}
                    variant="ghost"
                    className={cn(
                      "w-full flex items-center gap-3 justify-start p-2 hover:bg-slate-100",
                      selectedUser?.id === u.id && "bg-slate-100"
                    )}
                    onClick={() => setSelectedUser(u)}
                  >
                    <Avatar>
                      <AvatarImage src={u.avatar || undefined} />
                      <AvatarFallback>
                        {u.fullName?.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {u.role === "admin" ? "Administrador" : "Empleado"}
                      </p>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                          {unreadCount} nuevo(s)
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          {/* Mensajes */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedUser ? `Chat con ${selectedUser.fullName}` : "Mensajes"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4 h-[500px] overflow-y-auto">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.fromUserId === user?.id && "flex-row-reverse"
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={message.fromUser.avatar || undefined} />
                      <AvatarFallback>
                        {message.fromUser.fullName?.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "flex flex-col max-w-[70%]",
                        message.fromUserId === user?.id ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-lg p-3",
                          message.fromUserId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.content}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {format(new Date(message.sentAt), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <Textarea
                  placeholder={
                    selectedUser
                      ? "Escribe tu mensaje..."
                      : "Selecciona un usuario para enviar mensajes"
                  }
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  disabled={!selectedUser}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                      e.preventDefault();
                      sendMessageMutation.mutate();
                    }
                  }}
                />
                <Button
                  disabled={!selectedUser || !newMessage.trim()}
                  onClick={() => sendMessageMutation.mutate()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </EmployeeLayout>
  );
}