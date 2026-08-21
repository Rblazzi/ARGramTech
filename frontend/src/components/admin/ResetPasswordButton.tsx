import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';

// Botão "Redefinir senha" reutilizável (Usuários e Entregadores usam o
// mesmo endpoint POST /staff/:id/reset-password — é uma operação sobre a
// identidade global da pessoa, não depende do papel dela na empresa).
export function ResetPasswordButton({ membershipId }: { membershipId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = useMutation({
    mutationFn: () => api.post(`/staff/${membershipId}/reset-password`, { newPassword }),
    onSuccess: () => {
      setDone(true);
      setError(null);
      setNewPassword('');
    },
    onError: (err) => {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao redefinir senha' : 'Erro ao redefinir senha');
    },
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setDone(false);
          setError(null);
        }}
        className="text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        Redefinir senha
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="password"
        autoComplete="new-password"
        minLength={8}
        placeholder="Nova senha"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-32 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs outline-none focus:border-[var(--brand)]"
      />
      <button
        onClick={() => newPassword.length >= 8 && resetPassword.mutate()}
        disabled={resetPassword.isPending || newPassword.length < 8}
        className="text-xs text-[var(--brand)] hover:underline disabled:opacity-50"
      >
        {resetPassword.isPending ? 'Salvando...' : 'Confirmar'}
      </button>
      <button
        onClick={() => {
          setIsOpen(false);
          setNewPassword('');
        }}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        Cancelar
      </button>
      {done && <span className="text-xs text-green-400">Senha alterada!</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
