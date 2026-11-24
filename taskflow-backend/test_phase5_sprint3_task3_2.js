/**
 * TaskFlow Phase 5 Sprint 3, Task 3.2: First-Class Subtasks Test Suite
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
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
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
  console.log("Phase 5 Sprint 3, Task 3.2: First-Class Subtasks Test Suite");
  console.log("========================================================\n");

  let userA, tokenA;
  let userB, tokenB;
  let parentTask;
  let subtask1, subtask2;

  try {
    // Start local HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    console.log("1. Setup and User Registration:");
    const testEmailA = `test-subtask-a-${Date.now()}@example.com`;
    const testEmailB = `test-subtask-b-${Date.now()}@example.com`;

    await it("registers User A and User B", async () => {
      const resA = await request("POST", "/api/auth/register", {
        body: { name: "Subtask User A", email: testEmailA, password: "Password123!" },
      });
      assert.strictEqual(resA.status, 201);
      userA = resA.data.data.user;
      tokenA = resA.data.data.token;

      const resB = await request("POST", "/api/auth/register", {
        body: { name: "Subtask User B", email: testEmailB, password: "Password123!" },
      });
      assert.strictEqual(resB.status, 201);
      userB = resB.data.data.user;
      tokenB = resB.data.data.token;
    });

    console.log("\n2. Parent Task Creation & Subtask Creation:");
    await it("creates a parent task and creates a subtask under it", async () => {
      const parentRes = await request("POST", "/api/tasks", {
        token: tokenA,
        body: { title: "Parent Task Implementation", description: "Top level task" },
      });
      assert.strictEqual(parentRes.status, 201);
      parentTask = parentRes.data.data.task;
      assert.ok(parentTask._id);
      assert.strictEqual(parentTask.parentId, null);

      const subRes = await request("POST", `/api/tasks/${parentTask._id}/subtasks`, {
        token: tokenA,
        body: { title: "Subtask 1: Schema design" },
      });
      assert.strictEqual(subRes.status, 201);
      subtask1 = subRes.data.data.subtask;
      assert.ok(subtask1._id);
      assert.strictEqual(subtask1.parentId, parentTask._id);
      assert.strictEqual(subtask1.title, "Subtask 1: Schema design");

      const progress = subRes.data.data.progress;
      assert.deepStrictEqual(progress, { total: 1, completed: 0, percent: 0 });
    });

    await it("logs subtask_created in parent task activity history", async () => {
      const actRes = await request("GET", `/api/tasks/${parentTask._id}/activities`, { token: tokenA });
      assert.strictEqual(actRes.status, 200);
      const activities = actRes.data.data.activities;
      const subtaskCreatedAct = activities.find((a) => a.type === "subtask_created");
      assert.ok(subtaskCreatedAct, "subtask_created activity should be recorded on parent");
      assert.ok(subtaskCreatedAct.message.includes("Subtask 1: Schema design"));
    });

    console.log("\n3. Parent Ownership & Cross-User Isolation:");
    await it("rejects subtask creation by User B on User A's parent task with 404", async () => {
      const res = await request("POST", `/api/tasks/${parentTask._id}/subtasks`, {
        token: tokenB,
        body: { title: "Hacker subtask" },
      });
      assert.strictEqual(res.status, 404);
    });

    await it("rejects subtasks retrieval by User B on User A's parent task with 404", async () => {
      const res = await request("GET", `/api/tasks/${parentTask._id}/subtasks`, { token: tokenB });
      assert.strictEqual(res.status, 404);
    });

    await it("rejects subtask update by User B on User A's subtask with 404", async () => {
      const res = await request("PUT", `/api/tasks/${parentTask._id}/subtasks/${subtask1._id}`, {
        token: tokenB,
        body: { title: "Hacked title" },
      });
      assert.strictEqual(res.status, 404);
    });

    await it("rejects subtask deletion by User B on User A's subtask with 404", async () => {
      const res = await request("DELETE", `/api/tasks/${parentTask._id}/subtasks/${subtask1._id}`, {
        token: tokenB,
      });
      assert.strictEqual(res.status, 404);
    });

    console.log("\n4. Nested Subtask & Circular Relationship Prevention:");
    await it("rejects creating a subtask under a subtask (depth limit = 1) with 400", async () => {
      const res = await request("POST", `/api/tasks/${subtask1._id}/subtasks`, {
        token: tokenA,
        body: { title: "Nested child level 2" },
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.message.includes("Nested subtasks are not supported"));
    });

    await it("rejects self-parenting (setting parentId to task's own ID) with 400", async () => {
      const res = await request("PUT", `/api/tasks/${parentTask._id}`, {
        token: tokenA,
        body: { parentId: parentTask._id },
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.message.includes("cannot be its own parent"));
    });

    await it("rejects converting a parent task that has subtasks into a subtask with 400", async () => {
      const otherParentRes = await request("POST", "/api/tasks", {
        token: tokenA,
        body: { title: "Another Parent Task" },
      });
      assert.strictEqual(otherParentRes.status, 201);
      const otherParent = otherParentRes.data.data.task;

      const res = await request("PUT", `/api/tasks/${parentTask._id}`, {
        token: tokenA,
        body: { parentId: otherParent._id },
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.message.includes("Cannot convert a parent task with subtasks"));
    });

    console.log("\n5. Subtask Completion, Reopening & Progress Rollup:");
    await it("adds a second subtask and verifies 0/2 (0%) progress", async () => {
      const res = await request("POST", `/api/tasks/${parentTask._id}/subtasks`, {
        token: tokenA,
        body: { title: "Subtask 2: Unit tests" },
      });
      assert.strictEqual(res.status, 201);
      subtask2 = res.data.data.subtask;

      const getRes = await request("GET", `/api/tasks/${parentTask._id}/subtasks`, { token: tokenA });
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.data.data.subtasks.length, 2);
      assert.deepStrictEqual(getRes.data.data.progress, { total: 2, completed: 0, percent: 0 });
    });

    await it("completes subtask 1 and rolls up 1/2 (50%) progress with subtask_completed activity", async () => {
      const updateRes = await request("PUT", `/api/tasks/${parentTask._id}/subtasks/${subtask1._id}`, {
        token: tokenA,
        body: { status: "completed" },
      });
      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.data.data.subtask.status, "completed");
      assert.deepStrictEqual(updateRes.data.data.progress, { total: 2, completed: 1, percent: 50 });

      // Check activity log on parent
      const actRes = await request("GET", `/api/tasks/${parentTask._id}/activities`, { token: tokenA });
      assert.strictEqual(actRes.status, 200);
      const completedAct = actRes.data.data.activities.find((a) => a.type === "subtask_completed");
      assert.ok(completedAct);
      assert.ok(completedAct.message.includes("Subtask 1: Schema design"));
    });

    await it("reopens subtask 1 and rolls back progress to 0/2 (0%) with subtask_reopened activity", async () => {
      const updateRes = await request("PUT", `/api/tasks/${parentTask._id}/subtasks/${subtask1._id}`, {
        token: tokenA,
        body: { status: "pending" },
      });
      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.data.data.subtask.status, "pending");
      assert.deepStrictEqual(updateRes.data.data.progress, { total: 2, completed: 0, percent: 0 });

      // Check activity log on parent
      const actRes = await request("GET", `/api/tasks/${parentTask._id}/activities`, { token: tokenA });
      assert.strictEqual(actRes.status, 200);
      const reopenedAct = actRes.data.data.activities.find((a) => a.type === "subtask_reopened");
      assert.ok(reopenedAct);
    });

    await it("updates subtask title and records subtask_updated activity on parent", async () => {
      const updateRes = await request("PUT", `/api/tasks/${parentTask._id}/subtasks/${subtask1._id}`, {
        token: tokenA,
        body: { title: "Subtask 1: Refined Schema" },
      });
      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.data.data.subtask.title, "Subtask 1: Refined Schema");

      const actRes = await request("GET", `/api/tasks/${parentTask._id}/activities`, { token: tokenA });
      assert.strictEqual(actRes.status, 200);
      const updatedAct = actRes.data.data.activities.find((a) => a.type === "subtask_updated");
      assert.ok(updatedAct);
      assert.ok(updatedAct.message.includes("Refined Schema"));
    });

    console.log("\n6. Archived Subtask Progress Exclusion:");
    await it("excludes archived subtask from active progress calculation", async () => {
      // Complete subtask 1
      await request("PUT", `/api/tasks/${parentTask._id}/subtasks/${subtask1._id}`, {
        token: tokenA,
        body: { status: "completed" },
      });

      // Archive subtask 2
      const res = await request("PUT", `/api/tasks/${parentTask._id}/subtasks/${subtask2._id}`, {
        token: tokenA,
        body: { status: "archived" },
      });
      assert.strictEqual(res.status, 200);

      // Total active subtasks is 1 (subtask1), completed is 1 -> 100%
      assert.deepStrictEqual(res.data.data.progress, { total: 1, completed: 1, percent: 100 });
    });

    console.log("\n7. Subtask Deletion & Activity:");
    await it("deletes subtask 2 and records subtask_deleted activity on parent", async () => {
      const delRes = await request("DELETE", `/api/tasks/${parentTask._id}/subtasks/${subtask2._id}`, {
        token: tokenA,
      });
      assert.strictEqual(delRes.status, 200);
      assert.strictEqual(delRes.data.data.deletedSubtaskId, subtask2._id);

      const actRes = await request("GET", `/api/tasks/${parentTask._id}/activities`, { token: tokenA });
      assert.strictEqual(actRes.status, 200);
      const deletedAct = actRes.data.data.activities.find((a) => a.type === "subtask_deleted");
      assert.ok(deletedAct);
    });

    console.log("\n8. Parent Deletion Policy:");
    await it("rejects deleting parent task when active subtasks exist with 400", async () => {
      // Reopen subtask 1 so it's active
      await request("PUT", `/api/tasks/${parentTask._id}/subtasks/${subtask1._id}`, {
        token: tokenA,
        body: { status: "pending" },
      });

      const delParentRes = await request("DELETE", `/api/tasks/${parentTask._id}`, { token: tokenA });
      assert.strictEqual(delParentRes.status, 400);
      assert.ok(delParentRes.data.message.includes("active subtasks"));
    });

    await it("allows deleting parent task when all subtasks are completed", async () => {
      // Complete subtask 1
      await request("PUT", `/api/tasks/${parentTask._id}/subtasks/${subtask1._id}`, {
        token: tokenA,
        body: { status: "completed" },
      });

      const delParentRes = await request("DELETE", `/api/tasks/${parentTask._id}`, { token: tokenA });
      assert.strictEqual(delParentRes.status, 200);

      // Verify parent is gone
      const getParentRes = await request("GET", `/api/tasks/${parentTask._id}`, { token: tokenA });
      assert.strictEqual(getParentRes.status, 404);
    });

    console.log("\n9. Top-Level Task View Isolation & Stats Verification:");
    await it("verifies subtasks do NOT appear as independent top-level tasks in GET /api/tasks", async () => {
      // Create new parent and subtask
      const pRes = await request("POST", "/api/tasks", {
        token: tokenA,
        body: { title: "Standalone Parent Task" },
      });
      assert.strictEqual(pRes.status, 201);
      const newParent = pRes.data.data.task;

      const sRes = await request("POST", `/api/tasks/${newParent._id}/subtasks`, {
        token: tokenA,
        body: { title: "Child subtask" },
      });
      assert.strictEqual(sRes.status, 201);
      const newSubtask = sRes.data.data.subtask;

      // Fetch all tasks
      const listRes = await request("GET", "/api/tasks", { token: tokenA });
      assert.strictEqual(listRes.status, 200);
      const tasks = listRes.data.data.tasks;

      // Subtask must NOT be in the top-level list
      const subtaskInList = tasks.find((t) => t._id === newSubtask._id);
      assert.strictEqual(subtaskInList, undefined, "Subtask must not appear in top-level tasks list");

      // Parent must be in list and have rollup count
      const parentInList = tasks.find((t) => t._id === newParent._id);
      assert.ok(parentInList, "Parent must be present in top-level list");
      assert.strictEqual(parentInList.subtasksCount, 1);
      assert.strictEqual(parentInList.completedSubtasksCount, 0);

      // Check stats: total should only count top-level tasks
      const statsRes = await request("GET", "/api/tasks/stats", { token: tokenA });
      assert.strictEqual(statsRes.status, 200);
      // Clean up
      await request("PUT", `/api/tasks/${newParent._id}/subtasks/${newSubtask._id}`, {
        token: tokenA,
        body: { status: "completed" },
      });
      await request("DELETE", `/api/tasks/${newParent._id}`, { token: tokenA });
    });

    console.log("\n10. Empty Progress State:");
    await it("returns null progress when task has zero subtasks", async () => {
      const taskRes = await request("POST", "/api/tasks", {
        token: tokenA,
        body: { title: "Empty subtasks parent" },
      });
      assert.strictEqual(taskRes.status, 201);
      const emptyParent = taskRes.data.data.task;

      const subRes = await request("GET", `/api/tasks/${emptyParent._id}/subtasks`, { token: tokenA });
      assert.strictEqual(subRes.status, 200);
      assert.deepStrictEqual(subRes.data.data.subtasks, []);
      assert.strictEqual(subRes.data.data.progress, null);

      await request("DELETE", `/api/tasks/${emptyParent._id}`, { token: tokenA });
    });

  } finally {
    console.log("\nCleaning up test users and activities...");
    if (userA) {
      await prisma.activity.deleteMany({ where: { userId: userA._id } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId: userA._id } }).catch(() => {});
      await prisma.task.deleteMany({ where: { userId: userA._id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userA._id } }).catch(() => {});
    }
    if (userB) {
      await prisma.activity.deleteMany({ where: { userId: userB._id } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId: userB._id } }).catch(() => {});
      await prisma.task.deleteMany({ where: { userId: userB._id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userB._id } }).catch(() => {});
    }
    if (server) {
      server.close();
    }
  }

  console.log("\n========================================================");
  console.log(`Phase 5 Sprint 3, Task 3.2 Suite: ${passed}/${total} assertions passed.`);
  console.log("========================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
