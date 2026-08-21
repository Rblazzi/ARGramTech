import { useRef, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { isAxiosError } from 'axios';

interface ImageUploadFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
  client: AxiosInstance;
  endpoint: string;
}

// Campo de upload reutilizável: mostra a imagem atual (se tiver), um
// botão pra escolher outra do computador, sobe pro endpoint recebido
// (/uploads/image pra empresa, /platform/uploads/image pra plataforma) e
// devolve a URL pública pronta pra salvar no formulário que usa isso.
export function ImageUploadField({ label, value, onChange, client, endpoint }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await client.post<{ url: string }>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Falha ao enviar imagem' : 'Falha ao enviar imagem');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-[var(--text-muted)]">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt={label} className="h-16 w-16 rounded-lg border border-[var(--border)] object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)]">
            sem imagem
          </div>
        )}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
        >
          {isUploading ? 'Enviando...' : 'Escolher imagem'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
