// Guess a service from a revenue invoice's free-text details, for automatic
// classification. Order is significant:
//   - explicit phrases beat the "BP"/"BR" abbreviations, so "SEO Services BP"
//     is SEO rather than Brand Protection;
//   - "Linkbuilder … Salaries" is link-building work, so Link Building is
//     checked before the generic salary rule.
// Everything written from this map is flagged auto_classified for human review.
const RULES: { pattern: RegExp; service: string }[] = [
  { pattern: /brand protection/i, service: 'Brand Protection' },
  { pattern: /brand reputation/i, service: 'Brand Reputation' },
  { pattern: /\bseo\b/i, service: 'SEO' },
  { pattern: /buy links|link build|linkbuilder/i, service: 'Link Building' },
  { pattern: /service agent/i, service: 'Service Agent' },
  { pattern: /salary|salaries|manpower/i, service: 'Manpower / Team Salary' },
  { pattern: /web(site)? design|landing page/i, service: 'Web Design' },
  { pattern: /\bai\b|artificial intelligence/i, service: 'AI' },
  { pattern: /office|equipment|laptop|domain/i, service: 'Office & Equipment Recharge' },
  { pattern: /\bbp\b/i, service: 'Brand Protection' },
  { pattern: /\bbr\b/i, service: 'Brand Reputation' },
];

export function guessService(details: unknown): string {
  const text = typeof details === 'string' ? details : '';
  if (!text.trim()) return 'Other';
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.service;
  }
  return 'Other';
}
