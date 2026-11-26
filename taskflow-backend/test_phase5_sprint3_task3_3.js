/**
 * TaskFlow Phase 5 Sprint 3, Task 3.3: Task Dependencies Test Suite
 *
 * Tests:
 * 1. Successful dependency creation (POST /api/tasks/:id/dependencies)
 * 2. Missing task handling (404 for non-existent taskId or prerequisiteId)
 * 3. Self-dependency prevention (400 for taskId === prerequisiteId)
 * 4. Duplicate dependency prevention (400 for existing dependency)
 * 5. Direct circular dependency prevention (400 for A -> B -> A)
 * 6. Indirect circular dependency prevention (400 for A -> B -> C -> A)
 * 7. Security & User isolation boundary checks (401 for unauthenticated, 404 for cross-user)
 * 8. Dependency retrieval (GET /api/tasks/:id/dependencies and GET /api/tasks/:id/dependents)
 * 9. Dependency deletion (DELETE /api/tasks/:id/dependencies/:targetId)
 * 10. Blocked-task completion enforcement (400 when completing task with incomplete prerequisites)
 * 11. Completion allowed when all prerequisites are complete (200)
 * 12. Cascade cleanup upon task deletion
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
  console.log("Phase 5 Sprint 3, Task 3.3: Task Dependencies Test Suite");
  console.log("========================================================\n");

  let userA, tokenA;
  let userB, tokenB;
  const createdUserIds = [];

  try {
    // Start local HTTP server on random port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // 1. Setup and User Registration
    console.log("1. Setup and Authentication:");
    await it("registers User A and User B", async () => {
      const resA = await request("POST", "/api/auth/register", {
        body: {
          name: "User Dependencies A",
          email: `deps.a.${timestamp}@example.com`,
          password: "Password123!",
        },
      });
      assert.strictEqual(resA.status, 201);
      userA = resA.data.data.user;
      tokenA = resA.data.data.token;
      createdUserIds.push(userA.id || userA._id);

      const resB = await request("POST", "/api/auth/register", {
        body: {
          name: "User Dependencies B",
          email: `deps.b.${timestamp}@example.com`,
          password: "Password123!",
        },
      });
      assert.strictEqual(resB.status, 201);
      userB = resB.data.data.user;
      tokenB = resB.data.data.token;
      createdUserIds.push(userB.id || userB._id);
    });

    let task1, task2, task3;

    // 2. Successful Dependency Creation
    console.log("\n2. Successful Dependency Creation:");
    await it("creates tasks and successfully adds a prerequisite", async () => {
      const resT1 = await request("POST", "/api/tasks", {
        token: tokenA,
        body: { title: "Main Project Task 1" },
      });
      assert.strictEqual(resT1.status, 201);
      task1 = resT1.data.data.task;

      const resT2 = await request("POST", "/api/tasks", {
        token: tokenA,
        body: { title: "Prerequisite Task 2" },
      });
      assert.strictEqual(resT2.status, 201);
      task2 = resT2.data.data.task;

      // Add task2 as prerequisite to task1
      const resDep = await request("POST", `/api/tasks/${task1.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: task2.id },
      });
      assert.strictEqual(resDep.status, 201);
      assert.strictEqual(resDep.data.success, true);
      assert.strictEqual(resDep.data.data.dependency.taskId, task1.id);
      assert.strictEqual(resDep.data.data.dependency.prerequisiteId, task2.id);
      assert.ok(resDep.data.data.dependency.id);
    });

    await it("supports /prerequisites alias for dependency creation", async () => {
      const resT3 = await request("POST", "/api/tasks", {
        token: tokenA,
        body: { title: "Follow-up Task 3" },
      });
      assert.strictEqual(resT3.status, 201);
      task3 = resT3.data.data.task;

      const resDep = await request("POST", `/api/tasks/${task3.id}/prerequisites`, {
        token: tokenA,
        body: { prerequisiteId: task1.id },
      });
      assert.strictEqual(resDep.status, 201);
      assert.strictEqual(resDep.data.success, true);
      assert.strictEqual(resDep.data.data.dependency.taskId, task3.id);
      assert.strictEqual(resDep.data.data.dependency.prerequisiteId, task1.id);
    });

    // 3. Missing Task Handling
    console.log("\n3. Missing Task Validation:");
    await it("rejects adding dependency when target taskId does not exist with 404", async () => {
      const nonExistent = "a0000000-0000-4000-8000-000000000000";
      const res = await request("POST", `/api/tasks/${nonExistent}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: task2.id },
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.success, false);
      assert.ok(res.data.message.includes("Task not found"));
    });

    await it("rejects adding dependency when prerequisiteId does not exist with 404", async () => {
      const nonExistent = "b0000000-0000-4000-8000-000000000000";
      const res = await request("POST", `/api/tasks/${task1.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: nonExistent },
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.success, false);
      assert.ok(res.data.message.includes("Prerequisite task not found"));
    });

    await it("rejects missing or invalid prerequisiteId payload with 400", async () => {
      const resMissing = await request("POST", `/api/tasks/${task1.id}/dependencies`, {
        token: tokenA,
        body: {},
      });
      assert.strictEqual(resMissing.status, 400);

      const resInvalid = await request("POST", `/api/tasks/${task1.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: "not-a-uuid" },
      });
      assert.strictEqual(resInvalid.status, 400);
    });

    // 4. Self-Dependency Prevention
    console.log("\n4. Self-Dependency Prevention:");
    await it("rejects self-dependency (taskId === prerequisiteId) with 400", async () => {
      const res = await request("POST", `/api/tasks/${task1.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: task1.id },
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.ok(res.data.message.toLowerCase().includes("cannot depend on itself"));
    });

    // 5. Duplicate Dependency Prevention
    console.log("\n5. Duplicate Dependency Prevention:");
    await it("rejects duplicate dependencies with 400", async () => {
      const res = await request("POST", `/api/tasks/${task1.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: task2.id },
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.ok(res.data.message.toLowerCase().includes("already depends"));
    });

    // 6. Direct Circular Dependency Prevention
    console.log("\n6. Direct Circular Dependency Prevention:");
    await it("rejects direct circular dependency (Task 1 -> Task 2 -> Task 1) with 400", async () => {
      // task1 already depends on task2. Attempting task2 depends on task1 must fail.
      const res = await request("POST", `/api/tasks/${task2.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: task1.id },
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.ok(res.data.message.toLowerCase().includes("circular dependency detected"));
    });

    // 7. Indirect Circular Dependency Prevention
    console.log("\n7. Indirect Circular Dependency Prevention:");
    let taskX, taskY, taskZ;
    await it("rejects indirect circular dependency (X -> Y -> Z -> X) with 400", async () => {
      const resX = await request("POST", "/api/tasks", { token: tokenA, body: { title: "Cycle Task X" } });
      const resY = await request("POST", "/api/tasks", { token: tokenA, body: { title: "Cycle Task Y" } });
      const resZ = await request("POST", "/api/tasks", { token: tokenA, body: { title: "Cycle Task Z" } });
      taskX = resX.data.data.task;
      taskY = resY.data.data.task;
      taskZ = resZ.data.data.task;

      // X depends on Y (Y is prerequisite of X)
      const dep1 = await request("POST", `/api/tasks/${taskX.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: taskY.id },
      });
      assert.strictEqual(dep1.status, 201);

      // Y depends on Z (Z is prerequisite of Y)
      const dep2 = await request("POST", `/api/tasks/${taskY.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: taskZ.id },
      });
      assert.strictEqual(dep2.status, 201);

      // Now chain is: X depends on Y, Y depends on Z.
      // Attempting Z depends on X would create X -> Y -> Z -> X cycle!
      const cycleDep = await request("POST", `/api/tasks/${taskZ.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: taskX.id },
      });
      assert.strictEqual(cycleDep.status, 400);
      assert.strictEqual(cycleDep.data.success, false);
      assert.ok(cycleDep.data.message.toLowerCase().includes("circular dependency detected"));
    });

    // 8. Security & User Isolation Boundary Checks
    console.log("\n8. Security & User Isolation Boundary Checks:");
    let taskUserB;
    await it("rejects unauthenticated dependency requests with 401", async () => {
      const res = await request("GET", `/api/tasks/${task1.id}/dependencies`);
      assert.strictEqual(res.status, 401);
    });

    await it("rejects cross-user access when User B attempts to access User A's task with 404", async () => {
      // User B tries to view User A's dependencies
      const resGet = await request("GET", `/api/tasks/${task1.id}/dependencies`, { token: tokenB });
      assert.strictEqual(resGet.status, 404);

      // User B creates a task
      const resTB = await request("POST", "/api/tasks", { token: tokenB, body: { title: "User B Task" } });
      assert.strictEqual(resTB.status, 201);
      taskUserB = resTB.data.data.task;

      // User B tries to add User A's task as prerequisite
      const resCrossPrereq = await request("POST", `/api/tasks/${taskUserB.id}/dependencies`, {
        token: tokenB,
        body: { prerequisiteId: task1.id },
      });
      assert.strictEqual(resCrossPrereq.status, 404);

      // User B tries to add dependency on User A's task
      const resCrossTarget = await request("POST", `/api/tasks/${task1.id}/dependencies`, {
        token: tokenB,
        body: { prerequisiteId: taskUserB.id },
      });
      assert.strictEqual(resCrossTarget.status, 404);
    });

    // 9. Dependency Retrieval
    console.log("\n9. Dependency Retrieval:");
    await it("retrieves a task's prerequisites with blocked status", async () => {
      const res = await request("GET", `/api/tasks/${task1.id}/dependencies`, { token: tokenA });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.dependencies));
      assert.strictEqual(res.data.data.dependencies.length, 1);
      assert.strictEqual(res.data.data.dependencies[0].prerequisiteId, task2.id);
      assert.strictEqual(res.data.data.dependencies[0].prerequisite.title, task2.title);
      assert.strictEqual(res.data.data.isBlocked, true);
    });

    await it("retrieves tasks that depend on a given task (dependents)", async () => {
      const res = await request("GET", `/api/tasks/${task2.id}/dependents`, { token: tokenA });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.dependents));
      assert.strictEqual(res.data.data.dependents.length, 1);
      assert.strictEqual(res.data.data.dependents[0].taskId, task1.id);
      assert.strictEqual(res.data.data.dependents[0].task.title, task1.title);
    });

    await it("includes dependencies and isBlocked in single task retrieval (GET /api/tasks/:id)", async () => {
      const res = await request("GET", `/api/tasks/${task1.id}`, { token: tokenA });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.data.task.dependencies));
      assert.strictEqual(res.data.data.task.isBlocked, true);
    });

    // 10. Dependency Deletion
    console.log("\n10. Dependency Deletion:");
    await it("deletes a dependency by prerequisiteId", async () => {
      const resDel = await request("DELETE", `/api/tasks/${taskX.id}/dependencies/${taskY.id}`, { token: tokenA });
      assert.strictEqual(resDel.status, 200);
      assert.strictEqual(resDel.data.success, true);

      // Verify dependency is gone
      const resCheck = await request("GET", `/api/tasks/${taskX.id}/dependencies`, { token: tokenA });
      assert.strictEqual(resCheck.status, 200);
      assert.strictEqual(resCheck.data.data.dependencies.length, 0);
    });

    await it("rejects deleting a non-existent dependency with 404", async () => {
      const resDel = await request("DELETE", `/api/tasks/${taskX.id}/dependencies/${taskY.id}`, { token: tokenA });
      assert.strictEqual(resDel.status, 404);
    });

    // 11. Blocked-Task Completion Enforcement
    console.log("\n11. Blocked-Task Completion Enforcement:");
    let blockedTask, prereqTask;
    await it("blocks completing a task when its prerequisites remain incomplete with 400", async () => {
      const resB = await request("POST", "/api/tasks", { token: tokenA, body: { title: "Deployment Step" } });
      const resP = await request("POST", "/api/tasks", { token: tokenA, body: { title: "Automated QA Gate" } });
      blockedTask = resB.data.data.task;
      prereqTask = resP.data.data.task;

      // Add prerequisite
      await request("POST", `/api/tasks/${blockedTask.id}/dependencies`, {
        token: tokenA,
        body: { prerequisiteId: prereqTask.id },
      });

      // Attempt to complete blocked task while prereqTask is pending
      const resComplete = await request("PUT", `/api/tasks/${blockedTask.id}`, {
        token: tokenA,
        body: { status: "completed" },
      });
      assert.strictEqual(resComplete.status, 400);
      assert.strictEqual(resComplete.data.success, false);
      assert.ok(resComplete.data.message.toLowerCase().includes("cannot complete task"));
      assert.ok(resComplete.data.message.includes(prereqTask.title));

      // Verify task status was NOT modified
      const resVerify = await request("GET", `/api/tasks/${blockedTask.id}`, { token: tokenA });
      assert.strictEqual(resVerify.data.data.task.status, "pending");
    });

    await it("blocks completing a task with legacy status 'done' when prerequisites are incomplete with 400", async () => {
      const resComplete = await request("PUT", `/api/tasks/${blockedTask.id}`, {
        token: tokenA,
        body: { status: "done" },
      });
      assert.strictEqual(resComplete.status, 400);
      assert.strictEqual(resComplete.data.success, false);
    });

    await it("does not break existing non-completion workflows on a blocked task", async () => {
      // Updating title, priority, or tags on blocked task works normally
      const resUpdate = await request("PUT", `/api/tasks/${blockedTask.id}`, {
        token: tokenA,
        body: {
          title: "Updated Deployment Step",
          priority: "high",
          tags: ["ops", "prod"],
        },
      });
      assert.strictEqual(resUpdate.status, 200);
      assert.strictEqual(resUpdate.data.data.task.title, "Updated Deployment Step");
      assert.strictEqual(resUpdate.data.data.task.priority, "high");
    });

    // 12. Completion Allowed When All Prerequisites Are Complete
    console.log("\n12. Completion Allowed After Prerequisites Complete:");
    await it("allows completing task once all prerequisites are completed", async () => {
      // Complete the prerequisite first
      const resPrereqComplete = await request("PUT", `/api/tasks/${prereqTask.id}`, {
        token: tokenA,
        body: { status: "completed" },
      });
      assert.strictEqual(resPrereqComplete.status, 200);
      assert.strictEqual(resPrereqComplete.data.data.task.status, "completed");

      // Now complete the dependent task
      const resBlockedComplete = await request("PUT", `/api/tasks/${blockedTask.id}`, {
        token: tokenA,
        body: { status: "completed" },
      });
      assert.strictEqual(resBlockedComplete.status, 200);
      assert.strictEqual(resBlockedComplete.data.data.task.status, "completed");
      assert.ok(resBlockedComplete.data.data.task.completedAt);
    });

    // 13. Cascade Cleanup on Task Deletion
    console.log("\n13. Cascade Cleanup on Task Deletion:");
    await it("cascades dependency removal when a prerequisite task is deleted", async () => {
      const resDelPrereq = await request("DELETE", `/api/tasks/${task2.id}`, { token: tokenA });
      assert.strictEqual(resDelPrereq.status, 200);

      // Verify task1 no longer has task2 as a dependency
      const resDeps = await request("GET", `/api/tasks/${task1.id}/dependencies`, { token: tokenA });
      assert.strictEqual(resDeps.status, 200);
      assert.strictEqual(resDeps.data.data.dependencies.length, 0);
      assert.strictEqual(resDeps.data.data.isBlocked, false);
    });
  } finally {
    // Cleanup
    console.log("\nCleaning up test data...");
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  }

  console.log("\n========================================================");
  console.log(`Phase 5 Sprint 3, Task 3.3 Suite: ${passed}/${total} assertions passed.`);
  console.log("========================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});
