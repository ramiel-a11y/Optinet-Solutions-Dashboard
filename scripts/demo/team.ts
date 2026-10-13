import { employeeId } from './ids';
import { money, uuidFor } from './random';
import { EMPLOYEES, endDate, onTeamIn, salaryEur, startDate, type EmployeeSpec } from './staff';
import type { DemoData } from './types';

export function buildTeam(today: Date): Pick<DemoData, 'employees' | 'bonusPayments' | 'hrAgencies'> {
  const employees = EMPLOYEES.map((e): DemoData['employees'][number] => ({
    id: employeeId(e.slug),
    name: e.name,
    position: e.position,
    expertise: e.expertise,
    grossSalaryMonthlyPhp: money(e.monthlyPhp),
    grossSalaryMonthlyEur: money(salaryEur(e)),
    grossSalaryYearlyEur: money(salaryEur(e) * 13), // 13th-month pay included
    dateStarted: startDate(e, today),
    endDate: endDate(e, today),
    companyEmail: `${e.slug}@example.com`,
    next13thDate: `${today.getFullYear()}-12-15`,
  }));

  // Last December's 13th-month pay for everyone on the team then, plus two half-month
  // performance bonuses.
  const lastDecember = `${today.getFullYear() - 1}-12`;
  const bonus = (e: EmployeeSpec, type: '13th_month' | 'bonus_50pct', share: number): DemoData['bonusPayments'][number] => ({
    id: uuidFor(`bonus:${type}:${e.slug}`),
    employeeId: employeeId(e.slug),
    employeeName: e.name,
    salary: money(salaryEur(e)),
    dateStarted: startDate(e, today),
    computation: money(salaryEur(e)),
    percent: String(share),
    bonusAmount: money(salaryEur(e) * share),
    type,
  });
  const bonusPayments = [
    ...EMPLOYEES.filter((e) => onTeamIn(e, lastDecember, today)).map((e) => bonus(e, '13th_month', 1)),
    ...EMPLOYEES.slice(0, 2).map((e) => bonus(e, 'bonus_50pct', 0.5)),
  ];

  const hrAgencies: DemoData['hrAgencies'] = [
    { id: uuidFor('hr:talentbridge'), agencyUrl: 'https://talentbridge.example.com', remarks: 'Shortlists within a week', comments: 'Used for SEO hires' },
    { id: uuidFor('hr:manila-recruit'), agencyUrl: 'https://manila-recruit.example.com', remarks: 'Good for junior roles' },
    { id: uuidFor('hr:remotecrew'), agencyUrl: 'https://remotecrew.example.com', remarks: 'Contract-to-hire', comments: 'Fee: one month of salary' },
  ];
  return { employees, bonusPayments, hrAgencies };
}
