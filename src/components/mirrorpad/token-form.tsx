"use client";

import { BASE_FIELDS, CHAIN, DRAFT_KEY, FIELD_META, type Draft, type DraftKey, type ExtraField, type Launchpad } from "@/lib/data";
import { ImageIcon } from "../icons";
import { FloatField } from "../ui";

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
          {draft.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.visibility = "hidden";
              }}
            />
          ) : (
            <ImageIcon size={20} />
          )}
        </div>
        <FloatField label="Image URL" error={errors.imageUrl} hint="Square PNG or JPG, 512×512 or larger." className="flex-1">
          <input value={draft.imageUrl} placeholder="https://…/logo.png" onChange={(e) => onChange({ imageUrl: e.target.value })} />
        </FloatField>
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
