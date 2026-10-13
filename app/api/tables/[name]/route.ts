import { NextRequest, NextResponse } from 'next/server';
import { listRecords, createRecord } from '@/lib/api/crud';
import { isAdminRequest } from '@/lib/auth/requireAdmin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const url = new URL(req.url);
  const search = url.searchParams.get('search') ?? undefined;
  const sortField = url.searchParams.get('sort') ?? undefined;
  const sortDir = (url.searchParams.get('dir') as 'asc' | 'desc') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? '500');

  // searchFields & filters are passed via JSON header (lightweight, no parse logic)
  const searchFieldsHeader = req.headers.get('x-search-fields');
  const searchFields = searchFieldsHeader ? JSON.parse(searchFieldsHeader) : undefined;
  const filtersHeader = req.headers.get('x-filters');
  const filters = filtersHeader ? JSON.parse(filtersHeader) : undefined;

  try {
    const rows = await listRecords(name, { search, searchFields, filters, sortField, sortDir, limit });
    return NextResponse.json({ rows });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const row = await createRecord(name, body);
    return NextResponse.json({ row }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
