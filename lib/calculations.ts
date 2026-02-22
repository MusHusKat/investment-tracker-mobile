import type { Property, YearlySnapshot, PropertyKPIs } from "./types";

export function calculateKPIs(property: Property, snapshot: YearlySnapshot): PropertyKPIs {
  const rentIncome = snapshot.rentIncome ?? 0;
  const otherIncome = snapshot.otherIncome ?? 0;
  const grossIncome = rentIncome + otherIncome;

  const totalOpex =
    (snapshot.maintenance ?? 0) +
    (snapshot.insurance ?? 0) +
    (snapshot.councilRates ?? 0) +
    (snapshot.strataFees ?? 0) +
    (snapshot.propertyMgmtFees ?? 0) +
    (snapshot.utilities ?? 0) +
    (snapshot.otherExpenses ?? 0);

  const interestPaid = snapshot.interestPaid ?? 0;
  const principalPaid = snapshot.principalPaid ?? 0;
  const capex = snapshot.capex ?? 0;

  const totalExpenses = totalOpex + interestPaid;
  const totalExpensesWithPrincipal = totalExpenses + principalPaid;
  const noi = grossIncome - totalOpex;
  const cashflowPrePrincipal = noi - interestPaid;
  const annualCashflow = cashflowPrePrincipal - principalPaid;

  const referenceValue = property.purchasePrice;
  const grossYield = referenceValue > 0 ? rentIncome / referenceValue : 0;
  const netYield = referenceValue > 0 ? noi / referenceValue : 0;

  const loanBalance = snapshot.loanBalance ?? 0;
  const equity = referenceValue - loanBalance;
  const lvr = referenceValue > 0 ? loanBalance / referenceValue : 0;

  return {
    grossIncome,
    rentIncome,
    otherIncome,
    totalOpex,
    totalExpenses,
    totalExpensesWithPrincipal,
    noi,
    cashflowPrePrincipal,
    annualCashflow,
    grossYield,
    netYield,
    lvr,
    equity,
    loanBalance,
    referenceValue,
    capex,
  };
}
