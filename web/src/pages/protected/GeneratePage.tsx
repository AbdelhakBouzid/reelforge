import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "../../lib/api";
import type { Generation } from "../../lib/types";
import { useToast } from "../../contexts/ToastContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";

const formSchema = z.object({
  prompt: z.string().min(3, "Prompt is required").max(500),
  style: z.string().max(100).optional(),
  ratio: z.string().max(20).optional(),
  duration: z.string().max(10).optional(),
});

type FormInput = z.infer<typeof formSchema>;

type GeneratePageProps = {
  type: "image" | "video";
};

function statusTone(status: Generation["status"]): "neutral" | "success" | "warn" | "danger" {
  if (status === "succeeded") return "success";
  if (status === "failed") return "danger";
  if (status === "processing") return "warn";
  return "neutral";
}

export function GeneratePage({ type }: GeneratePageProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { pushToast } = useToast();

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      style: "cinematic",
      ratio: "9:16",
      duration: "6",
    },
  });

  const generationQuery = useQuery({
    queryKey: ["generation", activeId],
    enabled: Boolean(activeId),
    queryFn: () => apiRequest<{ generation: Generation }>(`/generations/${activeId}`, { auth: true }),
    refetchInterval: (query) => {
      const status = query.state.data?.generation.status;
      return status === "queued" || status === "processing" ? 2000 : false;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: FormInput) =>
      apiRequest<{ generation: Generation }>(`/generations/${type}`, {
        method: "POST",
        auth: true,
        body: {
          prompt: payload.prompt,
          options: {
            style: payload.style,
            ratio: payload.ratio,
            duration: type === "video" ? payload.duration : undefined,
          },
        },
      }),
    onSuccess: ({ generation }) => {
      setActiveId(generation.id);
      pushToast({
        type: "success",
        title: `${type === "image" ? "Image" : "Video"} job created`,
        message: `Generation ${generation.id.slice(0, 8)} is running.`,
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Generation failed to start";
      pushToast({ type: "error", title: "Generation failed", message });
    },
  });

  const currentGeneration = useMemo(
    () => generationQuery.data?.generation,
    [generationQuery.data?.generation],
  );

  const onSubmit = form.handleSubmit((values) => {
    createMutation.mutate(values);
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card>
        <h1 className="text-2xl font-bold">Generate {type === "image" ? "Image" : "Video"}</h1>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
          {type === "image" ? "Costs 1 credit per output." : "Costs 5 credits per output."}
        </p>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <Textarea label="Prompt" rows={5} {...form.register("prompt")} error={form.formState.errors.prompt?.message} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Style" {...form.register("style")} error={form.formState.errors.style?.message} />
            <Input label="Aspect ratio" {...form.register("ratio")} error={form.formState.errors.ratio?.message} />
            {type === "video" ? (
              <Input label="Duration (seconds)" {...form.register("duration")} error={form.formState.errors.duration?.message} />
            ) : null}
          </div>
          <Button type="submit" className="w-full" loading={createMutation.isPending}>
            Generate {type}
          </Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Preview & Status</h2>

        {!currentGeneration ? (
          <p className="text-sm text-[rgb(var(--text-muted))]">Submit a prompt to start generation.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Badge>{currentGeneration.type}</Badge>
              <Badge tone={statusTone(currentGeneration.status)}>{currentGeneration.status}</Badge>
              <Badge>{currentGeneration.costCredits} credits</Badge>
            </div>

            <p className="text-sm">{currentGeneration.prompt}</p>

            {currentGeneration.status === "succeeded" && currentGeneration.assetUrl ? (
              type === "image" ? (
                <img
                  src={currentGeneration.assetUrl}
                  alt="Generated result"
                  className="h-72 w-full rounded-xl object-cover"
                />
              ) : (
                <video src={currentGeneration.assetUrl} controls className="h-72 w-full rounded-xl object-cover" />
              )
            ) : null}

            {currentGeneration.status === "failed" ? (
              <p className="text-sm text-rose-300">{currentGeneration.errorMessage || "Generation failed"}</p>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}