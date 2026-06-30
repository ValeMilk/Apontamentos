import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Label } from "./label";
import { cn } from "@/lib/utils";

/**
 * FormCard - Card padronizado para formulários
 * Usa elevation-2 e transições suaves
 */
interface FormCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export const FormCard = React.forwardRef<HTMLDivElement, FormCardProps>(
  ({ className, title, description, icon, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "elevation-2 hover:elevation-3 transition-smooth border-border",
          className
        )}
        {...props}
      >
        {(title || description) && (
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              {icon && <div className="text-primary">{icon}</div>}
              <div>
                {title && <CardTitle className="text-lg">{title}</CardTitle>}
                {description && (
                  <CardDescription className="text-sm mt-1">{description}</CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className={cn(title || description ? "pt-6" : "")}>
          {children}
        </CardContent>
      </Card>
    );
  }
);

FormCard.displayName = "FormCard";

/**
 * FormSection - Seção dentro de um formulário
 * Agrupa campos relacionados
 */
interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className="space-y-4">{children}</div>
      </div>
    );
  }
);

FormSection.displayName = "FormSection";

/**
 * FormField - Campo de formulário padronizado
 * Label + Input/Select/Textarea com mensagem de erro
 */
interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  description?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, htmlFor, error, required, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        <Label
          htmlFor={htmlFor}
          className={cn(
            "text-sm font-medium",
            error && "text-destructive"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground -mt-1">{description}</p>
        )}
        {children}
        {error && (
          <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

/**
 * EmptyState - Estado vazio padronizado
 * Usado quando não há dados para exibir
 */
interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="text-muted-foreground/40 mb-4">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            {description}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
