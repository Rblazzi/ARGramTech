import { useEffect, useState } from 'react';

// Retorna o timestamp atual e força um re-render a cada `intervalMs`.
// Usado para cronômetros ao vivo (ex.: tempo decorrido de um pedido).
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
