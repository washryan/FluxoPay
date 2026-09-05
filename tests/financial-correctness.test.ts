import assert from "node:assert/strict";
import test from "node:test";

import {
  invoiceDifference,
  parseInvoiceAmountToCents,
} from "../src/features/cards/invoice-payment";
import { parseSignedCurrencyToCents } from "../src/features/dashboard/money";

test("parses Brazilian invoice amounts as integer cents", () => {
  assert.equal(parseInvoiceAmountToCents("1.250,00"), 125_000);
  assert.equal(parseInvoiceAmountToCents("1243"), 124_300);
  assert.equal(parseInvoiceAmountToCents("12,345"), null);
});

test("keeps the signed reconciliation difference auditable", () => {
  assert.equal(invoiceDifference(125_000, 124_300), -700);
  assert.equal(invoiceDifference(125_000, 125_700), 700);
});

test("opening balance accepts positive, zero and negative values", () => {
  assert.equal(parseSignedCurrencyToCents("1.500,00"), 150_000);
  assert.equal(parseSignedCurrencyToCents("0"), 0);
  assert.equal(parseSignedCurrencyToCents("-25,50"), -2_550);
  assert.equal(parseSignedCurrencyToCents("not-money"), null);
});
