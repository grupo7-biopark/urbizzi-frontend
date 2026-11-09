const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});
export function formatDataHora(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? DATA_HORA.format(date)
    : 'Data não informada';
}
