import { describe, it, expect } from 'vitest';
import { matchesClassification } from '@/lib/derived/classificationFilter';
import { mergeClassifications, withFilter } from '@/lib/derived/pnlMatrix';

describe('matchesClassification', () => {
  it('matches the same spelling', () => {
    expect(matchesClassification({ expenseClassification: 'Buy Links' }, 'Buy Links')).toBe(true);
  });

  it('matches across casing, mirroring the P&L merge', () => {
    expect(matchesClassification({ expenseClassification: 'Office Expenses' }, 'Office expenses')).toBe(true);
    expect(matchesClassification({ expenseClassification: 'office expenses' }, 'Office Expenses')).toBe(true);
  });

  it('ignores surrounding whitespace on both sides', () => {
    expect(matchesClassification({ expenseClassification: ' Rent ' }, 'Rent')).toBe(true);
    expect(matchesClassification({ expenseClassification: 'Rent' }, '  Rent  ')).toBe(true);
  });

  it('does not confuse two different classifications', () => {
    expect(matchesClassification({ expenseClassification: 'Team Salary' }, 'Salary')).toBe(false);
    expect(matchesClassification({ expenseClassification: 'Salary' }, 'Team Salary')).toBe(false);
  });

  it('matches null, empty and whitespace under Unclassified', () => {
    expect(matchesClassification({ expenseClassification: null }, 'Unclassified')).toBe(true);
    expect(matchesClassification({ expenseClassification: '' }, 'Unclassified')).toBe(true);
    expect(matchesClassification({ expenseClassification: '   ' }, 'Unclassified')).toBe(true);
    expect(matchesClassification({}, 'Unclassified')).toBe(true);
  });

  it('keeps a classified row out of Unclassified', () => {
    expect(matchesClassification({ expenseClassification: 'Rent' }, 'Unclassified')).toBe(false);
  });

  it('matches a row literally classified Unclassified, mirroring the P&L merge', () => {
    // mergeClassifications merges a row spelled "Unclassified" into the same line as
    // null/empty/whitespace rows (they lowercase to the same key), so the matcher has
    // to pull it back in too, or the drill-down total comes up short of the P&L cell.
    expect(matchesClassification({ expenseClassification: 'Unclassified' }, 'Unclassified')).toBe(true);
  });

  it('keeps an unclassified row out of a named classification', () => {
    expect(matchesClassification({ expenseClassification: null }, 'Rent')).toBe(false);
  });

  // The label a P&L line renders, the href built from it, and this matcher are three
  // separate pieces of code that agree only by construction — nothing before this test
  // ran the label through the actual encode/decode a click does and fed the result
  // back into matchesClassification. Without fix 2's `have === want` clause, the last
  // assertion below fails: the literal "Unclassified" row would merge into the P&L
  // line (via mergeClassifications) but then get excluded by the matcher.
  it('accepts every row that mergeClassifications folded into a line, after a real label -> href -> matcher round trip', () => {
    const rows = [
      { month: '2026-01', classification: '', rows: 2, eur: 10 },
      { month: '2026-01', classification: 'Unclassified', rows: 1, eur: 90 },
    ];
    const [line] = mergeClassifications(rows);
    expect(line.label).toBe('Unclassified');

    // The exact chain PnlMatrixTable's expenseTarget + hrefFor builds: encode the
    // label with withFilter, then decode it back the way Next.js parses searchParams.
    const href = withFilter('/money/expenses', 'classification', line.label);
    const filter = new URL(href, 'http://example.test').searchParams.get('classification')!;

    // The underlying rows mergeClassifications actually merged into this one line.
    expect(matchesClassification({ expenseClassification: null }, filter)).toBe(true);
    expect(matchesClassification({ expenseClassification: '' }, filter)).toBe(true);
    expect(matchesClassification({ expenseClassification: 'Unclassified' }, filter)).toBe(true);
  });
});
