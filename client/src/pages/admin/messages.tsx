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
  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/messages/${messageId}`, { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Mensajes</h1>
        <div className="space-y-4">
          {messages?.map((message) => (
            <Card
              key={message.id}
              className={cn(
                "transition-colors",
                !message.read && "bg-primary/5"
              )}
              onClick={() => {
                if (!message.read) {
                  markAsReadMutation.mutate(message.id);
                }
              }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarImage src={message.from.avatar} />
                      <AvatarFallback>
                        {message.from.fullName.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{message.from.fullName}</CardTitle>
                      <CardDescription>
                        {format(new Date(message.sentAt), "d 'de' MMMM 'a las' HH:mm", {
                          locale: es,
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  {!message.read && (
                    <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                      Nuevo
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{message.content}</p>
              </CardContent>
            </Card>
          ))}
          {messages?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>No tienes mensajes</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
