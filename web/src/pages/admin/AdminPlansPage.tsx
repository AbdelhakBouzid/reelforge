import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

type Plan = {
  id: string;
  name: string;
  monthlyCredits: number;
  stripePriceId: string | null;
  isActive: boolean;
};

const formSchema = z.object({
  name: z.string().min(2),
  monthlyCredits: z.coerce.number().int().min(1),
  stripePriceId: z.string().optional(),
  isActive: z.boolean(),
});

type FormInput = z.infer<typeof formSchema>;

export function AdminPlansPage() {
  const [selected, setSelected] = useState<Plan | null>(null);
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-plans"],
    queryFn: () => apiRequest<{ items: Plan[] }>("/admin/plans", { auth: true }),
  });

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      monthlyCredits: 100,
      stripePriceId: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (selected) {
      form.reset({
        name: selected.name,
        monthlyCredits: selected.monthlyCredits,
        stripePriceId: selected.stripePriceId || "",
        isActive: selected.isActive,
      });
    }
  }, [form, selected]);

  const updateMutation = useMutation({
    mutationFn: (payload: FormInput) =>
      apiRequest(`/admin/plans/${selected?.id}`, {
        method: "PATCH",
        auth: true,
        body: {
          ...payload,
          stripePriceId: payload.stripePriceId?.trim() || null,
        },
      }),
    onSuccess: async () => {
      pushToast({ type: "success", title: "Plan updated" });
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to update plan.";
      pushToast({ type: "error", title: "Update failed", message });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin - Plans</h1>
      <div className="space-y-3">
        {query.data?.items.map((plan) => (
          <Card key={plan.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">{plan.monthlyCredits} credits / month</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={plan.isActive ? "success" : "danger"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
              <Button variant="ghost" onClick={() => setSelected(plan)}>
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={Boolean(selected)}
        title="Edit Plan"
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
          <Input
            label="Monthly Credits"
            type="number"
            {...form.register("monthlyCredits")}
            error={form.formState.errors.monthlyCredits?.message}
          />
          <Input
            label="Stripe Price ID"
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