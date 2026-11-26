/**
 * TaskFlow Phase 5 Sprint 3.3 — Phase 4 Full Integration & Security Verification
 *
 * Validates:
 * Step 1: API & Frontend Client Integration (Headers, response parsing, error schemas)
 * Step 2: Task Lifecycle Integration (Create, update, blocked check, cascade delete, Redux)
 * Step 3: Security & Concurrency (Cross-user isolation, 401 unauth, cycle detection, race conditions)
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
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data,
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

async function runPhase4Integration() {
  console.log("\n========================================================");
  console.log("Phase 4: Full Integration & Security Verification Suite");
  console.log("========================================================\n");

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Phase 4 verification test server listening on ${baseUrl}`);
      resolve();
    });
  });

  const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const userAEmail = `phase4_userA_${uniqueSuffix}@example.com`;
  const userBEmail = `phase4_userB_${uniqueSuffix}@example.com`;
  const password = "Password123!";

  let userAToken = null;
  let userBToken = null;
  let userAId = null;
  let userBId = null;

  // ---------------------------------------------------------------------------
  // STEP 1: API & Frontend Client Integration
  // ---------------------------------------------------------------------------
  console.log("Step 1: API & Frontend Client Integration:");

  await it("registers User A and User B and receives JWT bearer tokens", async () => {
    const resA = await request("POST", "/api/auth/register", {
      body: { name: "Phase 4 User A", email: userAEmail, password },
    });
    assert.strictEqual(resA.status, 201);
    assert.strictEqual(resA.data.success, true);
    userAToken = resA.data.data.token;
    userAId = resA.data.data.user.id || resA.data.data.user._id;

    const resB = await request("POST", "/api/auth/register", {
      body: { name: "Phase 4 User B", email: userBEmail, password },
    });
    assert.strictEqual(resB.status, 201);
    userBToken = resB.data.data.token;
    userBId = resB.data.data.user.id || resB.data.data.user._id;
  });

  let task1Id = null;
  let task2Id = null;
  let task3Id = null;

  await it("creates tasks with frontend payload structure", async () => {
    const res1 = await request("POST", "/api/tasks", {
      token: userAToken,
      body: { title: "Phase 4 - Database Migration", priority: "high", status: "pending" },
    });
    assert.strictEqual(res1.status, 201);
    task1Id = res1.data.data.task._id;

    const res2 = await request("POST", "/api/tasks", {
      token: userAToken,
      body: { title: "Phase 4 - API Implementation", priority: "medium", status: "pending" },
    });
    assert.strictEqual(res2.status, 201);
    task2Id = res2.data.data.task._id;

    const res3 = await request("POST", "/api/tasks", {
      token: userAToken,
      body: { title: "Phase 4 - Frontend UI", priority: "low", status: "pending" },
    });
    assert.strictEqual(res3.status, 201);
    task3Id = res3.data.data.task._id;
  });

  await it("creates dependency via POST /api/tasks/:id/dependencies with prerequisiteId", async () => {
    const res = await request("POST", `/api/tasks/${task2Id}/dependencies`, {
      token: userAToken,
      body: { prerequisiteId: task1Id },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.dependency.taskId, task2Id);
    assert.strictEqual(res.data.data.dependency.prerequisiteId, task1Id);
  });

  await it("retrieves prerequisites via GET /api/tasks/:id/dependencies with parsed structure", async () => {
    const res = await request("GET", `/api/tasks/${task2Id}/dependencies`, {
      token: userAToken,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.isBlocked, true);
    assert.strictEqual(Array.isArray(res.data.data.dependencies), true);
    assert.strictEqual(res.data.data.dependencies.length, 1);
    assert.strictEqual(res.data.data.dependencies[0].prerequisiteId, task1Id);
    assert.strictEqual(res.data.data.prerequisites[0]._id, task1Id);
    assert.strictEqual(res.data.data.prerequisites[0].title, "Phase 4 - Database Migration");
  });

  await it("retrieves dependent tasks via GET /api/tasks/:id/dependents", async () => {
    const res = await request("GET", `/api/tasks/${task1Id}/dependents`, {
      token: userAToken,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(Array.isArray(res.data.data.dependents), true);
    assert.strictEqual(res.data.data.dependents.length, 1);
    assert.strictEqual(res.data.data.dependents[0].taskId, task2Id);
    assert.strictEqual(res.data.data.dependentTasks[0]._id, task2Id);
  });

  // ---------------------------------------------------------------------------
  // STEP 2: Task Lifecycle Integration
  // ---------------------------------------------------------------------------
  console.log("\nStep 2: Task Lifecycle Integration:");

  await it("blocks completing task when prerequisite is pending with useful error details", async () => {
    const res = await request("PUT", `/api/tasks/${task2Id}`, {
      token: userAToken,
      body: { status: "completed" },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Cannot complete task: 1 prerequisite\(s\) remain incomplete/);
    assert.match(res.data.message, /Phase 4 - Database Migration/);
  });

  await it("allows non-status metadata updates on blocked tasks (title, description, tags, priority)", async () => {
    const res = await request("PUT", `/api/tasks/${task2Id}`, {
      token: userAToken,
      body: {
        title: "Phase 4 - API Implementation (Revised)",
        priority: "high",
        tags: ["backend", "api"],
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.task.title, "Phase 4 - API Implementation (Revised)");
    assert.strictEqual(res.data.data.task.priority, "high");
    assert.strictEqual(res.data.data.task.status, "pending");
  });

  await it("unblocks task completion after all prerequisites become completed", async () => {
    // Complete prerequisite Task 1
    const res1 = await request("PUT", `/api/tasks/${task1Id}`, {
      token: userAToken,
      body: { status: "completed" },
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.data.data.task.status, "completed");

    // Check prerequisites on Task 2
    const resPrereqs = await request("GET", `/api/tasks/${task2Id}/dependencies`, {
      token: userAToken,
    });
    assert.strictEqual(resPrereqs.status, 200);
    assert.strictEqual(resPrereqs.data.data.isBlocked, false);

    // Complete Task 2
    const res2 = await request("PUT", `/api/tasks/${task2Id}`, {
      token: userAToken,
      body: { status: "completed" },
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.data.task.status, "completed");
  });

  await it("re-blocks dependent task if completed prerequisite is reopened", async () => {
    // Reopen Task 1 back to pending
    const res1 = await request("PUT", `/api/tasks/${task1Id}`, {
      token: userAToken,
      body: { status: "pending" },
    });
    assert.strictEqual(res1.status, 200);

    // Verify Task 2 is now reported as blocked
    const resCheck = await request("GET", `/api/tasks/${task2Id}/dependencies`, {
      token: userAToken,
    });
    assert.strictEqual(resCheck.data.data.isBlocked, true);
  });

  await it("removes dependency and verifies task is unblocked", async () => {
    const resDel = await request("DELETE", `/api/tasks/${task2Id}/dependencies/${task1Id}`, {
      token: userAToken,
    });
    assert.strictEqual(resDel.status, 200);
    assert.strictEqual(resDel.data.success, true);

    const resCheck = await request("GET", `/api/tasks/${task2Id}/dependencies`, {
      token: userAToken,
    });
    assert.strictEqual(resCheck.data.data.isBlocked, false);
    assert.strictEqual(resCheck.data.data.dependencies.length, 0);
  });

  await it("verifies cascade deletion cleanup of dependency records when task is deleted", async () => {
    // Add dependency: Task 3 -> Task 1
    await request("POST", `/api/tasks/${task3Id}/dependencies`, {
      token: userAToken,
      body: { prerequisiteId: task1Id },
    });

    // Delete Task 1
    const resDel = await request("DELETE", `/api/tasks/${task1Id}`, {
      token: userAToken,
    });
    assert.strictEqual(resDel.status, 200);

    // Verify Task 3 dependencies are now empty
    const resCheck = await request("GET", `/api/tasks/${task3Id}/dependencies`, {
      token: userAToken,
    });
    assert.strictEqual(resCheck.data.data.dependencies.length, 0);
    assert.strictEqual(resCheck.data.data.isBlocked, false);
  });

  // ---------------------------------------------------------------------------
  // STEP 3: Security, Isolation & Concurrency
  // ---------------------------------------------------------------------------
  console.log("\nStep 3: Security, Isolation & Concurrency:");

  await it("enforces cross-user isolation: User B cannot add User A task as prerequisite", async () => {
    // User B creates a task
    const resBTask = await request("POST", "/api/tasks", {
      token: userBToken,
      body: { title: "User B Task" },
    });
    const userBTaskId = resBTask.data.data.task._id;

    // User B tries to link User A's Task 3 as prerequisite
    const resCross = await request("POST", `/api/tasks/${userBTaskId}/dependencies`, {
      token: userBToken,
      body: { prerequisiteId: task3Id },
    });
    assert.strictEqual(resCross.status, 404);
    assert.strictEqual(resCross.data.success, false);
  });

  await it("rejects unauthenticated dependency requests with 401", async () => {
    const res = await request("GET", `/api/tasks/${task3Id}/dependencies`);
    assert.strictEqual(res.status, 401);
  });

  await it("rejects self-dependency attempts with 400", async () => {
    const res = await request("POST", `/api/tasks/${task3Id}/dependencies`, {
      token: userAToken,
      body: { prerequisiteId: task3Id },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /cannot depend on itself/i);
  });

  await it("rejects indirect circular dependencies (A -> B -> C -> A)", async () => {
    // Create chain: NodeA -> NodeB -> NodeC
    const resA = await request("POST", "/api/tasks", {
      token: userAToken,
      body: { title: "Cycle Node A" },
    });
    const resB = await request("POST", "/api/tasks", {
      token: userAToken,
      body: { title: "Cycle Node B" },
    });
    const resC = await request("POST", "/api/tasks", {
      token: userAToken,
      body: { title: "Cycle Node C" },
    });

    const idA = resA.data.data.task._id;
    const idB = resB.data.data.task._id;
    const idC = resC.data.data.task._id;

    // NodeA depends on NodeB
    await request("POST", `/api/tasks/${idA}/dependencies`, {
      token: userAToken,
      body: { prerequisiteId: idB },
    });

    // NodeB depends on NodeC
    await request("POST", `/api/tasks/${idB}/dependencies`, {
      token: userAToken,
      body: { prerequisiteId: idC },
    });

    // Attempt: NodeC depends on NodeA (would form A -> B -> C -> A cycle)
    const resCycle = await request("POST", `/api/tasks/${idC}/dependencies`, {
      token: userAToken,
      body: { prerequisiteId: idA },
    });
    assert.strictEqual(resCycle.status, 400);
    assert.strictEqual(resCycle.data.success, false);
    assert.match(resCycle.data.message, /Circular dependency detected/i);

    // Cleanup cycle tasks
    await request("DELETE", `/api/tasks/${idA}`, { token: userAToken });
    await request("DELETE", `/api/tasks/${idB}`, { token: userAToken });
    await request("DELETE", `/api/tasks/${idC}`, { token: userAToken });
  });

  await it("handles concurrent dependency creation race conditions safely", async () => {
    const resSource = await request("POST", "/api/tasks", {
      token: userAToken,
      body: { title: "Race Source Task" },
    });
    const resPrereq = await request("POST", "/api/tasks", {
      token: userAToken,
      body: { title: "Race Prereq Task" },
    });

    const srcId = resSource.data.data.task._id;
    const preId = resPrereq.data.data.task._id;

    // Send 6 simultaneous requests to create the exact same dependency
    const attempts = await Promise.all(
      Array.from({ length: 6 }).map(() =>
        request("POST", `/api/tasks/${srcId}/dependencies`, {
          token: userAToken,
          body: { prerequisiteId: preId },
        })
      )
    );

    // Exactly one should succeed with 201, the rest should be rejected with 400 or 409
    const successful = attempts.filter((r) => r.status === 201);
    const rejected = attempts.filter((r) => r.status === 400 || r.status === 409);

    assert.strictEqual(successful.length, 1);
    assert.strictEqual(rejected.length, 5);

    // Verify DB integrity: exactly one record exists in database
    const dbDependencies = await prisma.taskDependency.findMany({
      where: { taskId: srcId, prerequisiteId: preId },
    });
    assert.strictEqual(dbDependencies.length, 1);

    // Cleanup
    await request("DELETE", `/api/tasks/${srcId}`, { token: userAToken });
    await request("DELETE", `/api/tasks/${preId}`, { token: userAToken });
  });

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------
  console.log("\nCleaning up Phase 4 test data...");
  try {
    if (userAId) {
      await prisma.taskDependency.deleteMany({
        where: {
          task: { userId: userAId },
        },
      });
      await prisma.task.deleteMany({ where: { userId: userAId } });
      await prisma.activity.deleteMany({ where: { userId: userAId } });
      await prisma.user.delete({ where: { id: userAId } });
    }
    if (userBId) {
      await prisma.task.deleteMany({ where: { userId: userBId } });
      await prisma.activity.deleteMany({ where: { userId: userBId } });
      await prisma.user.delete({ where: { id: userBId } });
    }
  } catch (err) {
    console.error("Warning during test data cleanup:", err.message);
  }

  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();

  console.log("\n========================================================");
  console.log(`Phase 4 Integration Suite: ${passed}/${total} assertions passed.`);
  console.log("========================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase4Integration().catch((err) => {
  console.error("Phase 4 integration suite fatal error:", err);
  process.exit(1);
});
