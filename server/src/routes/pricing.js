import { Router } from 'express';

export const pricingRouter = Router();

// Formula verificada contra el ejemplo real de los PPT de VDH (Executive Search /
// Talent Acquisition / Talent Search): comp. anual = salario * pagos_por_anio * (1 + bono%),
// fee = fee% * comp. anual, cuotas 35% / 35% / 30% del fee.
export function calculateFee({ base_salary, payments_per_year, bonus_pct, fee_pct }) {
  const salary = Number(base_salary) || 0;
  const payments = Number(payments_per_year) || 13;
  const bonus = Number(bonus_pct) || 0;
  const fee = Number(fee_pct) || 0;

  const annual_salary = salary * payments;
  const bonus_amount = annual_salary * (bonus / 100);
  const annual_compensation = annual_salary + bonus_amount;
  const fee_amount = annual_compensation * (fee / 100);

  return {
    annual_salary: round2(annual_salary),
    bonus_amount: round2(bonus_amount),
    annual_compensation: round2(annual_compensation),
    fee_amount: round2(fee_amount),
    installments: [
      { label: 'Cuota 1 (35%)', amount: round2(fee_amount * 0.35) },
      { label: 'Cuota 2 (35%)', amount: round2(fee_amount * 0.35) },
      { label: 'Cuota 3 (30%)', amount: round2(fee_amount * 0.3) },
    ],
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

pricingRouter.post('/fee-calc', (req, res) => {
  const { base_salary, fee_pct } = req.body;
  if (!base_salary || !fee_pct) {
    return res.status(400).json({ error: 'base_salary y fee_pct son requeridos' });
  }
  res.json(calculateFee(req.body));
});
