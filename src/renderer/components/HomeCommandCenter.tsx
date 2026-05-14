import { ArrowRight, CreditCard, Home, ListChecks, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AgentTrace, ConnectorDescriptor, ToolDescriptor } from "../../shared/agentRuntime";
import { buildWorkTwinReplay, type ProofModeReport, type WorkGraphItem } from "../../shared/workGraph";

export type HomeWorkspaceView = "home" | "browser" | "coding" | "productivity" | "chatting" | "design" | "settings";

export type HomeAttentionLane = {
  id: "needs-approval" | "ai-working" | "user-must-handle";
  title: string;
  detail: string;
  empty: string;
  items: WorkGraphItem[];
};

export type HomeActivityItem = {
  id: string;
  title: string;
  detail: string;
  workspace: HomeWorkspaceView;
  actionLabel: string;
  icon: LucideIcon;
};

export type HomeSourceHealthItem = {
  id: string;
  label: string;
  detail: string;
  status: string;
  workspace: HomeWorkspaceView;
  actionLabel: string;
  icon: LucideIcon;
  state: "ready" | "needs-action" | "working";
};

export type HomePaymentItem = {
  id: string;
  title: string;
  detail: string;
  status: "completed" | "verified" | "scheduled" | "needs-review";
  actionLabel: string;
  action: "verify_receipt" | "open_finances" | "open_automation";
  receiptId?: string;
  automationRunId?: string;
  automationRecipeId?: string;
  amountLabel?: string;
  createdAt: number;
};

type HomeCommandHeroProps = {
  workTwinTotal: number;
  aiWorkingCount: number;
  reviewCount: number;
  rulesSuggestedCount: number;
};

export function HomeCommandHero({
  workTwinTotal,
  aiWorkingCount,
  reviewCount,
  rulesSuggestedCount
}: HomeCommandHeroProps): JSX.Element {
  return (
    <section className="home-command-hero">
      <div>
        <p className="panel-kicker">Autopilot Home</p>
        <h1 id="home-heading">What needs attention?</h1>
        <p>
          Home pulls together inbox work, calendar commitments, finance notices, team chat, coding reviews, design artifacts, and automations so the next move is obvious.
        </p>
      </div>
      <div className="home-command-metrics" aria-label="Workspace snapshot">
        <span>
          <strong>{workTwinTotal}</strong>
          <small>Work Twin items</small>
        </span>
        <span>
          <strong>{aiWorkingCount}</strong>
          <small>AI working</small>
        </span>
        <span>
          <strong>{reviewCount}</strong>
          <small>Review</small>
        </span>
        <span>
          <strong>{rulesSuggestedCount}</strong>
          <small>Rules</small>
        </span>
      </div>
    </section>
  );
}

type HomeCommandStripProps = {
  primaryReviewItem: WorkGraphItem | undefined;
  workGraphBusyIds: Record<string, boolean | undefined>;
  sourceHealth: HomeSourceHealthItem[];
  onRefreshWorkGraph: () => void;
  onOpenWorkspace: (workspace: HomeWorkspaceView) => void;
  onSelectWorkGraphItem: (itemId: string) => void;
  onStartSafeWork: (item: WorkGraphItem) => void;
};

export function HomeCommandStrip({
  primaryReviewItem,
  workGraphBusyIds,
  sourceHealth,
  onRefreshWorkGraph,
  onOpenWorkspace,
  onSelectWorkGraphItem,
  onStartSafeWork
}: HomeCommandStripProps): JSX.Element {
  const primaryBusy = Boolean(primaryReviewItem && workGraphBusyIds[primaryReviewItem.id]);

  return (
    <section className="home-command-strip" aria-label="Home command controls">
      <article className="home-command-card home-quick-actions">
        <header>
          <span>
            <Home size={18} aria-hidden="true" />
            Command Center
          </span>
          <button type="button" onClick={onRefreshWorkGraph}>Refresh Work Twin</button>
        </header>
        <div>
          <strong>{primaryReviewItem ? primaryReviewItem.title : "Nothing needs a review yet"}</strong>
          <p>
            {primaryReviewItem
              ? `${primaryReviewItem.source.label} - ${primaryReviewItem.run.state.replace(/_/gu, " ")}`
              : "Sync sources or start safe work from a workspace to populate Home."}
          </p>
        </div>
        <div className="home-quick-action-row">
          <button
            className="primary-action"
            type="button"
            disabled={!primaryReviewItem}
            title={primaryReviewItem ? "Open the selected Work Twin proof panel" : "No Work Twin item is ready to review."}
            onClick={() => {
              if (primaryReviewItem) {
                onSelectWorkGraphItem(primaryReviewItem.id);
              }
            }}
          >
            Review Work
          </button>
          <button
            type="button"
            disabled={!primaryReviewItem?.shadow.eligible || primaryBusy}
            title={primaryReviewItem?.shadow.eligible ? "Start safe Shadow Mode work" : primaryReviewItem?.shadow.why ?? "No safe work is available."}
            onClick={() => {
              if (primaryReviewItem) {
                onStartSafeWork(primaryReviewItem);
              }
            }}
          >
            <Sparkles size={14} className={primaryBusy ? "spin" : ""} aria-hidden="true" />
            Start safe work
          </button>
          <button type="button" onClick={() => onOpenWorkspace("productivity")}>Open Productivity</button>
          <button type="button" onClick={() => onOpenWorkspace("design")}>Open Design</button>
        </div>
      </article>

      <article className="home-command-card home-source-health-card">
        <header>
          <span>
            <ShieldCheck size={18} aria-hidden="true" />
            Source Health
          </span>
          <button type="button" onClick={() => onOpenWorkspace("settings")}>Settings</button>
        </header>
        <div className="home-source-health-grid">
          {sourceHealth.map((source) => {
            const SourceIcon = source.icon;
            return (
              <button
                className="home-source-health-item"
                data-state={source.state}
                type="button"
                key={source.id}
                onClick={() => onOpenWorkspace(source.workspace)}
              >
                <SourceIcon size={16} aria-hidden="true" />
                <span>
                  <strong>{source.label}</strong>
                  <small>{source.detail}</small>
                </span>
                <em>{source.status}</em>
              </button>
            );
          })}
        </div>
      </article>
    </section>
  );
}

type HomeAttentionBoardProps = {
  lanes: HomeAttentionLane[];
  selectedWorkGraphItemId: string | undefined;
  onSelectWorkGraphItem: (itemId: string) => void;
};

export function HomeAttentionBoard({ lanes, selectedWorkGraphItemId, onSelectWorkGraphItem }: HomeAttentionBoardProps): JSX.Element {
  return (
    <section className="home-attention-board" aria-label="Work Twin attention lanes">
      {lanes.map((lane) => (
        <article className="home-attention-lane" data-lane={lane.id} key={lane.id}>
          <header>
            <span>
              <strong>{lane.title}</strong>
              <small>{lane.detail}</small>
            </span>
            <b>{lane.items.length}</b>
          </header>
          <div className="home-attention-list">
            {lane.items.length === 0 ? (
              <p>{lane.empty}</p>
            ) : (
              lane.items.map((item) => (
                <button
                  className={`home-attention-row ${selectedWorkGraphItemId === item.id ? "active" : ""}`}
                  type="button"
                  key={`${lane.id}:${item.id}`}
                  onClick={() => onSelectWorkGraphItem(item.id)}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.source.label}{" -> "}{item.route.workspace}</small>
                  </span>
                  <em data-state={item.run.state}>{item.run.state.replace(/_/gu, " ")}</em>
                </button>
              ))
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

type HomeOverviewCardsProps = {
  todaysCallOpenCount: number;
  todaysCallHeadline: string;
  todaysCallSubheadline: string;
  latestActivity: HomeActivityItem[];
  paymentItems: HomePaymentItem[];
  paymentReceiptStatusById: Record<string, string | undefined>;
  onOpenWorkspace: (workspace: HomeWorkspaceView) => void;
  onRefreshPayments: () => void;
  onVerifyReceipt: (receiptId: string) => void;
  onOpenAutomationPayment: (item: HomePaymentItem) => void;
};

export function HomeOverviewCards({
  todaysCallOpenCount,
  todaysCallHeadline,
  todaysCallSubheadline,
  latestActivity,
  paymentItems,
  paymentReceiptStatusById,
  onOpenWorkspace,
  onRefreshPayments,
  onVerifyReceipt,
  onOpenAutomationPayment
}: HomeOverviewCardsProps): JSX.Element {
  return (
    <>
      <article className="home-command-card primary">
        <div>
          <p className="panel-kicker">Today's Call</p>
          <h2>{todaysCallOpenCount > 0 ? todaysCallHeadline : "Sync sources to build the call."}</h2>
          <p>{todaysCallOpenCount > 0 ? todaysCallSubheadline : "Connect Gmail, Calendar, or Chatting so Autopilot can find real work."}</p>
        </div>
        <button className="primary-action" type="button" onClick={() => onOpenWorkspace("productivity")}>
          Open Productivity
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </article>

      <article className="home-command-card home-latest-activity-card">
        <header>
          <span>
            <ListChecks size={18} aria-hidden="true" />
            Latest Activity
          </span>
          <button type="button" onClick={() => onOpenWorkspace("productivity")}>Open work</button>
        </header>
        {latestActivity.length === 0 ? (
          <p>No recent activity yet. Connect sources or create an artifact to make Home useful.</p>
        ) : (
          <ul className="home-latest-activity-list">
            {latestActivity.map((activity) => {
              const ActivityIcon = activity.icon;
              return (
                <li key={activity.id}>
                  <ActivityIcon size={16} aria-hidden="true" />
                  <span>
                    <strong>{activity.title}</strong>
                    <small>{activity.detail}</small>
                  </span>
                  <button type="button" onClick={() => onOpenWorkspace(activity.workspace)}>{activity.actionLabel}</button>
                </li>
              );
            })}
          </ul>
        )}
      </article>

      <article className="home-command-card home-payment-card">
        <header>
          <span>
            <CreditCard size={18} aria-hidden="true" />
            Payments
          </span>
          <button type="button" onClick={onRefreshPayments}>Refresh payments</button>
        </header>
        {paymentItems.length === 0 ? (
          <p>No finished payments or recurring payment proposals yet. Finance-safe runs will appear here after execution or automation review.</p>
        ) : (
          <ul className="home-payment-list">
            {paymentItems.map((item) => (
              <li key={item.id} data-state={item.status}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                  {item.receiptId && paymentReceiptStatusById[item.receiptId] ? <em>{paymentReceiptStatusById[item.receiptId]}</em> : null}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (item.action === "verify_receipt" && item.receiptId) {
                      onVerifyReceipt(item.receiptId);
                      return;
                    }
                    if (item.action === "open_automation") {
                      onOpenAutomationPayment(item);
                      return;
                    }
                    onOpenWorkspace("productivity");
                  }}
                >
                  {item.actionLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </>
  );
}

type HomeWorkTwinCardProps = {
  workGraphItems: WorkGraphItem[];
  selectedWorkGraphItem: WorkGraphItem | null | undefined;
  workGraphBusyIds: Record<string, boolean | undefined>;
  workTwinProof: ProofModeReport | null;
  workGraphStatus: string;
  shadowModeRunCount: number;
  shadowModeRuleCount: number;
  agentRuntimeBusy: boolean;
  onRefreshWorkGraph: () => void;
  onSelectWorkGraphItem: (itemId: string) => void;
  onStartSafeWork: (item: WorkGraphItem) => void;
  onPreviewAgentRuntimePlan: (item: WorkGraphItem) => void;
  onOpenOriginal: (item: WorkGraphItem) => void;
  onApprove: (item: WorkGraphItem) => void;
  onReject: (item: WorkGraphItem) => void;
  onRevise: (item: WorkGraphItem) => void;
  onMakeRule: (item: WorkGraphItem) => void;
  onOpenProductivity: () => void;
};

export function HomeWorkTwinCard({
  workGraphItems,
  selectedWorkGraphItem,
  workGraphBusyIds,
  workTwinProof,
  workGraphStatus,
  shadowModeRunCount,
  shadowModeRuleCount,
  agentRuntimeBusy,
  onRefreshWorkGraph,
  onSelectWorkGraphItem,
  onStartSafeWork,
  onPreviewAgentRuntimePlan,
  onOpenOriginal,
  onApprove,
  onReject,
  onRevise,
  onMakeRule,
  onOpenProductivity
}: HomeWorkTwinCardProps): JSX.Element {
  return (
    <article className="home-command-card work-graph-card">
      <header>
        <span>
          <Sparkles size={18} aria-hidden="true" />
          Work Twin + Shadow Mode
        </span>
        <button type="button" onClick={onRefreshWorkGraph}>Refresh</button>
      </header>
      <div className="work-graph-layout">
        <div className="work-graph-list" aria-label="Reviewable Work Twin items">
          {workGraphItems.length === 0 ? (
            <button className="work-graph-row empty" type="button" onClick={onOpenProductivity}>
              <strong>No Work Twin items yet.</strong>
              <small>Sync Gmail, Calendar, Browser, Design, Coding, or Automation to build a source trail.</small>
            </button>
          ) : (
            workGraphItems.slice(0, 6).map((item) => (
              <button
                className={`work-graph-row ${selectedWorkGraphItem?.id === item.id ? "active" : ""}`}
                type="button"
                key={item.id}
                onClick={() => onSelectWorkGraphItem(item.id)}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.source.label}</small>
                </span>
                <em data-state={item.run.state}>{item.run.state.replace(/_/gu, " ")}</em>
              </button>
            ))
          )}
        </div>
        <div className="work-graph-detail" aria-live="polite">
          {selectedWorkGraphItem ? (
            <>
              <p className="panel-kicker">
                {selectedWorkGraphItem.source.kind} to {selectedWorkGraphItem.route.workspace}
              </p>
              <h3>{selectedWorkGraphItem.title}</h3>
              <p>{selectedWorkGraphItem.summary}</p>
              <dl>
                <div>
                  <dt>Route</dt>
                  <dd>{selectedWorkGraphItem.route.confidence}% - {selectedWorkGraphItem.route.reason}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{selectedWorkGraphItem.run.plan}</dd>
                </div>
                <div>
                  <dt>Output</dt>
                  <dd>{selectedWorkGraphItem.output.title}: {selectedWorkGraphItem.output.summary}</dd>
                </div>
                <div>
                  <dt>Quality</dt>
                  <dd>
                    {selectedWorkGraphItem.quality
                      ? `${selectedWorkGraphItem.quality.score}/100 - ${selectedWorkGraphItem.quality.summary}`
                      : "No output quality report yet."}
                  </dd>
                </div>
                <div>
                  <dt>Shadow Mode</dt>
                  <dd>{selectedWorkGraphItem.shadow.why}</dd>
                </div>
              </dl>
              <div className="work-graph-actions">
                <button
                  className="primary-action"
                  type="button"
                  disabled={!selectedWorkGraphItem.shadow.eligible || Boolean(workGraphBusyIds[selectedWorkGraphItem.id])}
                  title={selectedWorkGraphItem.shadow.eligible ? "Start safe work" : selectedWorkGraphItem.shadow.why}
                  onClick={() => onStartSafeWork(selectedWorkGraphItem)}
                >
                  <Sparkles size={14} className={workGraphBusyIds[selectedWorkGraphItem.id] ? "spin" : ""} aria-hidden="true" />
                  Start safe work
                </button>
                <button type="button" disabled={agentRuntimeBusy} onClick={() => onPreviewAgentRuntimePlan(selectedWorkGraphItem)}>
                  <ShieldCheck size={14} className={agentRuntimeBusy ? "spin" : ""} aria-hidden="true" />
                  Plan with runtime
                </button>
                <button type="button" onClick={() => onOpenOriginal(selectedWorkGraphItem)}>Open Original</button>
                <button type="button" disabled={selectedWorkGraphItem.approval.state !== "needs_approval"} onClick={() => onApprove(selectedWorkGraphItem)}>
                  Approve
                </button>
                <button type="button" onClick={() => onReject(selectedWorkGraphItem)}>Reject</button>
                <button type="button" onClick={() => onRevise(selectedWorkGraphItem)}>Revise</button>
                <button
                  type="button"
                  disabled={!selectedWorkGraphItem.shadow.eligible || selectedWorkGraphItem.source.kind === "chat"}
                  title={
                    selectedWorkGraphItem.source.kind === "chat"
                      ? "Chat trusted rules need the enterprise backend before they can be saved."
                      : selectedWorkGraphItem.shadow.eligible
                        ? "Create a trusted Shadow Mode rule"
                        : selectedWorkGraphItem.shadow.why
                  }
                  onClick={() => onMakeRule(selectedWorkGraphItem)}
                >
                  Make Rule
                </button>
              </div>
              <details className="work-graph-proof">
                <summary>Show Proof and Replay</summary>
                {workTwinProof && workTwinProof.itemId === selectedWorkGraphItem.id && (
                  <div className="work-graph-proof-summary" aria-label="Proof Mode report">
                    <section>
                      <strong>Understood</strong>
                      <span>{workTwinProof.understood}</span>
                    </section>
                    <section>
                      <strong>Route</strong>
                      <span>{workTwinProof.route}</span>
                    </section>
                    <section>
                      <strong>Quality</strong>
                      <span>{workTwinProof.quality}</span>
                    </section>
                    <section>
                      <strong>External action</strong>
                      <span>{workTwinProof.externalAction}</span>
                    </section>
                  </div>
                )}
                <ul>
                  {(workTwinProof?.itemId === selectedWorkGraphItem.id ? workTwinProof.replay : buildWorkTwinReplay(selectedWorkGraphItem)).map((step) => (
                    <li key={step.id}>
                      <strong>{step.label}</strong>
                      <span>{step.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <p>Select a source trail to review source, plan, output, quality, approval, and the next action.</p>
          )}
        </div>
      </div>
      {(workGraphStatus || shadowModeRunCount > 0 || shadowModeRuleCount > 0) && (
        <p className="work-graph-status">
          {workGraphStatus ||
            `${shadowModeRunCount} Shadow Mode run${shadowModeRunCount === 1 ? "" : "s"} recorded. ${shadowModeRuleCount} trusted rule${
              shadowModeRuleCount === 1 ? "" : "s"
            } configured.`}
        </p>
      )}
    </article>
  );
}

type RuntimePermissionSummary = {
  riskLevel: string;
  label: string;
  detail: string;
};

type HomeAgentRuntimeCardProps = {
  activeRuntimeConnectors: ConnectorDescriptor[];
  selectedRuntimeTools: ToolDescriptor[];
  runtimePermissionPolicy: RuntimePermissionSummary[];
  agentRuntimeTrace: AgentTrace | null;
  allowedRuntimeDecisionCount: number;
  blockedRuntimeDecisions: AgentTrace["permissionDecisions"];
  agentRuntimeStatus: string;
  onRefreshAgentRuntime: () => void;
};

export function HomeAgentRuntimeCard({
  activeRuntimeConnectors,
  selectedRuntimeTools,
  runtimePermissionPolicy,
  agentRuntimeTrace,
  allowedRuntimeDecisionCount,
  blockedRuntimeDecisions,
  agentRuntimeStatus,
  onRefreshAgentRuntime
}: HomeAgentRuntimeCardProps): JSX.Element {
  return (
    <article className="home-command-card agent-runtime-card">
      <header>
        <span>
          <ShieldCheck size={18} aria-hidden="true" />
          Agent Runtime
        </span>
        <button type="button" onClick={onRefreshAgentRuntime}>Refresh</button>
      </header>
      <div className="agent-runtime-grid">
        <section className="agent-runtime-panel">
          <p className="panel-kicker">Connector readiness</p>
          {activeRuntimeConnectors.length === 0 ? (
            <p>No connector has been selected for this Work Twin route yet.</p>
          ) : (
            <ul className="agent-runtime-list">
              {activeRuntimeConnectors.map((connector) => (
                <li key={connector.id}>
                  <span>
                    <strong>{connector.label}</strong>
                    <small>{connector.description}</small>
                  </span>
                  <em data-state={connector.auth.state}>{connector.auth.state.replace(/_/gu, " ")}</em>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="agent-runtime-panel">
          <p className="panel-kicker">Scoped tools</p>
          <ul className="agent-runtime-list compact">
            {selectedRuntimeTools.slice(0, 7).map((tool) => (
              <li key={tool.name}>
                <span>
                  <strong>{tool.name}</strong>
                  <small>{tool.description}</small>
                </span>
                <em data-risk={tool.riskLevel}>{tool.riskLevel.replace(/_/gu, " ")}</em>
              </li>
            ))}
          </ul>
        </section>
        <section className="agent-runtime-panel permission">
          <p className="panel-kicker">Permission policy</p>
          <ul className="agent-runtime-list compact">
            {runtimePermissionPolicy.map((policy) => (
              <li key={policy.riskLevel}>
                <span>
                  <strong>{policy.label}</strong>
                  <small>{policy.detail}</small>
                </span>
                <em data-risk={policy.riskLevel}>{policy.riskLevel.replace(/_/gu, " ")}</em>
              </li>
            ))}
          </ul>
        </section>
        <section className="agent-runtime-panel trace">
          <p className="panel-kicker">Latest trace</p>
          {agentRuntimeTrace ? (
            <>
              <strong>{agentRuntimeTrace.intent}</strong>
              <p>{agentRuntimeTrace.finalOutput}</p>
              <div className="agent-runtime-trace-stats">
                <span>{allowedRuntimeDecisionCount} allowed</span>
                <span>{blockedRuntimeDecisions.length} gated</span>
                {agentRuntimeTrace.quality && <span>Quality {agentRuntimeTrace.quality.score}/100</span>}
                <span>{agentRuntimeTrace.status.replace(/_/gu, " ")}</span>
              </div>
              {blockedRuntimeDecisions.length > 0 && (
                <ul className="agent-runtime-list compact">
                  {blockedRuntimeDecisions.slice(0, 3).map((decision) => (
                    <li key={decision.toolName}>
                      <span>
                        <strong>{decision.toolName}</strong>
                        <small>{decision.reason}</small>
                      </span>
                      <em data-risk={decision.riskLevel}>{decision.riskLevel.replace(/_/gu, " ")}</em>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p>Select a Work Twin item and use Plan with runtime to see the tool-selection and permission trace.</p>
          )}
        </section>
      </div>
      {agentRuntimeStatus && <p className="work-graph-status">{agentRuntimeStatus}</p>}
    </article>
  );
}
