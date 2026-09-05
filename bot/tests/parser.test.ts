import assert from "node:assert/strict";
import test from "node:test";
import { handleFakeTelegramUpdate } from "../src/conversation";
import { parseBotIntent, parseFinancialDate } from "../src/parser";
import { parseCurrencyToCents } from "../src/utils";

test("money parsing uses integer cents for supported Brazilian formats", () => {
  for (const [input, expected] of [["10", 1000], ["10,50", 1050], ["R$10,50", 1050],
    ["1.200,50", 120050], ["10 reais", 1000]] as const) assert.equal(parseCurrencyToCents(input), expected);
  assert.equal(parseCurrencyToCents("0"), null); assert.equal(parseCurrencyToCents("-10"), null);
  assert.equal(parseCurrencyToCents("100,01", 10_000), null);
  const dated = parseBotIntent("gastei em 05/09 R$ 10 no pix");
  assert.equal(dated.type, "CREATE_TRANSACTION");
  if (dated.type === "CREATE_TRANSACTION") assert.equal(dated.payload.amount_cents, 1000);
});
test("civil dates respect timezone and relative days", () => {
  const context = { now: new Date("2026-09-05T01:00:00Z"), timezone: "America/Sao_Paulo" };
  assert.equal(parseFinancialDate("hoje", context), "2026-09-04");
  assert.equal(parseFinancialDate("ontem", context), "2026-09-03");
  assert.equal(parseFinancialDate("amanhã", context), "2026-09-05");
  assert.equal(parseFinancialDate("5 de setembro", context), "2026-09-05");
  assert.equal(parseFinancialDate("31/02", context), null);
});
test("unknown direction is never silently treated as expense", () => {
  assert.equal(parseBotIntent("35 almoço").type, "UNKNOWN");
});
test("transaction intent parses amount, method and category", () => {
  const intent = parseBotIntent("gastei R$ 35 no pix com almoço", { now: new Date("2026-09-05T15:00:00Z"),
    categories: [{ id: "cat", name: "Alimentação", slug: "alimentacao", type: "expense" }] });
  assert.equal(intent.type, "CREATE_TRANSACTION"); if (intent.type !== "CREATE_TRANSACTION") return;
  assert.equal(intent.payload.amount_cents, 3500); assert.equal(intent.payload.payment_method, "pix");
  assert.equal(intent.payload.category_id, "cat"); assert.equal(intent.payload.type, "expense");
});
test("future intents are typed and fake harness never persists", () => {
  assert.equal(parseBotIntent("comprei 600 em 3x no Nubank").type, "CREATE_CARD_PURCHASE");
  assert.equal(parseBotIntent("comprei 600 em 99x no Nubank").type, "UNKNOWN");
  assert.equal(parseBotIntent("conta a receber 500 amanhã").type, "CREATE_BILL");
  const response = handleFakeTelegramUpdate({ telegramUserId: 1, chatId: 2, text: "gastei 35 no pix com almoço" });
  assert.equal(response.shouldPersist, false); assert.equal(response.intent.type, "CREATE_TRANSACTION");
});
