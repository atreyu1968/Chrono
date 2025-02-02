import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SelectUser } from "@db/schema";
import { UserPlus, Edit2, Mail, BarChart2 } from "lucide-react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const employeeTypes = ["profesor", "pas"] as const;

const userSchema = z.object({
  username: z.string().min(3),
  fullName: z.string().min(1, "El nombre completo es requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  department: z.string().min(1, "El departamento es requerido"),
  employeeType: z.enum(["profesor", "pas"]),
  medusaUser: z.string().optional(),
  role: z.enum(["admin", "employee"]),
  avatar: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  password: z.string().min(6).optional(),
}).refine(data => {
  if (data.employeeType === "profesor" && !data.medusaUser) {
    return false;
  }
  return true;
}, {
  message: "El usuario Medusa es requerido para profesores",
  path: ["medusaUser"],
});


interface SendMessageDialogProps {
  userId: number;
  username: string;
  onSend: (message: string) => void;
}

function SendMessageDialog({ userId, username, onSend }: SendMessageDialogProps) {
  const [message, setMessage] = useState("");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Mail className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar mensaje a {username}</AlertDialogTitle>
          <AlertDialogDescription>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="mt-4"
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (message.trim()) {
                onSend(message);
                setMessage("");
              }
            }}
          >
            Enviar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SelectUser | null>(null);
  const { toast } = useToast();

  const { data: users } = useQuery<SelectUser[]>({
    queryKey: ["/api/users"],
  });

  const { data: departments } = useQuery({
    queryKey: ["/api/departments"],
  });

  const userStats = {
    total: users?.length || 0,
    admins: users?.filter((u) => u.role === "admin").length || 0,
    profesores: users?.filter((u) => u.employeeType === "profesor").length || 0,
    departments: users
      ? Array.from(new Set(users.map(u => u.department).filter(Boolean))).length
      : 0
  };

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: editingUser ? {
      username: editingUser.username,
      fullName: editingUser.fullName,
      email: editingUser.email,
      phone: editingUser.phone || '',
      department: editingUser.department || '',
      employeeType: editingUser.employeeType,
      medusaUser: editingUser.medusaUser || '',
      role: editingUser.role,
      avatar: editingUser.avatar || '',
      emergencyContact: editingUser.emergencyContact || '',
      emergencyPhone: editingUser.emergencyPhone || '',
    } : {
      username: "",
      fullName: "",
      email: "",
      phone: "",
      department: "",
      employeeType: "profesor",
      medusaUser: "",
      role: "employee",
      avatar: "",
      emergencyContact: "",
      emergencyPhone: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof userSchema>) => {
      if (editingUser) {
        return apiRequest("PATCH", `/api/users/${editingUser.id}`, values);
      } else {
        return apiRequest("POST", "/api/users", values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingUser(null);
      toast({
        title: `Usuario ${editingUser ? "actualizado" : "creado"} exitosamente`,
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

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: number; message: string }) => {
      return apiRequest("POST", "/api/messages", {
        toUserId: userId,
        content: message,
      });
    },
    onSuccess: () => {
      toast({
        title: "Mensaje enviado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al enviar mensaje",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof userSchema>) => {
    mutation.mutate(values);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{userStats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{userStats.admins}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Profesores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{userStats.profesores}</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="pb-2">
              <CardTitle>Departamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{userStats.departments}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Editar Usuario" : "Agregar Nuevo Usuario"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar departamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments?.map((dept: any) => (
                              <SelectItem key={dept.id} value={dept.name}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <FormField
                      control={form.control}
                      name="employeeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Empleado</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="profesor">Profesor</SelectItem>
                              <SelectItem value="pas">PAS</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch("employeeType") === "profesor" && (
                      <FormField
                        control={form.control}
                        name="medusaUser"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuario Medusa</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar rol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employee">Empleado</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                     <FormField
                    control={form.control}
                    name="avatar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL del Avatar</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contacto de Emergencia</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono de Emergencia</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                  {!editingUser && (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <Button type="submit" className="w-full">
                    {mutation.isPending
                      ? "Guardando..."
                      : editingUser
                      ? "Actualizar Usuario"
                      : "Agregar Usuario"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-lg shadow mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead>Avatar</TableHead>
                <TableHead>Nombre Completo</TableHead>
                 <TableHead>Email</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="w-[150px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                   <TableCell>
                    <Avatar>
                      <AvatarImage src={user.avatar || undefined} alt={user.fullName} />
                      <AvatarFallback>
                        {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <span className="capitalize">{user.employeeType}</span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {user.role === "admin" ? "Administrador" : "Empleado"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingUser(user);
                          form.reset({
                            username: user.username,
                            fullName: user.fullName,
                            email: user.email,
                            phone: user.phone || '',
                            department: user.department || '',
                            employeeType: user.employeeType,
                            medusaUser: user.medusaUser || '',
                            role: user.role,
                            avatar: user.avatar || '',
                            emergencyContact: user.emergencyContact || '',
                            emergencyPhone: user.emergencyPhone || '',
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <SendMessageDialog
                        userId={user.id}
                        username={user.fullName}
                        onSend={(message) =>
                          sendMessageMutation.mutate({
                            userId: user.id,
                            message,
                          })
                        }
                      />
                      <Link href={`/admin/users/${user.id}/attendance`}>
                        <Button variant="ghost" size="icon">
                          <BarChart2 className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}