import * as React from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface FileUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export function FileUploader({
  onFileSelect,
  accept,
  className,
  ...props
}: FileUploaderProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles?.[0]) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    accept: accept ? { [accept]: [] } : undefined,
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50",
        className
      )}
      {...props}
    >
      <input {...getInputProps()} />
      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {isDragActive
          ? "Suelta la imagen aquí"
          : "Arrastra una imagen o haz clic para seleccionar"}
      </p>
    </div>
  );
}
