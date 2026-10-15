import type { Chain, ChainId, Draft, DraftKey, Launch, Launchpad, Mirrors } from "@/lib/data";
import type { Balance } from "../wallet/use-balance";
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
  /** False while the wallet provider is still loading / restoring a session. */
  walletReady: boolean;
  connected: boolean;
  /** Signing address on the primary chain; null if the user has no wallet of that kind. */
  address: string | null;
  /** Native balance of `address` on the primary chain (live, via the chain's RPC). */
  balance: Balance;
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
  /** Opens the in-app trade window for a live launch. Absent in the demo build (no real wallets). */
  onTrade?: (launch: Launch) => void;
};
