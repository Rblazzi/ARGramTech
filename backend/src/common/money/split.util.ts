// Divide um valor (em reais) entre N pesos, sem perder nem sobrar
// centavo algum — o método do "maior resto": cada parte recebe o piso
// proporcional e os centavos que sobram vão para quem tem a maior
// fração decimal (ou para os primeiros, em caso de pesos iguais/zerados).
// Ex.: splitByWeights(100, [1, 1, 1]) -> [33.34, 33.33, 33.33]
export function splitByWeights(total: number, weights: number[]): number[] {
  const totalCents = Math.round(total * 100);
  const sumWeights = weights.reduce((a, b) => a + b, 0);

  const effectiveWeights = sumWeights > 0 ? weights : weights.map(() => 1);
  const effectiveSum = sumWeights > 0 ? sumWeights : weights.length;

  const raw = effectiveWeights.map((w) => (totalCents * w) / effectiveSum);
  const floors = raw.map((v) => Math.floor(v));
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);

  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac);

  const cents = [...floors];
  for (const { i } of order) {
    if (remainder <= 0) break;
    cents[i] += 1;
    remainder -= 1;
  }

  return cents.map((c) => c / 100);
}
