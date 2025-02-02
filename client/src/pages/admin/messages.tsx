import { useState, useEffect } from "react";
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
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { SelectMessage, SelectUser } from "@db/schema";

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: messages } = useQuery<(SelectMessage & { fromUser: SelectUser })[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000, // Refresca cada 5 segundos
  });

  const { data: users } = useQuery<SelectUser[]>({
    queryKey: ["/api/users"],
  });

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
    if (selectedUserId && messages) {
      const unreadMessages = messages.filter(
        m => m.fromUserId === selectedUserId && m.toUserId === user?.id && !m.read
      );

      // Marca los mensajes como leídos uno por uno
      unreadMessages.forEach(message => {
        markAsReadMutation.mutate(message.id);
      });
    }
  }, [selectedUserId, messages, user?.id]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedUserId) return;
      return apiRequest("POST", "/api/messages", {
        toUserId: selectedUserId,
        content: content.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
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

  // Group messages by user
  const messagesByUser = messages?.reduce((acc, message) => {
    if (!message || !message.fromUser) return acc;

    const otherUserId = message.fromUserId === user?.id ? message.toUserId : message.fromUserId;
    if (!acc[otherUserId]) {
      const otherUser = users?.find(u => u.id === otherUserId);
      if (!otherUser) return acc;

      acc[otherUserId] = {
        user: otherUser,
        messages: [],
      };
    }
    acc[otherUserId].messages.push(message);
    return acc;
  }, {} as Record<number, { user: SelectUser; messages: (SelectMessage & { fromUser: SelectUser })[] }>);

  const selectedMessages = selectedUserId ? 
    messages?.filter(m => 
      (m.fromUserId === user?.id && m.toUserId === selectedUserId) ||
      (m.fromUserId === selectedUserId && m.toUserId === user?.id)
    ).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()) : [];

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="grid gap-8 md:grid-cols-[300px,1fr]">
          {/* Lista de usuarios */}
          <Card>
            <CardHeader>
              <CardTitle>Conversaciones</CardTitle>
              <CardDescription>
                {Object.keys(messagesByUser || {}).length} conversaciones activas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
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
                        "w-full justify-start gap-2",
                        selectedUserId === u.id && "bg-primary/10"
                      )}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Avatar>
                          <AvatarImage src={u.avatar || undefined} />
                          <AvatarFallback>
                            {u.fullName?.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{u.fullName}</p>
                          {unreadCount > 0 && (
                            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                              {unreadCount} nuevo(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}

                {(!users || users.length <= 1) && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No hay usuarios disponibles</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mensajes */}
          <Card>
            {selectedUserId && users?.find(u => u.id === selectedUserId) ? (
              <>
                <CardHeader>
                  <CardTitle>
                    Chat con {users.find(u => u.id === selectedUserId)?.fullName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[400px] overflow-y-auto space-y-4 mb-4">
                      {selectedMessages?.map((message) => (
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
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                            e.preventDefault();
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
                        <Send className="h-4 w-4" />
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