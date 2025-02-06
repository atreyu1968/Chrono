import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const departmentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);

  const { data: departments, isLoading } = useQuery({
    queryKey: ["/api/departments"],
  });

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: DepartmentFormValues) => {
      return apiRequest("POST", "/api/departments", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Departamento creado",
        description: "El departamento ha sido creado exitosamente.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: DepartmentFormValues & { id: number }) => {
      return apiRequest("PATCH", `/api/departments/${values.id}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsDialogOpen(false);
      setSelectedDepartment(null);
      form.reset();
      toast({
        title: "Departamento actualizado",
        description: "El departamento ha sido actualizado exitosamente.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Departamento eliminado",
        description: "El departamento ha sido eliminado exitosamente.",
      });
    },
  });

  function onSubmit(values: DepartmentFormValues) {
    if (selectedDepartment) {
      updateMutation.mutate({ ...values, id: selectedDepartment.id });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestión de Departamentos</h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setSelectedDepartment(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Departamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedDepartment ? "Editar" : "Nuevo"} Departamento
                </DialogTitle>
                <DialogDescription>
                  {selectedDepartment 
                    ? "Modifique los datos del departamento según sea necesario." 
                    : "Complete los datos para crear un nuevo departamento."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    {createMutation.isPending || updateMutation.isPending
                      ? "Guardando..."
                      : "Guardar"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments?.map((department: any) => (
            <Card key={department.id}>
              <CardHeader>
                <CardTitle>{department.name}</CardTitle>
                {department.description && (
                  <CardDescription>{department.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedDepartment(department);
                      form.reset({
                        name: department.name,
                        description: department.description || "",
                      });
                      setIsDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm("¿Estás seguro de eliminar este departamento?")) {
                        deleteMutation.mutate(department.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}