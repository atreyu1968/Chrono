import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Message {
  id: number;
  content: string;
  sentAt: string;
  read: boolean;
  from: {
    id: number;
    fullName: string;
    avatar?: string;
  };
}

export default function MessagesPage() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000, // Actualizar cada 5 segundos
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/messages/${messageId}`, { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedUserId) return;
      return apiRequest("POST", "/api/messages", {
        toUserId: selectedUserId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
    },
  });

  // Agrupar mensajes por usuario
  const messagesByUser = messages?.reduce((acc, message) => {
    const userId = message.from.id;
    if (!acc[userId]) {
      acc[userId] = {
        user: message.from,
        messages: [],
      };
    }
    acc[userId].messages.push(message);
    return acc;
  }, {} as Record<number, { user: Message["from"]; messages: Message[] }>);

  const selectedUserMessages = selectedUserId ? messagesByUser?.[selectedUserId]?.messages : [];

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Mensajes</h1>
        <div className="grid grid-cols-[300px,1fr] gap-6">
          {/* Lista de usuarios */}
          <Card>
            <CardHeader>
              <CardTitle>Conversaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.values(messagesByUser || {}).map(({ user, messages }) => {
                  const unreadCount = messages.filter(m => !m.read).length;
                  return (
                    <Button
                      key={user.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        selectedUserId === user.id && "bg-primary/10"
                      )}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        messages.forEach(m => {
                          if (!m.read) {
                            markAsReadMutation.mutate(m.id);
                          }
                        });
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.fullName.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{user.fullName}</p>
                          {unreadCount > 0 && (
                            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                              {unreadCount} nuevo{unreadCount !== 1 && "s"}
                            </span>
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Mensajes */}
          <Card>
            {selectedUserId ? (
              <>
                <CardHeader>
                  <CardTitle>
                    Chat con {messagesByUser?.[selectedUserId]?.user.fullName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[400px] overflow-y-auto space-y-4 mb-4">
                      {selectedUserMessages?.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "p-4 rounded-lg max-w-[80%]",
                            message.from.id === selectedUserId
                              ? "bg-slate-100 ml-0"
                              : "bg-primary/10 ml-auto"
                          )}
                        >
                          <p className="text-sm mb-1">{message.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(message.sentAt), "d 'de' MMMM 'a las' HH:mm", {
                              locale: es,
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newMessage.trim()) {
                            sendMessageMutation.mutate(newMessage);
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          if (newMessage.trim()) {
                            sendMessageMutation.mutate(newMessage);
                          }
                        }}
                      >
                        Enviar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-4 opacity-50" />
                <p>Selecciona una conversación para ver los mensajes</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}