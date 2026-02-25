import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import { useToast } from "../../contexts/ToastContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

type Pack = {
  id: string;
  name: string;
  credits: number;
  price: number;
  stripePriceId: string | null;
  isActive: boolean;
};

const formSchema = z.object({
  name: z.string().min(2),
  credits: z.coerce.number().int().min(1),
  price: z.coerce.number().int().min(1),
  stripePriceId: z.string().optional(),
  isActive: z.boolean(),
});

type FormInput = z.infer<typeof formSchema>;

export function AdminPacksPage() {
  const [selected, setSelected] = useState<Pack | null>(null);
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-packs"],
    queryFn: () => apiRequest<{ items: Pack[] }>("/admin/packs", { auth: true }),
  });

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      credits: 100,
      price: 1000,
      stripePriceId: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (selected) {
      form.reset({
        name: selected.name,
        credits: selected.credits,
        price: selected.price,
        stripePriceId: selected.stripePriceId || "",
        isActive: selected.isActive,
      });
    }
  }, [form, selected]);

  const updateMutation = useMutation({
    mutationFn: (payload: FormInput) =>
      apiRequest(`/admin/packs/${selected?.id}`, {
        method: "PATCH",
        auth: true,
        body: {
          ...payload,
          stripePriceId: payload.stripePriceId?.trim() || null,
        },
      }),
    onSuccess: async () => {
      pushToast({ type: "success", title: "Pack updated" });
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-packs"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to update pack.";
      pushToast({ type: "error", title: "Update failed", message });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin - Credit Packs</h1>
      <div className="space-y-3">
        {query.data?.items.map((pack) => (
          <Card key={pack.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{pack.name}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">
                {pack.credits} credits • {formatCurrency(pack.price)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={pack.isActive ? "success" : "danger"}>{pack.isActive ? "Active" : "Inactive"}</Badge>
              <Button variant="ghost" onClick={() => setSelected(pack)}>
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={Boolean(selected)}
        title="Edit Credit Pack"
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit((values) => updateMutation.mutate(values))}
              loading={updateMutation.isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={(event) => event.preventDefault()}>
          <Input label="Name" {...form.register("name")} error={form.formState.errors.name?.message} />
          <Input label="Credits" type="number" {...form.register("credits")} error={form.formState.errors.credits?.message} />
          <Input label="Price (cents)" type="number" {...form.register("price")} error={form.formState.errors.price?.message} />
          <Input
            label="PayPal Pack ID \(optional\)"
            {...form.register("stripePriceId")}
            error={form.formState.errors.stripePriceId?.message}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("isActive")} />
            Active
          </label>
        </form>
      </Modal>
    </div>
  );
}