"use client";

import { useState, type ChangeEvent } from "react";
import { api } from "@/lib/api";
import { BASE_FIELDS, CHAIN, DRAFT_KEY, FIELD_META, type Draft, type DraftKey, type ExtraField, type Launchpad } from "@/lib/data";
import { cn } from "@/lib/format";
import { localPreview, previewSrc, rememberPreview } from "@/lib/preview";
import { ImageIcon } from "../icons";
import { useToast } from "../toast";
import { FloatField, Spinner } from "../ui";
import { useWallet } from "../wallet/context";

const DECIMAL_INPUTS: ExtraField[] = ["supply", "decimals", "devBuy", "creatorFeeBps", "vestingMonths"];

/** The shared metadata, then the fields only the picked venue asks for. Labels float inside each well. */
export function TokenForm({
  pad,
  draft,
  errors,
  onChange,
}: {
  pad: Launchpad;
  draft: Draft;
  errors: Partial<Record<DraftKey, string>>;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const chain = CHAIN[pad.chain];
  const extra = pad.fields.filter((f) => !BASE_FIELDS.includes(f)) as ExtraField[];
  const { signer } = useWallet();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  // The picked file, shown instantly while it uploads.
  const [pending, setPending] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const src = pending ?? (draft.imageUrl ? previewSrc(draft.imageUrl) : "");

  /** Pins the picked file to IPFS and uses its gateway URL as the token image. */
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !signer) return;
    const blob = localPreview(file);
    setPending(blob);
    setBroken(false);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const pinned = await api<{ url: string }>("/api/upload", { form, token: await signer.getAccessToken() });
      rememberPreview(pinned.url, blob);
      onChange({ imageUrl: pinned.url });
    } catch (err) {
      toast({ tone: "error", title: "Image upload failed", description: err instanceof Error ? err.message : undefined });
    } finally {
      setPending(null);
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
        <FloatField label="Token name" required error={errors.name} corner={`${draft.name.length}/32`}>
          <input value={draft.name} maxLength={32} placeholder="Halcyon" onChange={(e) => onChange({ name: e.target.value })} />
        </FloatField>
        <FloatField label="Symbol" required error={errors.symbol} prefix="$">
          <input
            value={draft.symbol}
            maxLength={10}
            placeholder="HALO"
            className="font-mono uppercase"
            onChange={(e) => onChange({ symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
          />
        </FloatField>
      </div>

      <FloatField label="Description" error={errors.description} hint="Shown on the venue's token page and in wallet metadata." corner={`${draft.description.length}/280`}>
        <textarea value={draft.description} maxLength={280} placeholder="What is this token for?" onChange={(e) => onChange({ description: e.target.value })} />
      </FloatField>

      <div className="flex items-start gap-3">
        <div className="grid h-[62px] w-[62px] shrink-0 place-items-center overflow-hidden rounded-[18px] bg-[var(--field-bg)] text-mute shadow-[var(--field-in)]">
          {src && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className={cn("h-full w-full object-cover", uploading && "opacity-60")} onError={() => setBroken(true)} />
          ) : (
            <ImageIcon size={20} />
          )}
        </div>
        <FloatField
          label="Image URL"
          error={errors.imageUrl}
          hint={signer ? "Square PNG, JPG, GIF or WebP, 512×512 or larger, up to 5 MB. Upload pins it to IPFS." : "Square PNG or JPG, 512×512 or larger."}
          className="flex-1"
        >
          <input
            value={draft.imageUrl}
            placeholder="https://…/logo.png"
            onChange={(e) => {
              setBroken(false);
              onChange({ imageUrl: e.target.value });
            }}
          />
        </FloatField>
        {signer && (
          <label className={cn("pill mt-3 shrink-0 cursor-pointer !h-9 text-[12.5px]", uploading && "pointer-events-none opacity-60")}>
            {uploading ? <Spinner size={12} /> : <ImageIcon size={14} />}
            {uploading ? "Pinning…" : "Upload"}
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={upload} />
          </label>
        )}
      </div>

      {extra.length > 0 && (
        <div className="mt-2 flex flex-col gap-4 border-t border-dashed border-line2 pt-6">
          <div className="flex items-center justify-between gap-2">
            <p className="label !text-fg">{pad.name} parameters</p>
            <span className="pill !h-6 font-mono !text-[11px]">
              {extra.length} field{extra.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {extra.map((f) => {
              const key = DRAFT_KEY[f];
              const meta = FIELD_META[f];
              return (
                <FloatField key={f} label={meta.label} hint={meta.hint} error={errors[key]} prefix={f === "devBuy" ? chain.nativeToken : undefined}>
                  <input
                    value={draft[key]}
                    placeholder={meta.placeholder}
                    inputMode={DECIMAL_INPUTS.includes(f) ? "decimal" : undefined}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                  />
                </FloatField>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
