import type { Chain, ChainId, Draft, DraftKey, Launch, Launchpad, Mirrors } from "@/lib/data";
import type { Scope, Sort } from "./launchpad-picker";

/** Everything the desktop and phone layouts render from; both share one state. */
export type ViewProps = {
  chain: ChainId;
  chainInfo: Chain;
  pad: Launchpad;
  padId: string;
  draft: Draft;
  errors: Partial<Record<DraftKey, string>>;
  issues: string[];
  mirrors: Mirrors;
  launches: Launch[];
  connected: boolean;
  address: string;
  scope: Scope;
  sort: Sort;
  onScopeChange: (s: Scope) => void;
  onSortChange: (s: Sort) => void;
  onSelectChain: (c: ChainId) => void;
  onSelectPad: (p: Launchpad) => void;
  onDraftChange: (patch: Partial<Draft>) => void;
  onMirrorsChange: (m: Mirrors) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onLaunch: () => void;
};
