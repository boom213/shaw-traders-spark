import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { manageReviews, moderateReview, replyToReview, type ManageReview } from "@/lib/reviews-admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage/reviews")({
  head: () => ({
    meta: [
      { title: "Customer reviews — Shaw Traders EV" },
      { name: "description", content: "Approve, hide and reply to customer reviews of your EV parts." },
      { property: "og:title", content: "Customer reviews — Shaw Traders EV" },
      { property: "og:description", content: "Approve, hide and reply to customer reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewsPage,
});

const TABS = [
  { id: "pending", label: "Waiting for you" },
  { id: "approved", label: "Published" },
  { id: "rejected", label: "Hidden" },
  { id: "all", label: "Everything" },
];

function ReviewsPage() {
  const [tab, setTab] = useState("pending");
  const list = useServerFn(manageReviews);
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["manage-reviews", tab],
    queryFn: () => list({ data: { status: tab } }),
  });

  const decide = useServerFn(moderateReview);
  const act = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" | "pending" }) => decide({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      void qc.invalidateQueries({ queryKey: ["manage-reviews"] });
    },
    onError: () => toast.error("Could not save that"),
  });

  return (
    <div className="grid gap-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium",
              tab === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-12 text-center text-sm text-muted-foreground">
          Nothing here right now.
        </p>
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((r) => (
            <ReviewCard key={r.id} review={r} onDecide={(status) => act.mutate({ id: r.id, status })} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, onDecide }: { review: ManageReview; onDecide: (s: "approved" | "rejected" | "pending") => void }) {
  const [reply, setReply] = useState(review.reply ?? "");
  const qc = useQueryClient();
  const send = useServerFn(replyToReview);
  const saving = useMutation({
    mutationFn: () => send({ data: { id: review.id, reply } }),
    onSuccess: () => {
      toast.success("Reply saved");
      void qc.invalidateQueries({ queryKey: ["manage-reviews"] });
    },
    onError: () => toast.error("Could not save the reply"),
  });

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-sm font-bold">{review.productName}</p>
          <p className="text-xs text-muted-foreground">
            {review.customer} · {new Date(review.createdAt).toLocaleDateString("en-IN")}
            {review.verified ? " · bought this part" : ""}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={cn("size-4", n <= review.rating ? "fill-primary text-primary" : "text-muted-foreground")} />
          ))}
        </div>
      </div>

      {review.title && <p className="mt-3 text-sm font-semibold">{review.title}</p>}
      {review.body && <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>}

      {review.photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.photos.map((src) => (
            <img key={src} src={src} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply to this customer (shown on the product page)"
          rows={2}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => saving.mutate()} disabled={saving.isPending}>
            Save reply
          </Button>
          {review.status !== "approved" && (
            <Button size="sm" onClick={() => onDecide("approved")}>Publish</Button>
          )}
          {review.status !== "rejected" && (
            <Button size="sm" variant="outline" onClick={() => onDecide("rejected")}>Hide</Button>
          )}
        </div>
      </div>
    </article>
  );
}
