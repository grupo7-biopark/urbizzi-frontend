import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';
import { uploadFormData, type UploadOptions } from '@/shared/api/upload';

export type Planta = components['schemas']['PlantaDto'];
export type StatusPlanta = components['schemas']['StatusPlanta'];
export type ListPlantasQuery = NonNullable<
  paths['/v1/plantas']['get']['parameters']['query']
>;

export type EnviarPlanta = {
  nome: string;
  arquivos: File[];
  copiarMarcadores: boolean;
};

export function listPlantas(query: ListPlantasQuery) {
  return unwrap(api.GET('/v1/plantas', { params: { query } }));
}

export function ativarPlanta(id: string) {
  return unwrap(
    api.POST('/v1/plantas/{id}/ativar', { params: { path: { id } } }),
  );
}

export function enviarPlanta(
  { nome, arquivos, copiarMarcadores }: EnviarPlanta,
  options?: UploadOptions,
) {
  const body = new FormData();

  body.append('nome', nome);
  if (copiarMarcadores) {
    body.append('copiarMarcadores', 'true');
  }
  for (const arquivo of arquivos) {
    body.append('arquivos', arquivo);
  }

  return uploadFormData<Planta>('/v1/plantas', body, options);
}
