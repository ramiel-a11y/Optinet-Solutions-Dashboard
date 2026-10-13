import { currentMonth, dayOf, monthDiff, shiftMonth } from './calendar';
import { hash32 } from './random';

export type EmployeeSpec = {
  slug: string;
  name: string;
  position: string;
  expertise: string;
  monthlyPhp: number;
  startedMonthsAgo: number;
  leftMonthsAgo?: number;
};

// An invented team for the Manila office.
export const EMPLOYEES: EmployeeSpec[] = [
  { slug: 'velarde', name: 'Jonah Velarde', position: 'Team Lead', expertise: 'SEO strategy', monthlyPhp: 95000, startedMonthsAgo: 40 },
  { slug: 'aranza', name: 'Mika Aranza', position: 'SEO Specialist', expertise: 'Technical SEO', monthlyPhp: 62000, startedMonthsAgo: 30 },
  { slug: 'delmonte', name: 'Trisha Delmonte', position: 'Link Builder', expertise: 'Outreach', monthlyPhp: 48000, startedMonthsAgo: 26 },
  { slug: 'benitez', name: 'Carlo Benitez', position: 'Web Developer', expertise: 'Next.js', monthlyPhp: 78000, startedMonthsAgo: 24 },
  { slug: 'alcantar', name: 'Rhea Alcantar', position: 'Brand Protection Analyst', expertise: 'Takedowns', monthlyPhp: 52000, startedMonthsAgo: 20 },
  { slug: 'paredes', name: 'Nico Paredes', position: 'Content Writer', expertise: 'iGaming content', monthlyPhp: 42000, startedMonthsAgo: 18 },
  { slug: 'villafuerte', name: 'Bea Villafuerte', position: 'Graphic Designer', expertise: 'Brand assets', monthlyPhp: 45000, startedMonthsAgo: 15 },
  { slug: 'sarmiento', name: 'Lito Sarmiento', position: 'Link Builder', expertise: 'Guest posts', monthlyPhp: 46000, startedMonthsAgo: 12, leftMonthsAgo: 3 },
  { slug: 'quiambao', name: 'Ana Quiambao', position: 'Virtual Assistant', expertise: 'Client admin', monthlyPhp: 35000, startedMonthsAgo: 9 },
  { slug: 'navarro', name: 'Paolo Navarro', position: 'SEO Specialist', expertise: 'Local SEO', monthlyPhp: 58000, startedMonthsAgo: 5 },
];

// Salaries are quoted in PHP; the EUR figure uses one fixed rate, so a person's salary
// does not wobble from month to month.
export const PHP_TO_EUR = 0.0162;
export const salaryEur = (e: EmployeeSpec): number => Math.round(e.monthlyPhp * PHP_TO_EUR);

export function startDate(e: EmployeeSpec, today: Date): string {
  const month = shiftMonth(currentMonth(today), -e.startedMonthsAgo);
  return dayOf(month, 1 + (hash32(e.slug) % 20), today) ?? `${month}-01`;
}

export function endDate(e: EmployeeSpec, today: Date): string | null {
  if (e.leftMonthsAgo === undefined) return null;
  const month = shiftMonth(currentMonth(today), -e.leftMonthsAgo);
  return dayOf(month, 15, today) ?? `${month}-15`;
}

// On the team for at least part of the given month.
export function onTeamIn(e: EmployeeSpec, month: string, today: Date): boolean {
  const ago = monthDiff(month, currentMonth(today));
  return ago <= e.startedMonthsAgo && (e.leftMonthsAgo === undefined || ago >= e.leftMonthsAgo);
}
