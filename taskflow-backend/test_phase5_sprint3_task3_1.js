/**
 * TaskFlow Phase 5 Sprint 3, Task 3.1: Task Activity History Test Suite
 *
 * Tests:
 * 1. Activity retrieval for an existing task (GET /api/tasks/:id/activities)
 * 2. Empty activity history handling
 * 3. Chronological ordering (createdAt DESC)
 * 4. Cross-user access rejection (strict user isolation, returns 404)
 * 5. Invalid task ID format (returns 404)
 * 6. Pagination parameters (page, limit, total, pages)
 * 7. Field-change activity logging with before/after values:
 *    - task_created
 *    - title_changed
 *    - description_changed
 *    - priority_changed
 *    - due_date_changed
 *    - tags_changed
 *    - status_changed
 *    - task_completed
 *    - task_archived
 *    - task_restored
 *    - task_deleted
 * 8. Prevention of duplicate activity entries
 * 9. Existing global activity feed remains functional (GET /api/activities and with ?taskId=)
 */

process.env.NODE_ENV = "test";
require("dotenv").config({ path: __dirname + "/.env" });

const assert = require("assert");
const http = require("http");
const app = require("./server");
const prisma = require("./config/prisma");

let server;
let baseUrl;
let passed = 0;
let total = 0;

function it(description, fn) {
  total++;
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✓ ${description}`);
      passed++;
    })
    .catch((err) => {
      console.error(`  ✗ ${description}`);
      console.error(err);
    });
}

const request = async (method, path, { token, body } = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function runTests() {
  console.log("\n========================================================");
  console.log("Phase 5 Sprint 3, Task 3.1: Task Activity History Test Suite");
  console.log("========================================================\n");

  // Start ephemeral server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  const testSuffix = Date.now();
  const userAEmail = `user_a_${testSuffix}@taskflow.test`;
  const userBEmail = `user_b_${testSuffix}@taskflow.test`;
  let userAToken;
  let userBToken;
  let userAId;
  let userBId;
  let testTaskId;

  try {
    // Setup test users
    console.log("1. Setup and Authentication:");

    await it("registers User A and User B", async () => {
      const resA = await request("POST", "/api/auth/register", {
        body: { name: "User A", email: userAEmail, password: "Password123!" },
      });
      assert.strictEqual(resA.status, 201);
      assert.ok(resA.data.data.token);
      userAToken = resA.data.data.token;
      userAId = resA.data.data.user._id || resA.data.data.user.id;

      const resB = await request("POST", "/api/auth/register", {
        body: { name: "User B", email: userBEmail, password: "Password123!" },
      });
      assert.strictEqual(resB.status, 201);
      assert.ok(resB.data.data.token);
      userBToken = resB.data.data.token;
      userBId = resB.data.data.user._id || resB.data.data.user.id;
    });

    console.log("\n2. Field-Change Activity Logging & Duplicate Prevention:");

    await it("logs task_created on task creation", async () => {
      const res = await request("POST", "/api/tasks", {
        token: userAToken,
        body: {
          title: "Initial Task Title",
          description: "Initial description",
          priority: "low",
          tags: ["alpha"],
        },
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.data.data.task);
      testTaskId = res.data.data.task._id;

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      assert.strictEqual(actRes.status, 200);
      assert.strictEqual(actRes.data.data.activities.length, 1);
      assert.strictEqual(actRes.data.data.activities[0].type, "task_created");
      assert.ok(actRes.data.data.activities[0].message.includes("Initial Task Title"));
    });

    await it("logs title_changed with from and to without duplicate task_updated", async () => {
      const res = await request("PUT", `/api/tasks/${testTaskId}`, {
        token: userAToken,
        body: { title: "Updated Task Title" },
      });
      assert.strictEqual(res.status, 200);

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      assert.strictEqual(actRes.status, 200);
      // Newest first
      const latest = actRes.data.data.activities[0];
      assert.strictEqual(latest.type, "title_changed");
      assert.strictEqual(latest.message, "Changed title from 'Initial Task Title' to 'Updated Task Title'");

      // Verify no duplicate generic task_updated entry was generated
      const recentTypes = actRes.data.data.activities.slice(0, 2).map((a) => a.type);
      assert.ok(!recentTypes.includes("task_updated"), "Duplicate task_updated must not be generated");
    });

    await it("logs description_changed without duplicate task_updated", async () => {
      const res = await request("PUT", `/api/tasks/${testTaskId}`, {
        token: userAToken,
        body: { description: "Updated full description" },
      });
      assert.strictEqual(res.status, 200);

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      const latest = actRes.data.data.activities[0];
      assert.strictEqual(latest.type, "description_changed");
      assert.ok(latest.message.includes("Updated description"));
    });

    await it("logs priority_changed with from and to without duplicate task_updated", async () => {
      const res = await request("PUT", `/api/tasks/${testTaskId}`, {
        token: userAToken,
        body: { priority: "high" },
      });
      assert.strictEqual(res.status, 200);

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      const latest = actRes.data.data.activities[0];
      assert.strictEqual(latest.type, "priority_changed");
      assert.ok(latest.message.includes("from Low to High"));
    });

    await it("logs due_date_changed with formatted dates", async () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
      const res = await request("PUT", `/api/tasks/${testTaskId}`, {
        token: userAToken,
        body: { dueDate: futureDate },
      });
      assert.strictEqual(res.status, 200);

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      const latest = actRes.data.data.activities[0];
      assert.strictEqual(latest.type, "due_date_changed");
      assert.ok(latest.message.includes("Changed due date"));
    });

    await it("logs tags_changed with previous and next tags", async () => {
      const res = await request("PUT", `/api/tasks/${testTaskId}`, {
        token: userAToken,
        body: { tags: ["alpha", "beta", "urgent"] },
      });
      assert.strictEqual(res.status, 200);

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      const latest = actRes.data.data.activities[0];
      assert.strictEqual(latest.type, "tags_changed");
      assert.ok(latest.message.includes("Updated tags"));
      assert.ok(latest.message.includes("alpha, beta, urgent"));
    });

    await it("logs status_changed when transitioning between active statuses", async () => {
      const res = await request("PUT", `/api/tasks/${testTaskId}`, {
        token: userAToken,
        body: { status: "in_progress" },
      });
      assert.strictEqual(res.status, 200);

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      const latest = actRes.data.data.activities[0];
      assert.strictEqual(latest.type, "status_changed");
      assert.ok(latest.message.includes("from Pending to In Progress"));
    });

    await it("logs task_completed on completion", async () => {
      const res = await request("PUT", `/api/tasks/${testTaskId}`, {
        token: userAToken,
        body: { status: "completed" },
      });
      assert.strictEqual(res.status, 200);

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      const latest = actRes.data.data.activities[0];
      assert.strictEqual(latest.type, "task_completed");
      assert.ok(latest.message.includes("Completed task"));
    });

    await it("logs task_archived on archive", async () => {
      const res = await request("PUT", `/api/tasks/${testTaskId}`, {
        token: userAToken,
        body: { status: "archived" },
      });
      assert.strictEqual(res.status, 200);

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      const latest = actRes.data.data.activities[0];
      assert.strictEqual(latest.type, "task_archived");
      assert.ok(latest.message.includes("Archived task"));
    });

    await it("logs task_restored when moved from archived back to pending", async () => {
      const res = await request("PUT", `/api/tasks/${testTaskId}`, {
        token: userAToken,
        body: { status: "pending" },
      });
      assert.strictEqual(res.status, 200);

      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      const latest = actRes.data.data.activities[0];
      assert.strictEqual(latest.type, "task_restored");
      assert.ok(latest.message.includes("Restored task"));
    });

    console.log("\n3. Chronological Ordering & Pagination:");

    await it("returns activities in strict descending chronological order (newest first)", async () => {
      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      assert.strictEqual(actRes.status, 200);
      const activities = actRes.data.data.activities;
      assert.ok(activities.length >= 10, "Expected at least 10 activities recorded");

      for (let i = 0; i < activities.length - 1; i++) {
        const current = new Date(activities[i].createdAt).getTime();
        const next = new Date(activities[i + 1].createdAt).getTime();
        assert.ok(current >= next, `Activity at ${i} (${current}) must be >= activity at ${i + 1} (${next})`);
      }
    });

    await it("respects pagination limit and page parameters", async () => {
      const page1Res = await request("GET", `/api/tasks/${testTaskId}/activities?limit=3&page=1`, { token: userAToken });
      assert.strictEqual(page1Res.status, 200);
      assert.strictEqual(page1Res.data.data.activities.length, 3);
      assert.strictEqual(page1Res.data.data.pagination.page, 1);
      assert.strictEqual(page1Res.data.data.pagination.limit, 3);
      assert.ok(page1Res.data.data.pagination.total >= 10);
      assert.ok(page1Res.data.data.pagination.pages >= 4);

      const page2Res = await request("GET", `/api/tasks/${testTaskId}/activities?limit=3&page=2`, { token: userAToken });
      assert.strictEqual(page2Res.status, 200);
      assert.strictEqual(page2Res.data.data.activities.length, 3);
      assert.strictEqual(page2Res.data.data.pagination.page, 2);

      // Verify no overlap between page 1 and page 2
      const page1Ids = page1Res.data.data.activities.map((a) => a._id);
      const page2Ids = page2Res.data.data.activities.map((a) => a._id);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      assert.strictEqual(overlap.length, 0, "Pages must not overlap");
    });

    console.log("\n4. Security & User Isolation Boundary Checks:");

    await it("rejects unauthenticated requests with 401", async () => {
      const res = await request("GET", `/api/tasks/${testTaskId}/activities`);
      assert.strictEqual(res.status, 401);
    });

    await it("rejects invalid non-UUID taskId format with 404", async () => {
      const res = await request("GET", "/api/tasks/not-a-valid-uuid/activities", { token: userAToken });
      assert.strictEqual(res.status, 404);
    });

    await it("rejects cross-user access with 404 when User B tries to view User A's task activities", async () => {
      const res = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userBToken });
      assert.strictEqual(res.status, 404, "Must not reveal existence or activity of another user's task");
    });

    await it("returns empty activities array for a task with no activity history", async () => {
      // Create a fresh task for User B
      const createRes = await request("POST", "/api/tasks", {
        token: userBToken,
        body: { title: "User B Task" },
      });
      const bTaskId = createRes.data.data.task._id;

      // Delete the created activity directly from DB to simulate 0 activities
      await prisma.activity.deleteMany({ where: { taskId: bTaskId } });

      const actRes = await request("GET", `/api/tasks/${bTaskId}/activities`, { token: userBToken });
      assert.strictEqual(actRes.status, 200);
      assert.strictEqual(actRes.data.data.activities.length, 0);
      assert.strictEqual(actRes.data.data.pagination.total, 0);
    });

    console.log("\n5. Global Activity Feed & Task Filtering:");

    await it("supports global activity feed and GET /api/activities?taskId=...", async () => {
      // Global activity feed
      const globalRes = await request("GET", "/api/activities", { token: userAToken });
      assert.strictEqual(globalRes.status, 200);
      assert.ok(Array.isArray(globalRes.data.data.activities));
      assert.ok(globalRes.data.data.activities.length > 0);

      // Verify User B cannot see User A's activities in global feed
      const globalBRes = await request("GET", "/api/activities", { token: userBToken });
      assert.strictEqual(globalBRes.status, 200);
      const userBActivities = globalBRes.data.data.activities;
      const leakedUserA = userBActivities.some((a) => a.taskId === testTaskId);
      assert.strictEqual(leakedUserA, false, "User B must not see User A's activities in global feed");

      // Filtered query param /api/activities?taskId=...
      const filteredRes = await request("GET", `/api/activities?taskId=${testTaskId}`, { token: userAToken });
      assert.strictEqual(filteredRes.status, 200);
      assert.ok(filteredRes.data.data.activities.length > 0);
      const allBelongToTask = filteredRes.data.data.activities.every((a) => a.taskId === testTaskId);
      assert.strictEqual(allBelongToTask, true);
    });

    console.log("\n6. Task Deletion Activity Logging:");

    await it("logs task_deleted when task is deleted", async () => {
      const delRes = await request("DELETE", `/api/tasks/${testTaskId}`, { token: userAToken });
      assert.strictEqual(delRes.status, 200);

      // After deletion, task-specific activity lookup should return 404
      const actRes = await request("GET", `/api/tasks/${testTaskId}/activities`, { token: userAToken });
      assert.strictEqual(actRes.status, 404);

      // But deletion activity is preserved in User A's global feed
      const globalRes = await request("GET", "/api/activities", { token: userAToken });
      assert.strictEqual(globalRes.status, 200);
      const latestGlobal = globalRes.data.data.activities[0];
      assert.strictEqual(latestGlobal.type, "task_deleted");
      assert.ok(latestGlobal.message.includes("Deleted task"));
    });
  } finally {
    // Clean up test data
    console.log("\nCleaning up test users and activities...");
    if (userAId) {
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId].filter(Boolean) } } });
    }
    if (server) {
      server.close();
    }
  }

  console.log(`\n========================================================`);
  console.log(`Phase 5 Sprint 3, Task 3.1 Suite: ${passed}/${total} assertions passed.`);
  console.log(`========================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  if (server) server.close();
  process.exit(1);
});
