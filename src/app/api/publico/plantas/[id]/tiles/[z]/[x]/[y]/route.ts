import { z } from 'zod';
import { getTilePublico } from '@/features/links-publicos/api/tiles-publicos.server';
export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; z: string; x: string; y: string }> },
) {
  const parsed = z
    .object({
      id: z.uuid(),
      z: z.string().regex(/^\d{1,2}$/),
      x: z.string().regex(/^\d{1,8}$/),
      y: z.string().regex(/^\d{1,8}\.webp$/),
    })
    .safeParse(await params);
  if (!parsed.success) return new Response(null, { status: 404 });
  return getTilePublico(parsed.data);
}
