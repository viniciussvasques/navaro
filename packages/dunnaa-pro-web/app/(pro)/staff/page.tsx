"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEstablishmentId, useEstablishmentLoading } from "@/contexts/EstablishmentContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProPageHeader } from "@/components/ProPageHeader";
import { ProPageShell } from "@/components/ProPageShell";
import { api } from "@/lib/api";
import {
  Users,
  Phone,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  UserPlus,
  Check,
  AlertCircle,
} from "lucide-react";

type Staff = {
  id: string;
  name: string;
  phone?: string | null;
  role: string;
  bio?: string | null;
  commission_rate?: number | null;
  active: boolean;
  work_schedule?: Record<string, { open: string; close: string }>;
};

type StaffForm = {
  name: string;
  phone: string;
  role: string;
  bio: string;
  commission_rate: number;
};

const emptyForm: StaffForm = {
  name: "",
  phone: "",
  role: "barbeiro",
  bio: "",
  commission_rate: 50,
};

export default function StaffPage() {
  const queryClient = useQueryClient();
  const establishmentId = useEstablishmentId();
  const establishmentLoading = useEstablishmentLoading();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["staff", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];
      const res = await api.get(`/establishments/${establishmentId}/staff?active_only=false`);
      return (Array.isArray(res.data) ? res.data : []) as Staff[];
    },
    enabled: !!establishmentId && !establishmentLoading,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: StaffForm) => {
      await api.post(`/establishments/${establishmentId}/staff`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<StaffForm> }) => {
      await api.patch(`/establishments/${establishmentId}/staff/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/establishments/${establishmentId}/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setDeleteConfirm(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await api.patch(`/establishments/${establishmentId}/staff/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (s: Staff) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      phone: s.phone || "",
      role: s.role,
      bio: s.bio || "",
      commission_rate: s.commission_rate || 50,
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const staff = data ?? [];
  const active = staff.filter((s) => s.active);
  const inactive = staff.filter((s) => !s.active);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <ProPageShell maxWidth="lg">
      <ProPageHeader
        title="Equipe"
        description="Gerencie os profissionais do seu estabelecimento."
        icon={Users}
        actions={
          !showForm ? (
            <Button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-[var(--color-primary)] text-white hover:opacity-90"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          ) : undefined
        }
      />

      {/* Error */}
      {(createMutation.isError || updateMutation.isError) && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          Erro ao salvar. Verifique os dados e tente novamente.
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-[var(--color-primary)]/30 bg-[var(--color-surface)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                {editingId ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {editingId ? "Editar Profissional" : "Novo Profissional"}
              </span>
              <button onClick={resetForm} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Nome *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do profissional"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Telefone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Funcao</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text-primary)]"
                >
                  <option value="barbeiro">Barbeiro</option>
                  <option value="cabeleireiro">Cabeleireiro(a)</option>
                  <option value="manicure">Manicure</option>
                  <option value="esteticista">Esteticista</option>
                  <option value="massagista">Massagista</option>
                  <option value="depilador">Depilador(a)</option>
                  <option value="maquiador">Maquiador(a)</option>
                  <option value="recepcionista">Recepcionista</option>
                  <option value="gerente">Gerente</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Comissao (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.commission_rate}
                  onChange={(e) => setForm({ ...form, commission_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Bio / Especialidades</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={2}
                placeholder="Ex: Especialista em cortes modernos e barba"
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm} className="border-[var(--color-border)]">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.name.trim() || isSaving}
                className="bg-[var(--color-primary)] text-white hover:opacity-90"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingId ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
          ))}
        </div>
      ) : staff.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Users className="h-10 w-10 mx-auto text-[var(--color-text-muted)] opacity-50" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Nenhum profissional cadastrado ainda.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              className="border-[var(--color-border)]"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar primeiro profissional
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Staff */}
          {active.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Ativos ({active.length})
              </h3>
              <div className="space-y-2">
                {active.map((s) => (
                  <StaffRow
                    key={s.id}
                    staff={s}
                    onEdit={() => startEdit(s)}
                    onToggleActive={() => toggleActiveMutation.mutate({ id: s.id, active: false })}
                    onDelete={() => setDeleteConfirm(s.id)}
                    deleteConfirm={deleteConfirm === s.id}
                    onDeleteConfirm={() => deleteMutation.mutate(s.id)}
                    onDeleteCancel={() => setDeleteConfirm(null)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Staff */}
          {inactive.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                Inativos ({inactive.length})
              </h3>
              <div className="space-y-2">
                {inactive.map((s) => (
                  <StaffRow
                    key={s.id}
                    staff={s}
                    onEdit={() => startEdit(s)}
                    onToggleActive={() => toggleActiveMutation.mutate({ id: s.id, active: true })}
                    onDelete={() => setDeleteConfirm(s.id)}
                    deleteConfirm={deleteConfirm === s.id}
                    onDeleteConfirm={() => deleteMutation.mutate(s.id)}
                    onDeleteCancel={() => setDeleteConfirm(null)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ProPageShell>
  );
}

function StaffRow({
  staff,
  onEdit,
  onToggleActive,
  onDelete,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  isDeleting,
}: {
  staff: Staff;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  deleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 group hover:border-[var(--color-primary)]/30 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
          staff.active
            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            : "bg-gray-200 text-gray-500"
        }`}>
          {staff.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${
            staff.active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
          }`}>
            {staff.name}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="capitalize flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {staff.role}
            </span>
            {typeof staff.commission_rate === "number" && (
              <span>• {staff.commission_rate}% comissao</span>
            )}
            {staff.phone && (
              <span className="hidden md:inline flex items-center gap-1">
                • <Phone className="h-3 w-3" /> {staff.phone}
              </span>
            )}
          </div>
          {staff.bio && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-1">{staff.bio}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {deleteConfirm ? (
          <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-2 py-1">
            <span className="text-xs text-red-600">Remover?</span>
            <button
              onClick={onDeleteConfirm}
              disabled={isDeleting}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onDeleteCancel} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-lg transition-colors"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onToggleActive}
              className="p-1.5 text-[var(--color-text-muted)] hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title={staff.active ? "Desativar" : "Reativar"}
            >
              {staff.active ? <Trash2 className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            </button>
            {!staff.active && (
              <button
                onClick={onDelete}
                className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remover permanentemente"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
