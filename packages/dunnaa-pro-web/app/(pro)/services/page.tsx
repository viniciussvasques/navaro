"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Scissors,
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Sparkles,
  ImageIcon,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ServicesGuide } from "@/components/ServicesGuide";
import { getServiceTemplates } from "@/lib/service-templates";

type Service = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
  deposit_required?: boolean;
  is_at_home?: boolean;
  image_url?: string | null;
};

type Bundle = {
  id: string;
  name: string;
  description?: string | null;
  original_price: number;
  bundle_price: number;
  discount_percent?: number | null;
  active: boolean;
  image_url?: string | null;
  services: Service[];
};

function useEstablishment() {
  const { data } = useQuery({
    queryKey: ["establishments-my"],
    queryFn: async () => {
      const res = await api.get("/establishments/my");
      const list = Array.isArray(res.data) ? res.data : [];
      const est = list[0];
      if (est?.id && typeof window !== "undefined") {
        document.cookie = `pro_establishment_id=${est.id};path=/;max-age=${60 * 60 * 24 * 365}`;
      }
      return est ?? null;
    },
  });
  return data;
}

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const establishment = useEstablishment();
  const establishmentId = establishment?.id ?? null;
  const [tab, setTab] = useState<"services" | "combos">("services");
  const [serviceModal, setServiceModal] = useState<"add" | "edit" | "from-template" | null>(null);
  const [comboModal, setComboModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCombo, setEditingCombo] = useState<Bundle | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [searchService, setSearchService] = useState("");
  const [searchCombo, setSearchCombo] = useState("");

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["services", establishmentId],
    queryFn: async () => {
      const res = await api.get(`/establishments/${establishmentId}/services?active_only=false`);
      return res.data as Service[];
    },
    enabled: !!establishmentId,
  });

  const { data: bundles = [], isLoading: loadingBundles } = useQuery({
    queryKey: ["bundles", establishmentId],
    queryFn: async () => {
      const res = await api.get(`/establishments/${establishmentId}/bundles?active_only=false`);
      return res.data as Bundle[];
    },
    enabled: !!establishmentId,
  });

  const createService = useMutation({
    mutationFn: async (body: { name: string; description?: string; price: number; duration_minutes: number; image_url?: string }) => {
      const res = await api.post(`/establishments/${establishmentId}/services`, body);
      return res.data;
    },
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["services", establishmentId] });
      setServiceModal(null);
      setEditingService(null);
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "Erro ao cadastrar serviço.")),
  });

  const updateService = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: { name?: string; description?: string; price?: number; duration_minutes?: number; active?: boolean; image_url?: string };
    }) => {
      const res = await api.patch(`/establishments/${establishmentId}/services/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["services", establishmentId] });
      setServiceModal(null);
      setEditingService(null);
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "Erro ao atualizar serviço.")),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/establishments/${establishmentId}/services/${id}`);
    },
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["services", establishmentId] });
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "Erro ao excluir serviço.")),
  });

  const createBundle = useMutation({
    mutationFn: async (body: { name: string; description?: string; bundle_price: number; service_ids: string[]; image_url?: string }) => {
      const res = await api.post(`/establishments/${establishmentId}/bundles`, body);
      return res.data;
    },
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["bundles", establishmentId] });
      setComboModal(false);
      setEditingCombo(null);
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "Erro ao criar combo.")),
  });

  const updateBundle = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { name?: string; description?: string; bundle_price?: number; service_ids?: string[]; image_url?: string } }) => {
      const res = await api.patch(`/establishments/${establishmentId}/bundles/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["bundles", establishmentId] });
      setComboModal(false);
      setEditingCombo(null);
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "Erro ao atualizar combo.")),
  });

  const deleteBundle = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/establishments/${establishmentId}/bundles/${id}`);
    },
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["bundles", establishmentId] });
      setEditingCombo(null);
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "Erro ao excluir combo.")),
  });

  const templates = establishment?.category ? getServiceTemplates(establishment.category as string) : [];
  const hasServices = services.length > 0;

  const filteredServices = services.filter(
    (s) => !searchService.trim() || s.name.toLowerCase().includes(searchService.trim().toLowerCase())
  );
  const filteredBundles = bundles.filter(
    (b) => !searchCombo.trim() || b.name.toLowerCase().includes(searchCombo.trim().toLowerCase())
  );

  if (!establishmentId) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 rounded-lg bg-[var(--color-surface)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <ServicesGuide forceOpen={showGuide} hasServices={hasServices} />

      {mutationError && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-[var(--color-error)]/50 bg-[var(--color-error)]/10 px-4 py-3 text-[var(--color-error)]">
          <span className="text-sm">{mutationError}</span>
          <button
            type="button"
            onClick={() => setMutationError(null)}
            className="shrink-0 rounded p-1 hover:bg-[var(--color-error)]/20"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Serviços e Combos</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
            <Sparkles className="h-4 w-4 mr-1" />
            Ver guia
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-[var(--color-surface)] rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab("services")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === "services" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Scissors className="h-4 w-4" />
          Serviços ({services.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("combos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === "combos" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Package className="h-4 w-4" />
          Combos ({bundles.length})
        </button>
      </div>

      {tab === "services" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <Input
                placeholder="Buscar serviço..."
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {templates.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setServiceModal("from-template")}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Adicionar do modelo
                </Button>
              )}
              <Button onClick={() => { setEditingService(null); setServiceModal("add"); }}>
                <Plus className="h-4 w-4 mr-1" />
                Novo serviço
              </Button>
            </div>
          </div>

          {loadingServices ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-[var(--color-surface)] animate-pulse" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Scissors className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
                <p className="text-[var(--color-text-muted)] mb-4">
                  Nenhum serviço cadastrado. Adicione serviços para seus clientes agendarem.
                </p>
                <Button onClick={() => setServiceModal("add")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar primeiro serviço
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredServices.filter((s) => s.active).map((s) => (
                  <Card key={s.id}>
                    {s.image_url && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-[var(--color-surface-elevated)]">
                        <img
                          src={s.image_url}
                          alt={s.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditingService(s); setServiceModal("edit"); }}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteService.mutate(s.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-error)]/20 text-[var(--color-error)]"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-[var(--color-primary)]">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.price)}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">{s.duration_minutes} min</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {filteredServices.filter((s) => !s.active).length > 0 && (
                <InactiveServicesSection
                  services={filteredServices.filter((s) => !s.active)}
                  onEdit={(s) => { setEditingService(s); setServiceModal("edit"); }}
                  onActivate={(s) => updateService.mutate({ id: s.id, body: { active: true } })}
                  onDelete={(s) => deleteService.mutate(s.id)}
                  isUpdating={updateService.isPending}
                />
              )}
            </>
          )}
        </>
      )}

      {tab === "combos" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <Input
                placeholder="Buscar combo..."
                value={searchCombo}
                onChange={(e) => setSearchCombo(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => { setEditingCombo(null); setComboModal(true); }}
              disabled={services.filter((s) => s.active).length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo combo
            </Button>
            {services.filter((s) => s.active).length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] mt-2">
                Cadastre serviços antes de criar combos.
              </p>
            )}
          </div>

          {loadingBundles ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-[var(--color-surface)] animate-pulse" />
              ))}
            </div>
          ) : filteredBundles.filter((b) => b.active).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
                <p className="text-[var(--color-text-muted)] mb-4">
                  Nenhum combo cadastrado. Combine serviços com preço especial.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredBundles.filter((b) => b.active).map((b) => (
                <Card key={b.id}>
                  {b.image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-[var(--color-surface-elevated)]">
                      <img
                        src={b.image_url}
                        alt={b.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{b.name}</CardTitle>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingCombo(b); setComboModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]"
                          title="Editar combo"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Excluir este combo? Esta ação não pode ser desfeita.")) {
                              deleteBundle.mutate(b.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-[var(--color-error)]/20 text-[var(--color-error)]"
                          title="Excluir combo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--color-text-muted)] mb-2">
                      {b.services.map((s) => s.name).join(" + ")}
                    </p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(b.bundle_price)}
                    </p>
                    {b.discount_percent != null && b.discount_percent > 0 && (
                      <p className="text-xs text-[var(--color-success)]">
                        {b.discount_percent.toFixed(0)}% de desconto
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal: Add/Edit Service */}
      {serviceModal && (serviceModal === "add" || serviceModal === "edit") && (
        <ServiceFormModal
          service={editingService}
          onClose={() => { setServiceModal(null); setEditingService(null); }}
          onSubmit={async (data) => {
            const body: Record<string, unknown> = { name: data.name, description: data.description, price: data.price, duration_minutes: data.duration_minutes };
            if (data.image_url !== undefined && !data.imageFile) body.image_url = data.image_url;
            if (editingService) {
              await updateService.mutateAsync({ id: editingService.id, body });
              if (data.imageFile) {
                const fd = new FormData();
                fd.append("file", data.imageFile);
                await api.post(`/establishments/${establishmentId}/services/${editingService.id}/image`, fd);
              }
            } else {
              const created = await createService.mutateAsync(body as { name: string; description?: string; price: number; duration_minutes: number; image_url?: string });
              if (data.imageFile && created?.id) {
                const fd = new FormData();
                fd.append("file", data.imageFile);
                await api.post(`/establishments/${establishmentId}/services/${created.id}/image`, fd);
              }
            }
            queryClient.invalidateQueries({ queryKey: ["services", establishmentId] });
            setServiceModal(null);
            setEditingService(null);
          }}
          isLoading={createService.isPending || updateService.isPending}
        />
      )}

      {/* Modal: From Template */}
      {serviceModal === "from-template" && (
        <TemplateModal
          templates={templates}
          onClose={() => setServiceModal(null)}
          onSelect={(t) => {
            createService.mutate({
              name: t.name,
              description: t.description,
              price: t.price,
              duration_minutes: t.duration_minutes,
            });
          }}
          isLoading={createService.isPending}
        />
      )}

      {/* Modal: Combo */}
      {comboModal && (
      <ComboFormModal
        services={services.filter((s) => s.active)}
        bundle={editingCombo}
        onClose={() => { setComboModal(false); setEditingCombo(null); }}
        onSubmit={async (data) => {
          const body: Record<string, unknown> = {
            name: data.name,
            description: data.description,
            bundle_price: data.bundle_price,
            service_ids: data.service_ids,
          };
          if (data.image_url !== undefined && !data.imageFile) body.image_url = data.image_url;
          if (editingCombo) {
            await updateBundle.mutateAsync({ id: editingCombo.id, body });
            if (data.imageFile) {
              const fd = new FormData();
              fd.append("file", data.imageFile);
              await api.post(`/establishments/${establishmentId}/bundles/${editingCombo.id}/image`, fd);
            }
          } else {
            const created = await createBundle.mutateAsync(body as { name: string; description?: string; bundle_price: number; service_ids: string[]; image_url?: string });
            if (data.imageFile && created?.id) {
              const fd = new FormData();
              fd.append("file", data.imageFile);
              await api.post(`/establishments/${establishmentId}/bundles/${created.id}/image`, fd);
            }
          }
          queryClient.invalidateQueries({ queryKey: ["bundles", establishmentId] });
          setComboModal(false);
          setEditingCombo(null);
        }}
        isLoading={createBundle.isPending || updateBundle.isPending}
      />
      )}
    </div>
  );
}

function InactiveServicesSection({
  services,
  onEdit,
  onActivate,
  onDelete,
  isUpdating,
}: {
  services: Service[];
  onEdit: (s: Service) => void;
  onActivate: (s: Service) => void;
  onDelete: (s: Service) => void;
  isUpdating: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <EyeOff className="h-4 w-4" />
        Serviços inativos ({services.length})
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)] p-4 grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-background)] p-3 opacity-90"
            >
              <div className="min-w-0">
                <p className="font-medium text-[var(--color-text-primary)] truncate">{s.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.price)} · {s.duration_minutes} min
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="sm" onClick={() => onActivate(s)} disabled={isUpdating}>
                  Ativar
                </Button>
                <button type="button" onClick={() => onEdit(s)} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)]" title="Editar">
                  <Pencil className="h-4 w-4 text-[var(--color-text-muted)]" />
                </button>
                <button type="button" onClick={() => onDelete(s)} className="p-1.5 rounded-lg hover:bg-[var(--color-error)]/20" title="Excluir">
                  <Trash2 className="h-4 w-4 text-[var(--color-error)]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceFormModal({
  service,
  onClose,
  onSubmit,
  isLoading,
}: {
  service: Service | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; price: number; duration_minutes: number; image_url?: string | null; imageFile?: File; clearImage?: boolean }) => void | Promise<void>;
  isLoading: boolean;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [price, setPrice] = useState(service?.price?.toString() ?? "");
  const [duration, setDuration] = useState(service?.duration_minutes?.toString() ?? "30");
  const [imageUrl, setImageUrl] = useState(service?.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const hadImage = (service?.image_url && !clearImage) || imageFile || imageUrl;
  const removeImage = () => {
    setImageFile(null);
    setImageUrl("");
    setClearImage(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price.replace(",", "."));
    const d = parseInt(duration, 10);
    if (!name.trim() || isNaN(p) || p <= 0 || isNaN(d) || d < 5) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      price: p,
      duration_minutes: d,
      image_url: clearImage ? null : (imageUrl.trim() || undefined),
      imageFile: imageFile ?? undefined,
      clearImage: clearImage && !!service?.image_url,
    });
  };

  const [blobPreviewUrl, setBlobPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setBlobPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setBlobPreviewUrl(null);
  }, [imageFile]);
  const previewUrl = blobPreviewUrl || imageUrl || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{service ? "Editar serviço" : "Novo serviço"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-elevated)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Corte masculino" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Imagem</label>
            <div className="space-y-2">
              {previewUrl && (
                <div className="aspect-video rounded-lg overflow-hidden bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setImageFile(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1"
                >
                  <ImageIcon className="h-4 w-4" />
                  {imageFile ? "Trocar arquivo" : "Enviar arquivo"}
                </Button>
                <Input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="ou cole URL da imagem"
                  className="flex-1"
                />
              </div>
              {hadImage && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  Remover imagem
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Preço (R$) *</label>
              <Input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, ""))}
                placeholder="45,00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duração (min) *</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min={5}
                max={480}
                required
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : service ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplateModal({
  templates,
  onClose,
  onSelect,
  isLoading,
}: {
  templates: { name: string; description?: string; price: number; duration_minutes: number }[];
  onClose: () => void;
  onSelect: (t: { name: string; description?: string; price: number; duration_minutes: number }) => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
          <h2 className="text-lg font-semibold">Adicionar do modelo</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-elevated)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Clique para adicionar ao seu catálogo. Você pode editar preço e duração depois.
          </p>
          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => onSelect(t)}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] text-left"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-[var(--color-primary)]">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(t.price)} • {t.duration_minutes} min
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComboFormModal({
  services,
  bundle,
  onClose,
  onSubmit,
  isLoading,
}: {
  services: Service[];
  bundle: Bundle | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; bundle_price: number; service_ids: string[]; image_url?: string | null; imageFile?: File }) => void | Promise<void>;
  isLoading: boolean;
}) {
  const [name, setName] = useState(bundle?.name ?? "");
  const [description, setDescription] = useState(bundle?.description ?? "");
  const [bundlePrice, setBundlePrice] = useState(bundle?.bundle_price?.toString() ?? "");
  const [imageUrl, setImageUrl] = useState(bundle?.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(bundle?.services?.map((s) => s.id) ?? [])
  );

  const [blobPreviewUrl, setBlobPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setBlobPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setBlobPreviewUrl(null);
  }, [imageFile]);
  const previewUrl = blobPreviewUrl || imageUrl || null;

  const selectedServices = services.filter((s) => selectedIds.has(s.id));
  const originalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(bundlePrice.replace(",", "."));
    if (!name.trim() || isNaN(p) || p <= 0 || selectedIds.size === 0) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      bundle_price: p,
      service_ids: Array.from(selectedIds),
      image_url: imageUrl.trim() || undefined,
      imageFile: imageFile ?? undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
          <h2 className="text-lg font-semibold">{bundle ? "Editar combo" : "Novo combo"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-elevated)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do combo *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Corte + Barba" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Imagem</label>
              <div className="space-y-2">
                {previewUrl && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setImageFile(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {imageFile ? "Trocar arquivo" : "Enviar arquivo"}
                  </Button>
                  <Input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="ou cole URL da imagem"
                    className="flex-1"
                  />
                </div>
                {(imageFile || imageUrl) && (
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImageUrl(""); }}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    Remover imagem
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Serviços incluídos *</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="rounded"
                    />
                    <span>{s.name}</span>
                    <span className="text-[var(--color-text-muted)] text-sm">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.price)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {selectedServices.length > 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Valor total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(originalPrice)}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Preço do combo (R$) *</label>
              <Input
                type="text"
                value={bundlePrice}
                onChange={(e) => setBundlePrice(e.target.value.replace(/[^\d,.]/g, ""))}
                placeholder="Ex: 80,00"
                required
              />
            </div>
          </div>
          <div className="p-4 border-t border-[var(--color-border)] flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || selectedIds.size === 0} className="flex-1">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : bundle ? "Salvar" : "Criar combo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
