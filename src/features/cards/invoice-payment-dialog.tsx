"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { SubmitButton } from "@/components/submit-button";
import type { CreditCard, CreditCardInvoice } from "@/features/cards/data";
import { formatCurrencyFromCents } from "@/lib/formatters";

type InvoicePaymentDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  cards: CreditCard[];
  invoice: CreditCardInvoice;
  returnState?: {
    invoiceSearch: string;
    invoiceStatus: string;
  };
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
  returnState,
}: InvoicePaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "pix" | "debit_card" | "boleto" | "credit_card"
  >("pix");
  const [isInstallmentCredit, setIsInstallmentCredit] = useState(false);
  const [isInvoiceInstallment, setIsInvoiceInstallment] = useState(false);
  const otherCards = cards.filter((card) => card.id !== invoice.card_id);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const dialog =
    isOpen && typeof document !== "undefined" ? (
      <div
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
        role="dialog"
      >
        <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl animate-rise flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/25 sm:max-h-[calc(100dvh-3rem)]">
          <div className="shrink-0 border-b border-slate-100 p-5">
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
          </div>

          <form action={action} className="min-h-0 overflow-y-auto p-5">
            <div className="grid gap-4">
              <input name="cards_return_anchor" type="hidden" value="faturas" />
              <input
                name="cards_invoice_status"
                type="hidden"
                value={returnState?.invoiceStatus ?? "all"}
              />
              <input
                name="cards_invoice_search"
                type="hidden"
                value={returnState?.invoiceSearch ?? ""}
              />
              <input name="card_id" type="hidden" value={invoice.card_id} />
              <input
                name="invoice_month"
                type="hidden"
                value={invoice.invoice_month}
              />
              <input
                name="invoice_is_installment"
                type="hidden"
                value={isInvoiceInstallment ? "yes" : "no"}
              />

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {isInvoiceInstallment
                  ? "Como será paga a entrada?"
                  : "Como foi feito o pagamento?"}
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
                  {!isInvoiceInstallment ? (
                    <option value="credit_card">Crédito</option>
                  ) : null}
                </select>
              </label>

              <label className="flex items-start justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                <span>
                  <span className="block font-semibold text-slate-900">
                    Parcelamento de fatura
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Registra uma entrada agora e joga as parcelas nas próximas
                    faturas deste cartão.
                  </span>
                </span>
                <input
                  className="mt-1 size-4 accent-emerald-600"
                  type="checkbox"
                  checked={isInvoiceInstallment}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setIsInvoiceInstallment(checked);

                    if (checked && paymentMethod === "credit_card") {
                      setPaymentMethod("pix");
                    }
                  }}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {isInvoiceInstallment ? "Data da entrada" : "Data do pagamento"}
                <input
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="payment_date"
                  required
                  type="date"
                  defaultValue={todayInputValue()}
                />
              </label>

              {isInvoiceInstallment ? (
                <div className="grid gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                  <label className="grid gap-2 text-sm font-medium text-emerald-950">
                    Entrada
                    <input
                      className="h-11 rounded-2xl border border-emerald-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      inputMode="decimal"
                      name="invoice_down_payment_amount"
                      placeholder="Ex: 200,00"
                      required={isInvoiceInstallment}
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-emerald-950">
                      Quantidade de parcelas
                      <input
                        className="h-11 rounded-2xl border border-emerald-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        max={72}
                        min={1}
                        name="invoice_installments_count"
                        required={isInvoiceInstallment}
                        type="number"
                        defaultValue={1}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-emerald-950">
                      Valor de cada parcela
                      <input
                        className="h-11 rounded-2xl border border-emerald-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        inputMode="decimal"
                        name="invoice_installment_amount"
                        placeholder="Ex: 95,00"
                        required={isInvoiceInstallment}
                      />
                    </label>
                  </div>

                  <p className="text-xs leading-5 text-emerald-900">
                    A entrada será lançada em transações. As parcelas serão
                    adicionadas automaticamente nas próximas faturas do cartão.
                  </p>
                </div>
              ) : paymentMethod === "credit_card" ? (
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
                      <input
                        name="credit_is_installment"
                        type="hidden"
                        value="no"
                      />
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

              {!isInvoiceInstallment ? (
                <div className="grid gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                  <p>
                    Se o valor pago for maior que a fatura, o FluxoPay registra
                    a diferença como juros/taxa no pagamento.
                  </p>
                  <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <input
                      className="mt-0.5 size-4 accent-amber-600"
                      name="carry_remaining_to_next_invoice"
                      type="checkbox"
                      value="yes"
                    />
                    <span>
                      Se este for um pagamento parcial, marcar esta opção move o
                      restante para a próxima fatura como &quot;Restante do mês
                      passado&quot;. Se deixar desmarcado, o restante continua
                      nesta mesma fatura.
                    </span>
                  </label>
                </div>
              ) : null}

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
                  {isInvoiceInstallment
                    ? "Confirmar parcelamento"
                    : "Confirmar pagamento"}
                </SubmitButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        className="h-10 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        Pagar fatura
      </button>

      {dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
