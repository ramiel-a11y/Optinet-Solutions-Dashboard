import { NextRequest, NextResponse } from 'next/server';
import { getRecord, updateRecord, deleteRecord } from '@/lib/api/crud';
import { isAdminRequest } from '@/lib/auth/requireAdmin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  const { name, id } = await params;
  try {
    const row = await getRecord(name, id);
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ row });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  const { name, id } = await params;
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const row = await updateRecord(name, id, body);
    return NextResponse.json({ row });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  const { name, id } = await params;
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }
  try {
    await deleteRecord(name, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
