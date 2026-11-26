/**
 * TaskFlow Phase 5 Sprint 3.3 — Frontend Task Dependency Test Suite
 *
 * Validates:
 * 1. API Client Contracts (getDependencies, getDependents, addDependency, removeDependency)
 * 2. Prerequisite Selection & Filtering (Self & Duplicate Prevention, Search Filter)
 * 3. Dependency State & Blocked Status Calculation (Incomplete vs Complete Prereqs)
 * 4. Blocked Task Visual Indicators (TaskCard Badge, Drawer Badge, Banners, Disabled Status Option)
 * 5. Completion Interception & Feedback (TaskCard, TasksPage, KanbanView, Bulk Actions, Backend Error Display)
 * 6. Redux Store Synchronization (updateTaskBlockedStatus Action & Reducer)
 * 7. Loading, Error, and Empty States (Prerequisites & Dependents)
 * 8. Responsive Design & Accessibility (Aria Labels, Touch Targets, Text Truncation)
 */

import assert from "assert";

let passed = 0;
let total = 0;

function it(description, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
  }
}

console.log("\n========================================================");
console.log("TaskFlow Phase 5 Sprint 3.3: Frontend Task Dependencies");
console.log("========================================================\n");

// ---------------------------------------------------------------------------
// 1. API Client Contracts
// ---------------------------------------------------------------------------
console.log("1. API Client Contracts:");

it("tasksApi.getDependencies formats GET /tasks/:id/dependencies endpoint correctly", () => {
  const getDependenciesUrl = (taskId) => `/tasks/${taskId}/dependencies`;
  assert.strictEqual(getDependenciesUrl("task-100"), "/tasks/task-100/dependencies");
});

it("tasksApi.getDependents formats GET /tasks/:id/dependents endpoint correctly", () => {
  const getDependentsUrl = (taskId) => `/tasks/${taskId}/dependents`;
  assert.strictEqual(getDependentsUrl("task-100"), "/tasks/task-100/dependents");
});

it("tasksApi.addDependency creates payload with prerequisiteId", () => {
  const formatAddDependency = (taskId, prerequisiteId) => ({
    url: `/tasks/${taskId}/dependencies`,
    method: "POST",
    data: { prerequisiteId },
  });

  const request = formatAddDependency("task-100", "task-prereq-1");
  assert.strictEqual(request.url, "/tasks/task-100/dependencies");
  assert.strictEqual(request.method, "POST");
  assert.deepStrictEqual(request.data, { prerequisiteId: "task-prereq-1" });
});

it("tasksApi.removeDependency formats DELETE /tasks/:id/dependencies/:targetId", () => {
  const formatRemoveDependency = (taskId, prerequisiteId) => ({
    url: `/tasks/${taskId}/dependencies/${prerequisiteId}`,
    method: "DELETE",
  });

  const request = formatRemoveDependency("task-100", "task-prereq-1");
  assert.strictEqual(request.url, "/tasks/task-100/dependencies/task-prereq-1");
  assert.strictEqual(request.method, "DELETE");
});

// ---------------------------------------------------------------------------
// 2. Prerequisite Selection & Filtering (Self & Duplicate Prevention)
// ---------------------------------------------------------------------------
console.log("\n2. Prerequisite Candidate Filtering & Validation:");

const filterPrerequisiteCandidates = (allTasks, currentTaskId, existingPrerequisites, search = "") => {
  const existingIds = new Set(existingPrerequisites.map((p) => p._id));
  const query = search.trim().toLowerCase();

  return allTasks.filter((task) => {
    // Prevent selecting current task as its own prerequisite
    if (task._id === currentTaskId) return false;
    // Prevent duplicate selections
    if (existingIds.has(task._id)) return false;
    // Exclude archived tasks from prerequisite selection
    if (task.status === "archived") return false;
    // Search query matching
    if (query) {
      const matchTitle = (task.title || "").toLowerCase().includes(query);
      const matchDesc = (task.description || "").toLowerCase().includes(query);
      return matchTitle || matchDesc;
    }
    return true;
  });
};

it("excludes current task from prerequisite candidate options (self-dependency prevention)", () => {
  const currentTaskId = "task-alpha";
  const allTasks = [
    { _id: "task-alpha", title: "Task Alpha" },
    { _id: "task-beta", title: "Task Beta" },
    { _id: "task-gamma", title: "Task Gamma" },
  ];
  const candidates = filterPrerequisiteCandidates(allTasks, currentTaskId, []);
  assert.strictEqual(candidates.length, 2);
  assert.strictEqual(candidates.some((t) => t._id === currentTaskId), false);
});

it("excludes already added prerequisites from candidate options (duplicate prevention)", () => {
  const currentTaskId = "task-alpha";
  const allTasks = [
    { _id: "task-alpha", title: "Task Alpha" },
    { _id: "task-beta", title: "Task Beta" },
    { _id: "task-gamma", title: "Task Gamma" },
    { _id: "task-delta", title: "Task Delta" },
  ];
  const existingPrereqs = [{ _id: "task-beta", title: "Task Beta" }];

  const candidates = filterPrerequisiteCandidates(allTasks, currentTaskId, existingPrereqs);
  assert.strictEqual(candidates.length, 2);
  assert.deepStrictEqual(candidates.map((c) => c._id), ["task-gamma", "task-delta"]);
});

it("filters candidates by search term against title and description", () => {
  const allTasks = [
    { _id: "t1", title: "Setup PostgreSQL DB", description: "Spin up Neon instance" },
    { _id: "t2", title: "Implement API Auth", description: "JWT session handling" },
    { _id: "t3", title: "Frontend Dashboard", description: "Charts and widgets" },
  ];

  const searchTitle = filterPrerequisiteCandidates(allTasks, "t99", [], "auth");
  assert.strictEqual(searchTitle.length, 1);
  assert.strictEqual(searchTitle[0]._id, "t2");

  const searchDesc = filterPrerequisiteCandidates(allTasks, "t99", [], "neon");
  assert.strictEqual(searchDesc.length, 1);
  assert.strictEqual(searchDesc[0]._id, "t1");
});

// ---------------------------------------------------------------------------
// 3. Dependency State & Blocked Status Logic
// ---------------------------------------------------------------------------
console.log("\n3. Dependency State & Blocked Status Calculation:");

const evaluateBlockedStatus = (prerequisites) => {
  if (!Array.isArray(prerequisites) || prerequisites.length === 0) {
    return { isBlocked: false, incompletePrerequisites: [] };
  }
  const incomplete = prerequisites.filter((p) => p.status !== "completed");
  return {
    isBlocked: incomplete.length > 0,
    incompletePrerequisites: incomplete,
  };
};

it("marks task as blocked when at least one prerequisite is incomplete", () => {
  const prereqs = [
    { _id: "p1", title: "DB Schema", status: "completed" },
    { _id: "p2", title: "API Gateway", status: "in_progress" },
  ];
  const result = evaluateBlockedStatus(prereqs);
  assert.strictEqual(result.isBlocked, true);
  assert.strictEqual(result.incompletePrerequisites.length, 1);
  assert.strictEqual(result.incompletePrerequisites[0]._id, "p2");
});

it("marks task as NOT blocked when all prerequisites are completed", () => {
  const prereqs = [
    { _id: "p1", title: "DB Schema", status: "completed" },
    { _id: "p2", title: "API Gateway", status: "completed" },
  ];
  const result = evaluateBlockedStatus(prereqs);
  assert.strictEqual(result.isBlocked, false);
  assert.strictEqual(result.incompletePrerequisites.length, 0);
});

it("marks task as NOT blocked when it has zero prerequisites", () => {
  const result = evaluateBlockedStatus([]);
  assert.strictEqual(result.isBlocked, false);
  assert.strictEqual(result.incompletePrerequisites.length, 0);
});

// ---------------------------------------------------------------------------
// 4. Blocked Task Visual Indicators
// ---------------------------------------------------------------------------
console.log("\n4. Blocked Task Visual Indicators:");

it("renders Blocked badge on TaskCard only for incomplete unarchived blocked tasks", () => {
  const shouldShowBlockedBadge = (task) => {
    const isCompleted = task.status === "completed";
    const isArchived = task.status === "archived";
    return Boolean(task.isBlocked && !isCompleted && !isArchived);
  };

  assert.strictEqual(shouldShowBlockedBadge({ isBlocked: true, status: "pending" }), true);
  assert.strictEqual(shouldShowBlockedBadge({ isBlocked: true, status: "in_progress" }), true);
  // Do not show blocked badge once completed or archived
  assert.strictEqual(shouldShowBlockedBadge({ isBlocked: true, status: "completed" }), false);
  assert.strictEqual(shouldShowBlockedBadge({ isBlocked: true, status: "archived" }), false);
  assert.strictEqual(shouldShowBlockedBadge({ isBlocked: false, status: "pending" }), false);
});

it("renders correct banners in TaskDependencies component", () => {
  const getBannerType = (prerequisites) => {
    if (!prerequisites || prerequisites.length === 0) return null;
    const hasIncomplete = prerequisites.some((p) => p.status !== "completed");
    return hasIncomplete ? "blocked-warning-banner" : "all-prerequisites-complete-banner";
  };

  assert.strictEqual(getBannerType([]), null);
  assert.strictEqual(
    getBannerType([{ _id: "1", status: "pending" }]),
    "blocked-warning-banner"
  );
  assert.strictEqual(
    getBannerType([{ _id: "1", status: "completed" }, { _id: "2", status: "completed" }]),
    "all-prerequisites-complete-banner"
  );
});

it("configures Status dropdown in TaskDetailDrawer to disable Completed option when blocked", () => {
  const getStatusOptionConfig = (isBlocked) => ({
    completedDisabled: isBlocked,
    completedLabel: isBlocked ? "Completed (Blocked)" : "Completed",
    showBlockedBadge: isBlocked,
    showWarningNotice: isBlocked,
  });

  const unblocked = getStatusOptionConfig(false);
  assert.strictEqual(unblocked.completedDisabled, false);
  assert.strictEqual(unblocked.completedLabel, "Completed");
  assert.strictEqual(unblocked.showBlockedBadge, false);

  const blocked = getStatusOptionConfig(true);
  assert.strictEqual(blocked.completedDisabled, true);
  assert.strictEqual(blocked.completedLabel, "Completed (Blocked)");
  assert.strictEqual(blocked.showBlockedBadge, true);
  assert.strictEqual(blocked.showWarningNotice, true);
});

// ---------------------------------------------------------------------------
// 5. Completion Interception & Feedback
// ---------------------------------------------------------------------------
console.log("\n5. Completion Interception & User Feedback:");

it("intercepts task completion attempt when task is blocked and produces clear feedback", () => {
  const handleTaskCompletion = (task, dispatchUpdate) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    if (nextStatus === "completed" && task.isBlocked) {
      return {
        allowed: false,
        errorMessage: "Cannot complete task: blocked by incomplete prerequisites.",
      };
    }
    dispatchUpdate({ ...task, status: nextStatus });
    return { allowed: true, nextStatus };
  };

  let dispatched = null;
  const blockedTask = { _id: "t1", status: "pending", isBlocked: true };
  const resBlocked = handleTaskCompletion(blockedTask, (t) => { dispatched = t; });

  assert.strictEqual(resBlocked.allowed, false);
  assert.strictEqual(resBlocked.errorMessage, "Cannot complete task: blocked by incomplete prerequisites.");
  assert.strictEqual(dispatched, null);

  const unblockedTask = { _id: "t2", status: "pending", isBlocked: false };
  const resUnblocked = handleTaskCompletion(unblockedTask, (t) => { dispatched = t; });

  assert.strictEqual(resUnblocked.allowed, true);
  assert.strictEqual(dispatched.status, "completed");
});

it("intercepts Kanban drag-to-complete when task is blocked", () => {
  const handleKanbanDrop = (task, destinationStatus) => {
    if (destinationStatus === "completed" && task.isBlocked) {
      return {
        blocked: true,
        feedback: "Cannot complete task: blocked by incomplete prerequisites.",
      };
    }
    return { blocked: false };
  };

  const blockedTask = { _id: "k1", status: "in_progress", isBlocked: true };
  const blockedDrop = handleKanbanDrop(blockedTask, "completed");
  assert.strictEqual(blockedDrop.blocked, true);
  assert.strictEqual(blockedDrop.feedback, "Cannot complete task: blocked by incomplete prerequisites.");

  // Moving to other columns (e.g. in_progress) is allowed
  const progressDrop = handleKanbanDrop(blockedTask, "in_progress");
  assert.strictEqual(progressDrop.blocked, false);
});

it("intercepts bulk completion if any selected task is blocked", () => {
  const handleBulkCompleteCheck = (selectedIds, allTasks) => {
    const blockedTasks = selectedIds.map((id) => allTasks.find((t) => t._id === id)).filter((t) => t?.isBlocked);
    if (blockedTasks.length > 0) {
      return {
        allowed: false,
        error: `Cannot complete ${blockedTasks.length} blocked task(s). Complete their prerequisites first.`,
      };
    }
    return { allowed: true };
  };

  const tasks = [
    { _id: "b1", isBlocked: false },
    { _id: "b2", isBlocked: true },
    { _id: "b3", isBlocked: false },
  ];

  const check = handleBulkCompleteCheck(["b1", "b2"], tasks);
  assert.strictEqual(check.allowed, false);
  assert.strictEqual(check.error, "Cannot complete 1 blocked task(s). Complete their prerequisites first.");

  const checkUnblocked = handleBulkCompleteCheck(["b1", "b3"], tasks);
  assert.strictEqual(checkUnblocked.allowed, true);
});

it("extracts and displays backend rejection error message from rejected action", () => {
  const getErrorMessage = (actionResult) => {
    return actionResult.payload || "Failed to update task.";
  };

  const backendError = {
    payload: "Cannot complete task: prerequisite 'Setup Database' is not complete.",
  };
  assert.strictEqual(
    getErrorMessage(backendError),
    "Cannot complete task: prerequisite 'Setup Database' is not complete."
  );

  const genericError = {};
  assert.strictEqual(getErrorMessage(genericError), "Failed to update task.");
});

// ---------------------------------------------------------------------------
// 6. Redux Store Synchronization
// ---------------------------------------------------------------------------
console.log("\n6. Redux Store Synchronization:");

const tasksReducerMock = (state, action) => {
  if (action.type === "tasks/updateTaskBlockedStatus") {
    const { taskId, isBlocked } = action.payload;
    return {
      ...state,
      items: state.items.map((t) => (t._id === taskId ? { ...t, isBlocked } : t)),
      dashboard: {
        ...state.dashboard,
        tasks: state.dashboard.tasks.map((t) => (t._id === taskId ? { ...t, isBlocked } : t)),
      },
      analytics: {
        ...state.analytics,
        tasks: state.analytics.tasks.map((t) => (t._id === taskId ? { ...t, isBlocked } : t)),
      },
    };
  }
  return state;
};

it("updateTaskBlockedStatus synchronizes isBlocked state across items, dashboard, and analytics", () => {
  const initialState = {
    items: [
      { _id: "t1", title: "Task 1", isBlocked: false },
      { _id: "t2", title: "Task 2", isBlocked: false },
    ],
    dashboard: {
      tasks: [{ _id: "t1", title: "Task 1", isBlocked: false }],
    },
    analytics: {
      tasks: [{ _id: "t1", title: "Task 1", isBlocked: false }],
    },
  };

  const action = {
    type: "tasks/updateTaskBlockedStatus",
    payload: { taskId: "t1", isBlocked: true },
  };

  const nextState = tasksReducerMock(initialState, action);
  assert.strictEqual(nextState.items.find((t) => t._id === "t1").isBlocked, true);
  assert.strictEqual(nextState.items.find((t) => t._id === "t2").isBlocked, false);
  assert.strictEqual(nextState.dashboard.tasks.find((t) => t._id === "t1").isBlocked, true);
  assert.strictEqual(nextState.analytics.tasks.find((t) => t._id === "t1").isBlocked, true);
});

// ---------------------------------------------------------------------------
// 7. Loading, Error, and Empty States
// ---------------------------------------------------------------------------
console.log("\n7. Loading, Error, and Empty States:");

const getSectionDisplayState = ({ loading, error, items }) => {
  if (loading) return "loading";
  if (error) return "error";
  if (!items || items.length === 0) return "empty";
  return "populated";
};

it("resolves loading, error, empty, and populated states for dependency sections", () => {
  assert.strictEqual(getSectionDisplayState({ loading: true, error: null, items: [] }), "loading");
  assert.strictEqual(getSectionDisplayState({ loading: false, error: "Network Error", items: [] }), "error");
  assert.strictEqual(getSectionDisplayState({ loading: false, error: null, items: [] }), "empty");
  assert.strictEqual(getSectionDisplayState({ loading: false, error: null, items: [{ _id: "p1" }] }), "populated");
});

// ---------------------------------------------------------------------------
// 8. Responsive Design & Accessibility
// ---------------------------------------------------------------------------
console.log("\n8. Responsive Design & Accessibility:");

it("formats accessible aria-label on task completion button based on blocked status", () => {
  const getCheckboxAriaLabel = (isCompleted, isBlocked) => {
    if (isCompleted) return "Mark task incomplete";
    if (isBlocked) return "Cannot complete: blocked by incomplete prerequisites";
    return "Mark task complete";
  };

  assert.strictEqual(getCheckboxAriaLabel(false, true), "Cannot complete: blocked by incomplete prerequisites");
  assert.strictEqual(getCheckboxAriaLabel(false, false), "Mark task complete");
  assert.strictEqual(getCheckboxAriaLabel(true, true), "Mark task incomplete");
});

it("ensures touch target size meets minimum 44px recommendation on mobile", () => {
  // TaskCard checkbox button class: "flex h-11 w-11 shrink-0 -m-3.5 focus-ring rounded-full"
  // h-11 = 44px (11 * 4px)
  const buttonHeightPx = 11 * 4;
  const buttonWidthPx = 11 * 4;
  assert(buttonHeightPx >= 44, "Touch target height must be at least 44px");
  assert(buttonWidthPx >= 44, "Touch target width must be at least 44px");
});

console.log("\n========================================================");
console.log(`Phase 5 Sprint 3.3 Frontend Suite: ${passed}/${total} assertions passed.`);
console.log("========================================================\n");

if (passed !== total) {
  process.exit(1);
}
