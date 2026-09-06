import assert from "node:assert/strict";
import test from "node:test";

import {
  getCallbackDestination,
  getSafeNextPath,
} from "../src/features/auth/callback-destination";

test("callback accepts only internal relative destinations", () => {
  assert.equal(getSafeNextPath("/dashboard"), "/dashboard");
  assert.equal(getSafeNextPath("https://attacker.example"), "/dashboard");
  assert.equal(getSafeNextPath("//attacker.example"), "/dashboard");
  assert.equal(getSafeNextPath(null), "/dashboard");
});

test("password recovery always opens the password form", () => {
  assert.equal(
    getCallbackDestination("recovery", "/dashboard"),
    "/reset-password",
  );
  assert.equal(
    getCallbackDestination(null, "/dashboard", true),
    "/reset-password",
  );
});
