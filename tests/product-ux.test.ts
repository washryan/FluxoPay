import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TRANSACTION_LIMIT,
  resolveTransactionQuery,
} from "../src/features/transactions/query";
import {
  buildInvoiceQuery,
  DEFAULT_INVOICE_STATUS,
  resolveInvoiceStatus,
} from "../src/features/cards/invoice-query";

test("transações sem período usam últimos 30 dias e limite 50", () => {
  assert.deepEqual(resolveTransactionQuery({}, "2026-09-05"), {
    start: "2026-08-07",
    end: "2026-09-05",
    limit: DEFAULT_TRANSACTION_LIMIT,
  });
});

test("período explícito não recebe o limite padrão", () => {
  assert.deepEqual(
    resolveTransactionQuery(
      { start: "2026-08-01", end: "2026-08-31", type: "expense" },
      "2026-09-05",
    ),
    { start: "2026-08-01", end: "2026-08-31", limit: null },
  );
});

test("faturas pendentes são o filtro padrão", () => {
  assert.equal(resolveInvoiceStatus(), DEFAULT_INVOICE_STATUS);
  assert.equal(resolveInvoiceStatus("invalid"), DEFAULT_INVOICE_STATUS);
  assert.equal(resolveInvoiceStatus("all"), "all");
  assert.equal(resolveInvoiceStatus("paid"), "paid");
});

test("query de faturas preserva busca e omite apenas o status padrão", () => {
  assert.equal(buildInvoiceQuery("open", " mercado "), "q=mercado");
  assert.equal(
    buildInvoiceQuery("paid", "mercado"),
    "invoiceStatus=paid&q=mercado",
  );
});
