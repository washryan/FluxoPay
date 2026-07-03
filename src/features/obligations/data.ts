import { syncOverdueStatuses } from "@/features/overdue/sync";
import { createClient } from "@/lib/supabase/server";

export type FinancialObligationStatus = "pending" | "overdue";
export type FinancialObligationType = "bill" | "credit_card_installment";

export type FinancialObligation = {
  id: string;
  reference_id: string;
  user_id: string;
  obligation_type: FinancialObligationType;
  reference_table: "bills" | "installments";
  title: string;
  amount_cents: number;
  due_date: string;
  status: FinancialObligationStatus;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  credit_card_id: string | null;
  card_name: string | null;
  purchase_id: string | null;
  installment_number: number | null;
  installments_count: number | null;
  created_at: string;
};

export type FinancialObligationGroups = {
  creditPending: FinancialObligation[];
  creditOverdue: FinancialObligation[];
  billPending: FinancialObligation[];
  billOverdue: FinancialObligation[];
};

export type FinancialObligationTotals = {
  allCents: number;
  pendingCents: number;
  overdueCents: number;
  creditCents: number;
  billCents: number;
};

function sumAmount(obligations: FinancialObligation[]) {
  return obligations.reduce(
    (total, obligation) => total + obligation.amount_cents,
    0,
  );
}

function groupObligations(
  obligations: FinancialObligation[],
): FinancialObligationGroups {
  return {
    billOverdue: obligations.filter(
      (obligation) =>
        obligation.obligation_type === "bill" &&
        obligation.status === "overdue",
    ),
    billPending: obligations.filter(
      (obligation) =>
        obligation.obligation_type === "bill" &&
        obligation.status === "pending",
    ),
    creditOverdue: obligations.filter(
      (obligation) =>
        obligation.obligation_type === "credit_card_installment" &&
        obligation.status === "overdue",
    ),
    creditPending: obligations.filter(
      (obligation) =>
        obligation.obligation_type === "credit_card_installment" &&
        obligation.status === "pending",
    ),
  };
}

export async function getFinancialObligations() {
  await syncOverdueStatuses();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_obligations")
    .select("*")
    .order("due_date", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return {
      error: error.message,
      groups: {
        billOverdue: [],
        billPending: [],
        creditOverdue: [],
        creditPending: [],
      } satisfies FinancialObligationGroups,
      obligations: [] as FinancialObligation[],
      totals: {
        allCents: 0,
        billCents: 0,
        creditCents: 0,
        overdueCents: 0,
        pendingCents: 0,
      } satisfies FinancialObligationTotals,
    };
  }

  const obligations = (data ?? []) as FinancialObligation[];
  const groups = groupObligations(obligations);

  return {
    error: null,
    groups,
    obligations,
    totals: {
      allCents: sumAmount(obligations),
      billCents: sumAmount([...groups.billPending, ...groups.billOverdue]),
      creditCents: sumAmount([
        ...groups.creditPending,
        ...groups.creditOverdue,
      ]),
      overdueCents: sumAmount([
        ...groups.billOverdue,
        ...groups.creditOverdue,
      ]),
      pendingCents: sumAmount([
        ...groups.billPending,
        ...groups.creditPending,
      ]),
    },
  };
}
