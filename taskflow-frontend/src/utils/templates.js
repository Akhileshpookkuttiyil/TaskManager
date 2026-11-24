/**
 * Predefined task templates for common workflows.
 * Used client-side to pre-populate the task creation form without immediately saving.
 */
export const TASK_TEMPLATES = [
  {
    id: "weekly-review",
    name: "Weekly Review",
    title: "Weekly Review",
    priority: "high",
    tags: ["review", "planning"],
    description: `## Weekly Review & Planning
Perform weekly reflection, inbox zero, and prioritize upcoming milestones.

### Checklist
- [ ] Clear email and message inboxes to zero
- [ ] Review completed tasks and accomplishments
- [ ] Audit calendar for the upcoming week
- [ ] Identify top 3 critical priorities
- [ ] Archive completed or obsolete projects`,
  },
  {
    id: "meeting-preparation",
    name: "Meeting Preparation",
    title: "Meeting Preparation",
    priority: "medium",
    tags: ["meeting", "collaboration"],
    description: `## Meeting Preparation
Set agenda, distribute context materials, and align on objectives.

### Checklist
- [ ] Define meeting objective and desired outcomes
- [ ] Prepare and share agenda with participants
- [ ] Review background documents and relevant metrics
- [ ] Test video conferencing / presentation setup
- [ ] Assign note-taker and document action items`,
  },
  {
    id: "bug-report",
    name: "Bug Report",
    title: "Bug Report",
    priority: "high",
    tags: ["bug", "investigation"],
    description: `## Bug Investigation & Triage
Document the defect, reproduction steps, and root cause analysis.

### Checklist
- [ ] Reproduce defect in staging or local environment
- [ ] Isolate exact steps to reproduce and environment details
- [ ] Capture console logs, network errors, or screenshots
- [ ] Identify root cause and affected components
- [ ] Create regression test and implement fix
- [ ] Verify fix across supported browsers`,
  },
  {
    id: "project-planning",
    name: "Project Planning",
    title: "Project Planning",
    priority: "medium",
    tags: ["project", "strategy"],
    description: `## Project Planning & Roadmap
Outline project scope, deliverables, timeline, and dependencies.

### Checklist
- [ ] Define project scope, goals, and success metrics
- [ ] Identify stakeholders and resource constraints
- [ ] Break down milestones into actionable deliverables
- [ ] Assess potential risks and mitigation strategies
- [ ] Finalize timeline and schedule kickoff meeting`,
  },
];
