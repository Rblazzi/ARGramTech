import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Address, UserProfile } from '../../types';

const emptyAddressForm = {
  label: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
};

export function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => (await api.get<UserProfile>('/users/me')).data,
  });
  const { data: addresses, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await api.get<Address[]>('/addresses')).data,
  });

  const [profileForm, setProfileForm] = useState<{ name: string; phone: string } | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && !profileForm) {
      setProfileForm({ name: profile.name, phone: profile.phone ?? '' });
    }
  }, [profile, profileForm]);

  const saveProfile = useMutation({
    mutationFn: (payload: { name: string; phone: string }) => api.patch<UserProfile>('/users/me', payload),
    onSuccess: (res) => {
      queryClient.setQueryData(['users', 'me'], res.data);
      setProfileSaved(true);
      setProfileError(null);
      setTimeout(() => setProfileSaved(false), 3000);
    },
    onError: (err) => {
      setProfileError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao salvar' : 'Erro ao salvar');
    },
  });

  function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (profileForm) saveProfile.mutate(profileForm);
  }

  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const createAddress = useMutation({
    mutationFn: (payload: typeof emptyAddressForm) => api.post<Address>('/addresses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setAddressForm(emptyAddressForm);
      setIsFormOpen(false);
      setAddressError(null);
    },
    onError: (err) => {
      setAddressError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao salvar endereço' : 'Erro ao salvar endereço');
    },
  });

  const updateAddress = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<typeof emptyAddressForm> & { isDefault?: boolean } }) =>
      api.patch<Address>(`/addresses/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setAddressForm(emptyAddressForm);
      setEditingId(null);
      setIsFormOpen(false);
      setAddressError(null);
    },
    onError: (err) => {
      setAddressError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao salvar endereço' : 'Erro ao salvar endereço');
    },
  });

  const removeAddress = useMutation({
    mutationFn: (id: string) => api.delete(`/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    onError: () => setAddressError('Não foi possível remover o endereço'),
  });

  const setDefaultAddress = useMutation({
    mutationFn: (id: string) => api.patch(`/addresses/${id}`, { isDefault: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    onError: () => setAddressError('Não foi possível definir como padrão'),
  });

  function openNewAddressForm() {
    setEditingId(null);
    setAddressForm(emptyAddressForm);
    setIsFormOpen(true);
    setAddressError(null);
  }

  function openEditAddressForm(address: Address) {
    setEditingId(address.id);
    setAddressForm({
      label: address.label ?? '',
      street: address.street,
      number: address.number,
      complement: address.complement ?? '',
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    });
    setIsFormOpen(true);
    setAddressError(null);
  }

  function handleAddressSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingId) {
      updateAddress.mutate({ id: editingId, payload: addressForm });
    } else {
      createAddress.mutate(addressForm);
    }
  }

  const isSavingAddress = createAddress.isPending || updateAddress.isPending;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Meu perfil</h1>

      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-medium">Meus dados</h2>

        {isLoadingProfile || !profileForm ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleProfileSubmit} className="mt-4 grid gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="profile-name" className="text-sm text-[var(--text-muted)]">
                Nome
              </label>
              <input
                id="profile-name"
                required
                autoComplete="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => f && { ...f, name: e.target.value })}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-[var(--text-muted)]">E-mail</label>
              <input
                disabled
                value={profile?.email ?? ''}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text-muted)] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="profile-phone" className="text-sm text-[var(--text-muted)]">
                Telefone
              </label>
              <input
                id="profile-phone"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => f && { ...f, phone: e.target.value })}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
              />
            </div>

            {profileError && <p className="text-sm text-red-400">{profileError}</p>}
            {profileSaved && <p className="text-sm text-green-400">Salvo!</p>}

            <button
              type="submit"
              disabled={saveProfile.isPending}
              className="mt-1 w-fit rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
            >
              {saveProfile.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Meus endereços</h2>
          {!isFormOpen && (
            <button
              onClick={openNewAddressForm}
              className="text-sm text-[var(--brand)] hover:underline"
            >
              + Adicionar endereço
            </button>
          )}
        </div>

        {isLoadingAddresses ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : addresses?.length === 0 && !isFormOpen ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhum endereço cadastrado ainda.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {addresses?.map((address) => (
              <li
                key={address.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {address.label ? `${address.label} — ` : ''}
                    {address.street}, {address.number}
                    {address.isDefault && (
                      <span className="ml-2 rounded-full bg-[var(--brand)]/15 px-2 py-0.5 text-xs text-[var(--brand)]">
                        Padrão
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {address.neighborhood}, {address.city} - {address.state}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  {!address.isDefault && (
                    <button
                      onClick={() => setDefaultAddress.mutate(address.id)}
                      disabled={setDefaultAddress.isPending}
                      className="text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-50"
                    >
                      Tornar padrão
                    </button>
                  )}
                  <button onClick={() => openEditAddressForm(address)} className="text-[var(--brand)] hover:underline">
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Remover este endereço?')) removeAddress.mutate(address.id);
                    }}
                    disabled={removeAddress.isPending}
                    className="text-red-400 hover:underline disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {isFormOpen && (
          <form onSubmit={handleAddressSubmit} className="mt-4 grid gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-2">
            <input
              placeholder="Nome do endereço (ex.: Casa)"
              value={addressForm.label}
              onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)] sm:col-span-2"
            />
            <input
              required
              placeholder="Rua"
              value={addressForm.street}
              onChange={(e) => setAddressForm((f) => ({ ...f, street: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
            />
            <input
              required
              placeholder="Número"
              value={addressForm.number}
              onChange={(e) => setAddressForm((f) => ({ ...f, number: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
            />
            <input
              placeholder="Complemento"
              value={addressForm.complement}
              onChange={(e) => setAddressForm((f) => ({ ...f, complement: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)] sm:col-span-2"
            />
            <input
              required
              placeholder="Bairro"
              value={addressForm.neighborhood}
              onChange={(e) => setAddressForm((f) => ({ ...f, neighborhood: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
            />
            <input
              required
              placeholder="Cidade"
              value={addressForm.city}
              onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
            />
            <input
              required
              placeholder="Estado (UF)"
              maxLength={2}
              value={addressForm.state}
              onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
            />
            <input
              required
              placeholder="CEP"
              value={addressForm.zipCode}
              onChange={(e) => setAddressForm((f) => ({ ...f, zipCode: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
            />

            {addressError && <p className="text-sm text-red-400 sm:col-span-2">{addressError}</p>}

            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={isSavingAddress}
                className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
              >
                {isSavingAddress ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar endereço'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingId(null);
                  setAddressForm(emptyAddressForm);
                  setAddressError(null);
                }}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
