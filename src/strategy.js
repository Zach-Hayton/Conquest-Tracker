import { adjacency, territories } from './map-data.js';
import { distributionStats } from './probability.js';

const MAX_PATH_DEPTH = 9;
const MIN_ROUTE_CHANCE = 0.001;
const MAX_EXACT_ARMIES = 120;

export function computeReachOdds(game, playerId) {
  if (!game?.territories || !playerId) return {};

  const board = game.territories;
  const results = {};
  const frontier = territories
    .filter((territory) => board[territory.id]?.ownerId === playerId && board[territory.id].troops >= 2)
    .map((territory) => ({
      currentId: territory.id,
      sourceId: territory.id,
      availableTroops: board[territory.id].troops,
      lowTroops: board[territory.id].troops,
      highTroops: board[territory.id].troops,
      chance: 1,
      lowChance: 1,
      highChance: 1,
      path: [territory.id],
      visited: new Set([territory.id]),
    }));

  const bestStateChance = new Map();

  while (frontier.length) {
    frontier.sort((a, b) => b.chance - a.chance);
    const state = frontier.shift();
    const depth = state.path.length - 1;
    if (depth >= MAX_PATH_DEPTH || state.highChance < MIN_ROUTE_CHANCE || state.availableTroops < 2) continue;

    for (const neighborId of adjacency[state.currentId] ?? []) {
      if (state.visited.has(neighborId)) continue;
      const neighbor = board[neighborId];
      if (!neighbor || neighbor.ownerId === playerId) continue;

      const defenders = Math.max(1, neighbor.troops);
      const battle = evaluateBattle(state.availableTroops - 1, defenders);
      const lowBattle = evaluateAvailableStack(state.lowTroops, defenders);
      const highBattle = evaluateAvailableStack(state.highTroops, defenders);
      const stats = battle.stats;
      const routeChance = state.chance * stats.winChance;
      const lowChance = state.lowChance * lowBattle.stats.winChance;
      const highChance = state.highChance * highBattle.stats.winChance;
      if (routeChance < MIN_ROUTE_CHANCE) continue;

      const expectedRemaining = Math.max(
        1,
        Math.floor(stats.expectedAttackersRemaining * battle.scale),
      );
      const lowRemaining = Math.max(
        1,
        Math.floor(lowBattle.stats.lowAttackersRemaining * lowBattle.scale),
      );
      const highRemaining = Math.max(
        1,
        Math.ceil(highBattle.stats.highAttackersRemaining * highBattle.scale),
      );
      const path = [...state.path, neighborId];
      const candidate = {
        chance: routeChance,
        low: Math.min(lowChance, routeChance),
        high: Math.max(highChance, routeChance),
        path,
        sourceId: state.sourceId,
        targetId: neighborId,
        battles: path.length - 1,
        expectedTroops: expectedRemaining,
        normalizedLargeStack: battle.scale > 1,
      };

      if (!results[neighborId] || candidate.chance > results[neighborId].chance) {
        results[neighborId] = candidate;
      }

      const stateKey = `${neighborId}:${expectedRemaining}:${path.length}`;
      if ((bestStateChance.get(stateKey) ?? 0) >= routeChance) continue;
      bestStateChance.set(stateKey, routeChance);
      frontier.push({
        currentId: neighborId,
        sourceId: state.sourceId,
        availableTroops: expectedRemaining,
        lowTroops: lowRemaining,
        highTroops: highRemaining,
        chance: routeChance,
        lowChance,
        highChance,
        path,
        visited: new Set([...state.visited, neighborId]),
      });
    }
  }

  return results;
}

function evaluateBattle(attackingArmies, defendingArmies) {
  const largestStack = Math.max(attackingArmies, defendingArmies);
  if (largestStack <= MAX_EXACT_ARMIES) {
    return {
      scale: 1,
      stats: distributionStats(attackingArmies, defendingArmies, 'trueRandom'),
    };
  }

  const scale = largestStack / MAX_EXACT_ARMIES;
  return {
    scale,
    stats: distributionStats(
      Math.max(1, Math.round(attackingArmies / scale)),
      Math.max(1, Math.round(defendingArmies / scale)),
      'trueRandom',
    ),
  };
}

function evaluateAvailableStack(totalTroops, defendingArmies) {
  if (totalTroops <= 1) {
    return {
      scale: 1,
      stats: {
        winChance: 0,
        lowAttackersRemaining: 0,
        highAttackersRemaining: 0,
      },
    };
  }
  return evaluateBattle(totalTroops - 1, defendingArmies);
}
