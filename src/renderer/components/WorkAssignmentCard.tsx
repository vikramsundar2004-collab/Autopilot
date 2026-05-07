import type { WorkAssignment } from "../../shared/workItems";
import { summarizeWorkAssignmentTrail } from "../../shared/workItems";

type WorkAssignmentCardProps = {
  assignment: WorkAssignment;
  outputLabel: string;
  stateLabel: string;
  onApprove: () => void;
  onReject: () => void;
};

export function WorkAssignmentCard({ assignment, outputLabel, stateLabel, onApprove, onReject }: WorkAssignmentCardProps) {
  return (
    <div className="work-assignment-row">
      <span>
        <strong>{assignment.title}</strong>
        <small>{assignment.reason}</small>
        <small>{outputLabel}</small>
        <span className="assignment-run-trail" aria-label={`Run trail for ${assignment.title}`}>
          {summarizeWorkAssignmentTrail(assignment).map((step) => (
            <em key={step}>{step}</em>
          ))}
        </span>
      </span>
      <span className="assignment-state-stack">
        <b data-state={assignment.state}>{stateLabel}</b>
        {assignment.state === "waiting_for_user" && (
          <span className="assignment-actions">
            <button type="button" onClick={onApprove}>
              Approve
            </button>
            <button type="button" onClick={onReject}>
              Reject
            </button>
          </span>
        )}
      </span>
    </div>
  );
}
