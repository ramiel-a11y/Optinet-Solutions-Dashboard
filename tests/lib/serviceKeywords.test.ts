import { describe, it, expect } from 'vitest';
import { guessService } from '@/lib/derived/serviceKeywords';

describe('guessService', () => {
  it('matches the explicit service phrases', () => {
    expect(guessService('Brand Protection Services (3 new sites) 14/03/2025')).toBe('Brand Protection');
    expect(guessService('Brand Reputation retainer, November')).toBe('Brand Reputation');
    expect(guessService('Service Agent support, July')).toBe('Service Agent');
    expect(guessService('Buy links, spring batch')).toBe('Link Building');
    expect(guessService('SEO retainer, March')).toBe('SEO');
  });

  it('prefers the specific phrase over a bare abbreviation', () => {
    // contains both "SEO" and "BP" — SEO wins
    expect(guessService('SEO audit BP pack')).toBe('SEO');
    // contains both "Brand Protection" and "BR" — the full phrase wins
    expect(guessService('Brand Protection monthly, BP 700 + BR 300')).toBe('Brand Protection');
    // "Linkbuilder … Salaries" is link-building work, not generic manpower
    expect(guessService('Linkbuilder salaries, September')).toBe('Link Building');
  });

  it('falls back to abbreviations when no phrase is present', () => {
    expect(guessService('BP site - Starling Sports 28/10/2024')).toBe('Brand Protection');
  });

  it('routes salaries and recharged costs', () => {
    expect(guessService('Team Salary and office costs, July')).toBe('Manpower / Team Salary');
    expect(guessService('Jordan Salary 20/04/2024')).toBe('Manpower / Team Salary');
    expect(guessService('Office refurbishment costs, August')).toBe('Office & Equipment Recharge');
    expect(guessService('Laptop refund for new hire')).toBe('Office & Equipment Recharge');
    expect(guessService('Domains purchased for client sites')).toBe('Office & Equipment Recharge');
  });

  it('matches Web Design under both spellings', () => {
    expect(guessService('website design for a travel site')).toBe('Web Design');
    expect(guessService('Web Design for a client')).toBe('Web Design');
  });

  it('falls back to Other for anything unrecognised or blank', () => {
    expect(guessService('Miscellaneous adjustment')).toBe('Other');
    expect(guessService('')).toBe('Other');
    expect(guessService(null)).toBe('Other');
  });
});
