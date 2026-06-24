const roundCache = new Map();
const battleCache = new Map();

function rollCombinations(diceCount) {
  const results = [];
  function walk(prefix) {
    if (prefix.length === diceCount) {
      results.push([...prefix].sort((a, b) => b - a));
      return;
    }
    for (let value = 1; value <= 6; value += 1) {
      prefix.push(value);
      walk(prefix);
      prefix.pop();
    }
  }
  walk([]);
  return results;
}

const combos = {
  1: rollCombinations(1),
  2: rollCombinations(2),
  3: rollCombinations(3),
};

export function roundOutcomeDistribution(attackerDice, defenderDice) {
  const cacheKey = `${attackerDice}v${defenderDice}`;
  if (roundCache.has(cacheKey)) return roundCache.get(cacheKey);

  const counts = new Map();
  const attackerRolls = combos[attackerDice];
  const defenderRolls = combos[defenderDice];
  const total = attackerRolls.length * defenderRolls.length;

  for (const attack of attackerRolls) {
    for (const defend of defenderRolls) {
      let attackerLoss = 0;
      let defenderLoss = 0;
      const comparedDice = Math.min(attackerDice, defenderDice);
      for (let i = 0; i < comparedDice; i += 1) {
        if (attack[i] > defend[i]) defenderLoss += 1;
        else attackerLoss += 1;
      }
      const outcomeKey = `${attackerLoss}:${defenderLoss}`;
      counts.set(outcomeKey, (counts.get(outcomeKey) || 0) + 1);
    }
  }

  const distribution = [...counts.entries()].map(([key, count]) => {
    const [attackerLoss, defenderLoss] = key.split(':').map(Number);
    return { attackerLoss, defenderLoss, probability: count / total };
  });
  roundCache.set(cacheKey, distribution);
  return distribution;
}

export function trueRandomBattleDistribution(attackingArmies, defendingArmies) {
  const attackers = Math.max(0, Math.floor(attackingArmies));
  const defenders = Math.max(0, Math.floor(defendingArmies));
  const cacheKey = `${attackers}:${defenders}`;
  if (battleCache.has(cacheKey)) return battleCache.get(cacheKey);

  if (defenders === 0) {
    const result = { attackerWin: { [attackers]: 1 }, defenderWin: {} };
    battleCache.set(cacheKey, result);
    return result;
  }
  if (attackers === 0) {
    const result = { attackerWin: {}, defenderWin: { [defenders]: 1 } };
    battleCache.set(cacheKey, result);
    return result;
  }

  const attackerDice = Math.min(3, attackers);
  const defenderDice = Math.min(2, defenders);
  const roundOutcomes = roundOutcomeDistribution(attackerDice, defenderDice);
  const attackerWin = {};
  const defenderWin = {};

  for (const round of roundOutcomes) {
    const next = trueRandomBattleDistribution(
      attackers - round.attackerLoss,
      defenders - round.defenderLoss,
    );
    for (const [remaining, probability] of Object.entries(next.attackerWin)) {
      attackerWin[remaining] = (attackerWin[remaining] || 0) + probability * round.probability;
    }
    for (const [remaining, probability] of Object.entries(next.defenderWin)) {
      defenderWin[remaining] = (defenderWin[remaining] || 0) + probability * round.probability;
    }
  }

  const result = { attackerWin, defenderWin };
  battleCache.set(cacheKey, result);
  return result;
}

export function winChanceFromDistribution(distribution) {
  return Object.values(distribution.attackerWin).reduce((sum, value) => sum + value, 0);
}

export function expectedAttackersRemainingOnWin(distribution) {
  const winChance = winChanceFromDistribution(distribution);
  if (winChance <= 0) return 0;
  let weighted = 0;
  for (const [remaining, probability] of Object.entries(distribution.attackerWin)) {
    weighted += Number(remaining) * probability;
  }
  return weighted / winChance;
}

export function expectedDefendersRemainingOnLoss(distribution) {
  const lossChance = Object.values(distribution.defenderWin).reduce((sum, value) => sum + value, 0);
  if (lossChance <= 0) return 0;
  let weighted = 0;
  for (const [remaining, probability] of Object.entries(distribution.defenderWin)) {
    weighted += Number(remaining) * probability;
  }
  return weighted / lossChance;
}

export function attackerSurvivorQuantileOnWin(distribution, quantile) {
  return conditionalQuantile(distribution.attackerWin, quantile);
}

export function distributionStats(attackingArmies, defendingArmies, mode = 'balancedEstimate') {
  const distribution = trueRandomBattleDistribution(attackingArmies, defendingArmies);
  const trueRandomWinChance = winChanceFromDistribution(distribution);
  const expectedAttackers = expectedAttackersRemainingOnWin(distribution);
  const expectedDefenders = expectedDefendersRemainingOnLoss(distribution);
  const balancedWinChance = mode === 'trueRandom'
    ? trueRandomWinChance
    : balancedBlitzEstimate(trueRandomWinChance, attackingArmies, defendingArmies);

  return {
    mode,
    trueRandomWinChance,
    balancedWinChance,
    winChance: balancedWinChance,
    expectedAttackersRemaining: expectedAttackers,
    expectedDefendersRemaining: expectedDefenders,
    lowAttackersRemaining: attackerSurvivorQuantileOnWin(distribution, 0.2),
    highAttackersRemaining: attackerSurvivorQuantileOnWin(distribution, 0.8),
    distribution,
  };
}

export function balancedBlitzEstimate(trueRandomWinChance, attackingArmies, defendingArmies) {
  const p = clamp(trueRandomWinChance, 0, 1);
  if (p === 0 || p === 1) return p;

  const ratio = attackingArmies / Math.max(1, defendingArmies);
  const pressure = Math.min(0.22, Math.abs(ratio - 1) * 0.045 + 0.075);

  if (p >= 0.5) {
    return clamp(1 - Math.pow(1 - p, 1 + pressure), 0, 1);
  }
  return clamp(Math.pow(p, 1 + pressure), 0, 1);
}

export function formatPercent(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function conditionalQuantile(outcomes, quantile) {
  const entries = Object.entries(outcomes)
    .map(([remaining, probability]) => ({ remaining: Number(remaining), probability }))
    .sort((a, b) => a.remaining - b.remaining);
  const total = entries.reduce((sum, entry) => sum + entry.probability, 0);
  if (total <= 0) return 0;
  const target = clamp(quantile, 0, 1) * total;
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.probability;
    if (cumulative >= target) return entry.remaining;
  }
  return entries.at(-1)?.remaining ?? 0;
}

export function clearProbabilityCaches() {
  roundCache.clear();
  battleCache.clear();
}
