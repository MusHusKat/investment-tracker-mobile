import type { Property, YearlySnapshot, AggregatedPortfolio } from "./types";
import { calculateKPIs } from "./calculations";

export function aggregatePortfolio(
  properties: Property[],
  snapshots: YearlySnapshot[]
): AggregatedPortfolio {
  let totalValue = 0;
  let totalLoanBalance = 0;
  let totalRent = 0;
  let totalCashflow = 0;
  let yieldSum = 0;
  let netYieldSum = 0;
  let yieldCount = 0;

  for (const prop of properties) {
    const snap = snapshots.find((s) => s.propertyId === prop.id);
    totalValue += prop.purchasePrice;
    if (snap) {
      const kpis = calculateKPIs(prop, snap);
      totalLoanBalance += kpis.loanBalance;
      totalRent += kpis.rentIncome;
      totalCashflow += kpis.annualCashflow;
      yieldSum += kpis.grossYield;
      netYieldSum += kpis.netYield;
      yieldCount++;
    }
  }

  const totalEquity = totalValue - totalLoanBalance;
  const avgLvr = totalValue > 0 ? totalLoanBalance / totalValue : 0;
  const avgGrossYield = yieldCount > 0 ? yieldSum / yieldCount : 0;
  const avgNetYield = yieldCount > 0 ? netYieldSum / yieldCount : 0;

  return {
    totalValue,
    totalEquity,
    totalLoanBalance,
    avgLvr,
    totalRent,
    totalCashflow,
    avgGrossYield,
    avgNetYield,
  };
}
