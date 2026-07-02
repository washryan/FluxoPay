"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import type { CreditCard, CreditCardInvoice } from "@/features/cards/data";
import { formatCurrencyFromCents } from "@/lib/formatters";

type InvoicePaymentDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  cards: CreditCard[];
  invoice: CreditCardInvoice;
};

function formatAmountInput(valueInCents: number) {
  return (valueInCents / 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function todayInputValue() {
  const date = new Date();
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function InvoicePaymentDialog({
  action,
  cards,
  invoice,
}: InvoicePaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "pix" | "debit_card" | "boleto" | "credit_card"
  >("pix");
  const [isInstallmentCredit, setIsInstallmentCredit] = useState(false);
  const otherCards = cards.filter((card) => card.id !== invoice.card_id);

  return (
    <>
      <button
        className="h-10 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        Pagar fatura
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-xl animate-rise rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Pagamento de fatura
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  {invoice.card_name} · {invoice.invoice_month}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Valor em aberto:{" "}
                  <strong className="text-slate-900">
                    {formatCurrencyFromCents(invoice.open_cents)}
                  </strong>
                </p>
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                Fechar
              </button>
            </div>

            <form action={action} className="mt-5 grid gap-4">
              <input name="card_id" type="hidden" value={invoice.card_id} />
              <input
                name="invoice_month"
                type="hidden"
                value={invoice.invoice_month}
              />

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Como foi feito o pagamento?
                <select
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="payment_method"
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value as
                        | "pix"
                        | "debit_card"
                        | "boleto"
                        | "credit_card",
                    )
                  }
                >
                  <option value="pix">Pix</option>
                  <option value="debit_card">Débito</option>
                  <option value="boleto">Boleto</option>
                  <option value="credit_card">Crédito</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Data do pagamento
                <input
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="payment_date"
                  required
                  type="date"
                  defaultValue={todayInputValue()}
                />
              </label>

              {paymentMethod === "credit_card" ? (
                <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Qual cartão pagou esta fatura?
                    <select
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      disabled={otherCards.length === 0}
                      name="payment_credit_card_id"
                      required={paymentMethod === "credit_card"}
                      defaultValue={otherCards[0]?.id ?? ""}
                    >
                      {otherCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {otherCards.length === 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Cadastre outro cartão para pagar uma fatura no crédito.
                    </div>
                  ) : null}

                  <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700">
                    Foi parcelado?
                    <input
                      className="size-4 accent-emerald-600"
                      name="credit_is_installment"
                      type="checkbox"
                      value="yes"
                      checked={isInstallmentCredit}
                      onChange={(event) =>
                        setIsInstallmentCredit(event.target.checked)
                      }
                    />
                  </label>

                  {!isInstallmentCredit ? (
                    <>
                      <input name="credit_is_installment" type="hidden" value="no" />
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Valor pago
                        <input
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          inputMode="decimal"
                          name="paid_amount"
                          required
                          defaultValue={formatAmountInput(invoice.open_cents)}
                        />
                      </label>
                    </>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Quantidade de parcelas
                        <input
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          max={72}
                          min={1}
                          name="credit_installments_count"
                          required
                          type="number"
                          defaultValue={1}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Valor de cada parcela
                        <input
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          inputMode="decimal"
                          name="credit_installment_amount"
                          required
                          defaultValue={formatAmountInput(invoice.open_cents)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Valor pago
                  <input
                    className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    inputMode="decimal"
                    name="paid_amount"
                    required
                    defaultValue={formatAmountInput(invoice.open_cents)}
                  />
                </label>
              )}

              <div className="grid gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                <p>
                  Se o valor pago for maior que a fatura, o FluxoPay registra a
                  diferença como juros/taxa no pagamento.
                </p>
                <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <input
                    className="mt-0.5 size-4 accent-amber-600"
                    name="carry_remaining_to_next_invoice"
                    type="checkbox"
                    value="yes"
                  />
                  <span>
                    Se este for um pagamento parcial, adicionar o restante na
                    próxima fatura como &quot;Restante do mês passado&quot;.
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <SubmitButton
                  className="h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  disabled={
                    paymentMethod === "credit_card" && otherCards.length === 0
                  }
                  pendingLabel="Pagando fatura..."
                >
                  Confirmar pagamento
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
