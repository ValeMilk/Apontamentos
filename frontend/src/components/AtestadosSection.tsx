import { useState } from 'react';
import { Justification, Employee } from '@/types/attendance';
import { FileText, Image as ImageIcon, ExternalLink, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AtestadosSectionProps {
  justifications: Justification[];
  employees: Employee[];
}

export function AtestadosSection({ justifications, employees }: AtestadosSectionProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const atestados = justifications.filter((j) => j.attestFile);

  if (atestados.length === 0) return null;

  const getEmployeeName = (id: string) =>
    employees.find((e) => e.id === id)?.name || 'Desconhecido';

  const isImage = (path: string) => /\.(jpg|jpeg|png|webp)$/i.test(path);

  const url = (path: string) => `/uploads/${path}`;

  return (
    <div className="mt-6 border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="table-header-cell px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4" />
          <h3 className="font-semibold text-sm">ATESTADOS ENVIADOS</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {atestados.length} {atestados.length === 1 ? 'atestado' : 'atestados'}
        </Badge>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {atestados.map((just) => {
            const fileUrl = url(just.attestFile!);
            const img = isImage(just.attestFile!);
            return (
              <div
                key={just.id}
                className="border border-border rounded-lg overflow-hidden bg-card shadow-sm flex flex-col"
              >
                {/* Thumbnail / ícone */}
                <div
                  className="relative bg-muted flex items-center justify-center cursor-pointer overflow-hidden"
                  style={{ height: 160 }}
                  onClick={() => img ? setPreview(fileUrl) : window.open(fileUrl, '_blank')}
                >
                  {img ? (
                    <img
                      src={fileUrl}
                      alt="Atestado"
                      className="object-cover w-full h-full hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="w-12 h-12" />
                      <span className="text-xs">PDF</span>
                    </div>
                  )}
                  <div className="absolute top-1 right-1 bg-black/50 backdrop-blur-sm rounded-full p-1">
                    {img ? (
                      <ImageIcon className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <p className="font-semibold text-xs uppercase leading-tight">
                    {getEmployeeName(just.employeeId)}
                  </p>
                  <p className="text-xs text-muted-foreground">Dia: {just.day}</p>
                  {just.text && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{just.text}</p>
                  )}
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto pt-2 text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Abrir arquivo
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox para imagens */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="Atestado"
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold leading-none bg-black/50 rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/70"
            onClick={() => setPreview(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
