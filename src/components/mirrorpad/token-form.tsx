"use client";

import { useId } from "react";
import { BASE_FIELDS, CHAIN, DRAFT_KEY, FIELD_META, type Draft, type DraftKey, type ExtraField, type Launchpad } from "@/lib/data";
import { ImageIcon } from "../icons";
import { Field, TextArea, TextInput } from "../ui";

const DECIMAL_INPUTS: ExtraField[] = ["supply", "decimals", "devBuy", "creatorFeeBps", "vestingMonths"];

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
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const extra = pad.fields.filter((f) => !BASE_FIELDS.includes(f)) as ExtraField[];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
        <Field label="Token name" required error={errors.name} htmlFor={id("name")}>
          <TextInput id={id("name")} value={draft.name} invalid={!!errors.name} maxLength={32} placeholder="Halcyon" onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field label="Symbol" required error={errors.symbol} htmlFor={id("symbol")}>
          <TextInput
            id={id("symbol")}
            prefixText="$"
            value={draft.symbol}
            invalid={!!errors.symbol}
            maxLength={10}
            placeholder="HALO"
            onChange={(e) => onChange({ symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
          />
        </Field>
      </div>

      <Field
        label="Description"
        error={errors.description}
        hint="Shown on the venue's token page and in wallet metadata."
        htmlFor={id("desc")}
        suffix={<span className="font-mono text-[11px] tabular-nums text-mute">{draft.description.length}/280</span>}
      >
        <TextArea
          id={id("desc")}
          value={draft.description}
          maxLength={280}
          invalid={!!errors.description}
          placeholder="What is this token for?"
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>

      <Field label="Token image" error={errors.imageUrl} hint="Square PNG or JPG, 512×512 or larger.">
        <div className="flex items-center gap-3">
          <div className="grid h-[50px] w-[50px] shrink-0 place-items-center overflow-hidden rounded-[15px] bg-[var(--field-bg)] text-mute shadow-[var(--field-in)]">
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
              <ImageIcon size={18} />
            )}
          </div>
          <TextInput value={draft.imageUrl} placeholder="https://…/logo.png" invalid={!!errors.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value })} />
        </div>
      </Field>

      {extra.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-line pt-5">
          <div className="flex items-center gap-2">
            <h4 className="text-[14px] font-semibold">{pad.name} parameters</h4>
            <span className="rounded-full bg-[var(--steel)] px-2 py-0.5 font-mono text-[11px] text-dim">
              {extra.length} field{extra.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {extra.map((f) => {
              const key = DRAFT_KEY[f];
              const meta = FIELD_META[f];
              return (
                <Field key={f} label={meta.label} hint={meta.hint} error={errors[key]} htmlFor={id(f)}>
                  <TextInput
                    id={id(f)}
                    value={draft[key]}
                    invalid={!!errors[key]}
                    placeholder={meta.placeholder}
                    prefixText={f === "devBuy" ? chain.nativeToken : undefined}
                    inputMode={DECIMAL_INPUTS.includes(f) ? "decimal" : undefined}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                  />
                </Field>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
