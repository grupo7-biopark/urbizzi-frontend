'use client';
import { useEffect, useState } from 'react';
/** Apenas apresenta o prazo; a API continua decidindo se uma reserva pode mudar. */
export function textoTempoRestante(vencimento: string, agora: number): string {
  const fim = new Date(vencimento).getTime();
  if (!Number.isFinite(fim)) return 'Prazo não informado';
  const horas = Math.ceil((fim - agora) / 3600000);
  if (horas <= 0) return 'Prazo encerrado';
  if (horas < 24)
    return horas === 1 ? 'Vence em até 1 hora' : `Vence em até ${horas} horas`;
  const dias = Math.floor(horas / 24),
    resto = horas % 24;
  return `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}${resto ? ` e ${resto} ${resto === 1 ? 'hora' : 'horas'}` : ''}`;
}
export function TempoRestante({ vencimento }: { vencimento: string }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  return <span>{textoTempoRestante(vencimento, agora)}</span>;
}
