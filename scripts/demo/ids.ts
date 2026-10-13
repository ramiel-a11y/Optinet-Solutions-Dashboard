import { uuidFor } from './random';

// Ids shared across generators, so a row and the rows that point at it agree.
export const serviceId = (name: string): string => uuidFor(`service:${name}`);
export const clientId = (slug: string): string => uuidFor(`client:${slug}`);
export const employeeId = (slug: string): string => uuidFor(`employee:${slug}`);
