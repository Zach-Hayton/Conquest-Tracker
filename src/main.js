import {
  adjacency,
  bridges,
  continents,
  continentById,
  edgeKey,
  territories,
  territoryById,
  validateAdjacency,
} from './map-data.js';
import { distributionStats, formatPercent } from './probability.js';
import { computeReachOdds } from './strategy.js';

const MAP_SPREAD = 1.25;
const MAP_WIDTH = Math.round(1320 * MAP_SPREAD);
const MAP_HEIGHT = Math.round(760 * MAP_SPREAD);
const STORAGE_KEY = 'conquest-game-tracker-v3';
const LEGACY_STORAGE_KEY = 'conquest-setup-tracker-v2';
const DEFAULT_COLORS = ['#2dd4bf', '#fb7185', '#60a5fa', '#fbbf24', '#a78bfa', '#f97316'];
const PHASES = {
  SETUP: 'setup',
  CLAIM: 'claim',
  STACK: 'stack',
  READY: 'ready',
  REINFORCE: 'reinforce',
  ATTACK: 'attack',
  FORTIFY: 'fortify',
  GAME_OVER: 'gameOver',
};

const elements = {
  mapWrap: document.querySelector('#map-wrap'),
  continentLegend: document.querySelector('#continent-legend'),
  setupCard: document.querySelector('#setup-card'),
  progressCard: document.querySelector('#progress-card'),
  actionCard: document.querySelector('#action-card'),
  actionKicker: document.querySelector('#action-kicker'),
  actionTitle: document.querySelector('#action-title'),
  actionPanel: document.querySelector('#action-panel'),
  undoAction: document.querySelector('#undo-action'),
  historyCard: document.querySelector('#history-card'),
  gameHistory: document.querySelector('#game-history'),
  playerCount: document.querySelector('#player-count'),
  setupCountLabel: document.querySelector('#setup-count-label'),
  startingTroops: document.querySelector('#starting-troops'),
  troopHelp: document.querySelector('#troop-help'),
  playerEditor: document.querySelector('#player-editor'),
  startSetup: document.querySelector('#start-setup'),
  resetGame: document.querySelector('#reset-game'),
  toggleOdds: document.querySelector('#toggle-odds'),
  statusPill: document.querySelector('#status-pill'),
  phaseTitle: document.querySelector('#phase-title'),
  selectionHint: document.querySelector('#selection-hint'),
  activePlayerBanner: document.querySelector('#active-player-banner'),
  territoryProgress: document.querySelector('#territory-progress'),
  playerProgress: document.querySelector('#player-progress'),
  territoryDetails: document.querySelector('#territory-details'),
  continentList: document.querySelector('#continent-list'),
  toast: document.querySelector('#toast'),
};

let game = loadGame() ?? createInitialGame();
let selectedTerritoryId = null;
let selection = { sourceId: null, targetId: null };
let showReachOdds = false;
let reachOdds = {};
let reachOddsCache = { key: null, value: {} };
let mapZoomed = false;
let toastTimer = null;

init();

function init() {
  const mapErrors = validateAdjacency();
  if (mapErrors.length) console.error('Invalid map adjacency:', mapErrors);
  wireEvents();
  syncSetupControls();
  render();
}

function wireEvents() {
  elements.playerCount.addEventListener('change', () => {
    resizeSetupPlayers(Number(elements.playerCount.value));
    syncTroopMinimum();
    renderPlayerEditor();
  });
  elements.startingTroops.addEventListener('input', () => {
    game.startingTroops = Number(elements.startingTroops.value) || 35;
  });
  elements.playerEditor.addEventListener('input', handlePlayerEditorInput);
  elements.playerEditor.addEventListener('click', handlePlayerEditorClick);
  elements.startSetup.addEventListener('click', startDraft);
  elements.resetGame.addEventListener('click', resetGame);
  elements.toggleOdds.addEventListener('click', toggleReachOdds);
  elements.undoAction.addEventListener('click', undoLastAction);
  elements.actionPanel.addEventListener('click', handleActionPanelClick);
  elements.actionPanel.addEventListener('change', handleActionPanelChange);
}

function createInitialGame() {
  return {
    version: 3,
    phase: PHASES.SETUP,
    players: createDefaultPlayers(3),
    activePlayerIndex: 0,
    startingTroops: 35,
    reinforcementPool: 0,
    turnNumber: 0,
    winnerId: null,
    territories: createEmptyBoard(),
    history: [],
    undoStack: [],
    updatedAt: null,
  };
}

function createDefaultPlayers(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
    color: DEFAULT_COLORS[index],
    placedTroops: 0,
    eliminated: false,
  }));
}

function createEmptyBoard() {
  return Object.fromEntries(territories.map(({ id }) => [id, { ownerId: null, troops: 0 }]));
}

function resizeSetupPlayers(count) {
  const existing = game.players.slice(0, count);
  while (existing.length < count) {
    const index = existing.length;
    existing.push({
      id: `player-${crypto.randomUUID()}`,
      name: `Player ${index + 1}`,
      color: DEFAULT_COLORS[index],
      placedTroops: 0,
      eliminated: false,
    });
  }
  game.players = existing;
  elements.setupCountLabel.textContent = `${count} players`;
}

function syncSetupControls() {
  if (game.phase !== PHASES.SETUP) return;
  elements.playerCount.value = String(game.players.length);
  elements.startingTroops.value = String(game.startingTroops);
  elements.setupCountLabel.textContent = `${game.players.length} players`;
  syncTroopMinimum();
  renderPlayerEditor();
}

function syncTroopMinimum() {
  const count = Number(elements.playerCount.value);
  const minimum = Math.ceil(territories.length / count);
  elements.startingTroops.min = String(minimum);
  elements.troopHelp.textContent = `Minimum ${minimum} troops each with ${count} players so every territory can be claimed.`;
}

function renderPlayerEditor() {
  elements.playerEditor.innerHTML = game.players.map((player, index) => `
    <div class="player-row" data-player-id="${player.id}">
      <div class="order-number" aria-hidden="true">${index + 1}</div>
      <input aria-label="Player ${index + 1} name" data-field="name" maxlength="24" value="${escapeHtml(player.name)}" />
      <label class="color-picker" title="Choose ${escapeHtml(player.name)} color">
        <span class="sr-only">Player ${index + 1} color</span>
        <input data-field="color" type="color" value="${player.color}" />
      </label>
      <div class="order-actions">
        <button class="icon-button" type="button" data-move="up" aria-label="Move ${escapeHtml(player.name)} earlier" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-button" type="button" data-move="down" aria-label="Move ${escapeHtml(player.name)} later" ${index === game.players.length - 1 ? 'disabled' : ''}>↓</button>
      </div>
    </div>
  `).join('');
}

function handlePlayerEditorInput(event) {
  const row = event.target.closest('[data-player-id]');
  const field = event.target.dataset.field;
  if (!row || !field) return;
  const player = game.players.find(({ id }) => id === row.dataset.playerId);
  if (player) player[field] = event.target.value;
}

function handlePlayerEditorClick(event) {
  const button = event.target.closest('[data-move]');
  const row = event.target.closest('[data-player-id]');
  if (!button || !row) return;
  const index = game.players.findIndex(({ id }) => id === row.dataset.playerId);
  const targetIndex = button.dataset.move === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= game.players.length) return;
  [game.players[index], game.players[targetIndex]] = [game.players[targetIndex], game.players[index]];
  renderPlayerEditor();
}

function startDraft() {
  const minimumTroops = Math.ceil(territories.length / game.players.length);
  const startingTroops = Number(elements.startingTroops.value);
  const names = game.players.map((player) => player.name.trim());
  const colors = game.players.map((player) => player.color.toLowerCase());

  if (names.some((name) => !name)) return showToast('Every player needs a name.', 'error');
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    return showToast('Player names must be unique.', 'error');
  }
  if (new Set(colors).size !== colors.length) return showToast('Choose a different color for each player.', 'error');
  if (!Number.isInteger(startingTroops) || startingTroops < minimumTroops) {
    return showToast(`Use at least ${minimumTroops} starting troops per player.`, 'error');
  }

  game = {
    ...createInitialGame(),
    players: game.players.map((player) => ({
      ...player,
      name: player.name.trim(),
      placedTroops: 0,
      eliminated: false,
    })),
    startingTroops,
    phase: PHASES.CLAIM,
  };
  saveGame();
  render();
  showToast(`${activePlayer().name} starts the territory draft.`, 'success');
}

function onTerritoryClick(territoryId) {
  selectedTerritoryId = territoryId;
  if (game.phase === PHASES.CLAIM) claimTerritory(territoryId);
  else if (game.phase === PHASES.STACK) stackTroop(territoryId);
  else if (game.phase === PHASES.REINFORCE) reinforceTerritory(territoryId);
  else if (game.phase === PHASES.ATTACK) selectAttackTerritory(territoryId);
  else if (game.phase === PHASES.FORTIFY) selectFortifyTerritory(territoryId);
  render();
}

function claimTerritory(territoryId) {
  const territoryState = game.territories[territoryId];
  const player = activePlayer();
  if (territoryState.ownerId) return showToast(`${territoryById(territoryId).name} is already claimed.`, 'error');
  pushUndo();
  territoryState.ownerId = player.id;
  territoryState.troops = 1;
  player.placedTroops += 1;
  addHistory(`${player.name} claimed ${territoryById(territoryId).name}.`);
  if (claimedCount() === territories.length) {
    game.phase = PHASES.STACK;
    advanceToNextEligiblePlayer();
    showToast(`All territories are claimed. ${activePlayer().name} begins stacking.`, 'success');
  } else advancePlayer();
  saveGame();
}

function stackTroop(territoryId) {
  const territoryState = game.territories[territoryId];
  const player = activePlayer();
  if (territoryState.ownerId !== player.id) return showToast(`${player.name} can only stack on owned territories.`, 'error');
  pushUndo();
  territoryState.troops += 1;
  player.placedTroops += 1;
  addHistory(`${player.name} added a troop to ${territoryById(territoryId).name}.`);
  if (game.players.every((candidate) => remainingSetupTroops(candidate) === 0)) {
    game.phase = PHASES.READY;
    game.activePlayerIndex = 0;
    showToast('Initial placement is complete.', 'success');
  } else advanceToNextEligiblePlayer();
  saveGame();
}

function beginGame() {
  pushUndo();
  game.turnNumber = 1;
  game.activePlayerIndex = 0;
  beginReinforcementPhase();
  addHistory(`${activePlayer().name} began turn 1 with ${game.reinforcementPool} reinforcements.`);
  saveGame();
  render();
}

function beginReinforcementPhase() {
  game.phase = PHASES.REINFORCE;
  game.reinforcementPool = calculateReinforcements(activePlayer().id);
  clearSelection();
}

function reinforceTerritory(territoryId) {
  const state = game.territories[territoryId];
  const player = activePlayer();
  if (state.ownerId !== player.id) return showToast('Reinforcements must go on your own territory.', 'error');
  if (game.reinforcementPool <= 0) return;
  const requested = Number(document.querySelector('#reinforce-amount')?.value ?? 1);
  const amount = Math.min(game.reinforcementPool, Math.max(1, Number.isInteger(requested) ? requested : 1));
  pushUndo();
  state.troops += amount;
  game.reinforcementPool -= amount;
  addHistory(`${player.name} added ${amount} troop${amount === 1 ? '' : 's'} to ${territoryById(territoryId).name}.`);
  if (game.reinforcementPool === 0) {
    game.phase = PHASES.ATTACK;
    clearSelection();
    showToast('Reinforcements placed. Attack or continue to fortify.', 'success');
  }
  saveGame();
}

function selectAttackTerritory(territoryId) {
  const state = game.territories[territoryId];
  const player = activePlayer();
  if (!selection.sourceId) {
    if (state.ownerId !== player.id || state.troops < 2) {
      return showToast('Choose one of your territories with at least 2 troops.', 'error');
    }
    selection.sourceId = territoryId;
    return;
  }
  if (territoryId === selection.sourceId) {
    clearSelection();
    return;
  }
  if (state.ownerId === player.id) {
    if (state.troops < 2) return showToast('Choose a territory with at least 2 troops.', 'error');
    selection = { sourceId: territoryId, targetId: null };
    return;
  }
  if (!adjacency[selection.sourceId].includes(territoryId)) {
    return showToast('The attack target must border the source territory.', 'error');
  }
  selection.targetId = territoryId;
}

function recordAttack() {
  const { sourceId, targetId } = selection;
  if (!sourceId || !targetId) return;
  const sourceAfter = Number(document.querySelector('#source-after')?.value);
  const targetAfter = Number(document.querySelector('#target-after')?.value);
  const result = document.querySelector('#attack-result')?.value;
  const sourceState = game.territories[sourceId];
  const targetState = game.territories[targetId];
  const attacker = activePlayer();
  const defender = playerById(targetState.ownerId);

  if (!Number.isInteger(sourceAfter) || sourceAfter < 1 || sourceAfter > sourceState.troops) {
    return showToast('Source troops after the attack must be between 1 and its current count.', 'error');
  }
  if (!Number.isInteger(targetAfter) || targetAfter < 1) {
    return showToast('The target must finish with at least 1 troop.', 'error');
  }
  if (result === 'captured' && targetAfter > sourceState.troops - 1) {
    return showToast('Captured territory troops cannot exceed the attacking armies.', 'error');
  }
  if (result === 'held' && targetAfter > targetState.troops) {
    return showToast('A defending territory cannot gain troops during the attack.', 'error');
  }

  pushUndo();
  sourceState.troops = sourceAfter;
  targetState.troops = targetAfter;
  if (result === 'captured') {
    targetState.ownerId = attacker.id;
    addHistory(`${attacker.name} captured ${territoryById(targetId).name} from ${defender?.name ?? 'an opponent'}.`);
    checkEliminationsAndWinner();
  } else {
    addHistory(`${attacker.name} attacked ${territoryById(targetId).name}; ownership held.`);
  }
  clearSelection();
  saveGame();
  render();
}

function selectFortifyTerritory(territoryId) {
  const state = game.territories[territoryId];
  const player = activePlayer();
  if (state.ownerId !== player.id) return showToast('Fortification uses your own territories only.', 'error');
  if (!selection.sourceId) {
    if (state.troops < 2) return showToast('Choose a source with at least 2 troops.', 'error');
    selection.sourceId = territoryId;
    return;
  }
  if (territoryId === selection.sourceId) {
    clearSelection();
    return;
  }
  if (!hasOwnedPath(selection.sourceId, territoryId, player.id)) {
    return showToast('Those territories are not connected through your territory network.', 'error');
  }
  selection.targetId = territoryId;
}

function recordFortify() {
  const { sourceId, targetId } = selection;
  const count = Number(document.querySelector('#fortify-count')?.value);
  if (!sourceId || !targetId) return;
  if (!Number.isInteger(count) || count < 1 || count >= game.territories[sourceId].troops) {
    return showToast('Move at least 1 troop and leave 1 behind.', 'error');
  }
  pushUndo();
  game.territories[sourceId].troops -= count;
  game.territories[targetId].troops += count;
  addHistory(`${activePlayer().name} moved ${count} troop${count === 1 ? '' : 's'} from ${territoryById(sourceId).name} to ${territoryById(targetId).name}.`);
  endTurn(false, true);
}

function endTurn(skippedFortify = true, snapshotTaken = false) {
  if (!snapshotTaken) pushUndo();
  if (skippedFortify) addHistory(`${activePlayer().name} ended the turn.`);
  clearSelection();
  const previousIndex = game.activePlayerIndex;
  advanceToNextLivingPlayer();
  if (game.activePlayerIndex <= previousIndex) game.turnNumber += 1;
  beginReinforcementPhase();
  addHistory(`${activePlayer().name} began turn ${game.turnNumber} with ${game.reinforcementPool} reinforcements.`);
  saveGame();
  render();
}

function handleActionPanelClick(event) {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'begin-game') beginGame();
  if (action === 'add-reinforcements') addExtraReinforcements();
  if (action === 'to-fortify') {
    pushUndo();
    game.phase = PHASES.FORTIFY;
    clearSelection();
    saveGame();
    render();
  }
  if (action === 'record-attack') recordAttack();
  if (action === 'clear-selection') {
    clearSelection();
    render();
  }
  if (action === 'record-fortify') recordFortify();
  if (action === 'skip-fortify') endTurn(true);
}

function handleActionPanelChange(event) {
  if (event.target.id !== 'attack-result') return;
  applyPredictedAttackCounts(event.target.value);
}

function render() {
  reachOdds = showReachOdds && canShowReachOdds() ? getReachOdds() : {};
  renderPhase();
  renderActionPanel();
  renderMap();
  renderPlayerProgress();
  renderTerritoryDetails();
  renderContinents();
  renderHistory();
}

function renderPhase() {
  const player = activePlayer();
  const content = {
    [PHASES.SETUP]: ['Setup', 'Build your table', 'Add players, choose unique colors, and arrange the turn order.'],
    [PHASES.CLAIM]: ['Claim territories', 'Choose an empty territory', 'Each click claims one territory and passes to the next player.'],
    [PHASES.STACK]: ['Stack troops', 'Reinforce owned territories', 'Each click adds one troop and passes to the next eligible player.'],
    [PHASES.READY]: ['Ready for game', 'Initial placement complete', 'Review the board, then begin live turn tracking.'],
    [PHASES.REINFORCE]: ['Reinforce', `Place ${game.reinforcementPool} troop${game.reinforcementPool === 1 ? '' : 's'}`, 'Click owned territories to place one troop at a time.'],
    [PHASES.ATTACK]: ['Attack', 'Record attacks', 'Select a source territory, then an adjacent enemy territory.'],
    [PHASES.FORTIFY]: ['Fortify', 'Make one troop move', 'Select a source, then a connected owned destination—or skip.'],
    [PHASES.GAME_OVER]: ['Game over', `${playerById(game.winnerId)?.name ?? 'A player'} wins`, 'One player controls every territory.'],
  }[game.phase];
  elements.statusPill.textContent = content[0];
  elements.statusPill.dataset.phase = game.phase;
  elements.phaseTitle.textContent = content[1];
  elements.selectionHint.textContent = content[2];
  elements.setupCard.classList.toggle('hidden', game.phase !== PHASES.SETUP);
  elements.progressCard.classList.toggle('hidden', game.phase === PHASES.SETUP);
  elements.actionCard.classList.toggle('hidden', [PHASES.SETUP, PHASES.CLAIM, PHASES.STACK].includes(game.phase));
  elements.historyCard.classList.toggle('hidden', game.history.length === 0);
  elements.toggleOdds.classList.toggle('hidden', !canShowReachOdds());
  elements.toggleOdds.disabled = !canShowReachOdds();
  elements.toggleOdds.classList.toggle('active', showReachOdds && canShowReachOdds());
  elements.toggleOdds.setAttribute('aria-pressed', String(showReachOdds && canShowReachOdds()));
  elements.toggleOdds.textContent = showReachOdds && canShowReachOdds() ? 'Hide reach odds' : 'Show reach odds';
  const showActive = ![PHASES.SETUP, PHASES.READY, PHASES.GAME_OVER].includes(game.phase);
  elements.activePlayerBanner.classList.toggle('hidden', !showActive);
  if (showActive && player) {
    elements.activePlayerBanner.innerHTML = `<span class="active-dot"></span><span><small>Turn ${game.turnNumber || 'setup'}</small><strong>${escapeHtml(player.name)}</strong></span>`;
    elements.activePlayerBanner.style.setProperty('--player-color', player.color);
  }
}

function renderActionPanel() {
  elements.undoAction.disabled = game.undoStack.length === 0;
  if (game.phase === PHASES.READY) {
    elements.actionKicker.textContent = 'Phase 2';
    elements.actionTitle.textContent = 'Start live tracking';
    elements.actionPanel.innerHTML = `<p class="action-copy">Turns begin with calculated reinforcements, followed by attacks and one optional fortification.</p><button class="button button-primary button-full" data-action="begin-game">Begin first turn</button>`;
    return;
  }
  if (game.phase === PHASES.REINFORCE) {
    elements.actionKicker.textContent = `Turn ${game.turnNumber}`;
    elements.actionTitle.textContent = `${game.reinforcementPool} reinforcements left`;
    elements.actionPanel.innerHTML = `<div class="metric-row"><span>Territory base</span><strong>${Math.max(3, Math.floor(territoriesOwnedBy(activePlayer().id) / 3))}</strong></div><div class="metric-row"><span>Continent bonus</span><strong>+${continentBonusFor(activePlayer().id)}</strong></div><label class="top-gap">Troops per click<input id="reinforce-amount" type="number" min="1" max="${game.reinforcementPool}" value="1" /></label><div class="inline-add"><input id="extra-reinforcements" type="number" min="1" value="1" aria-label="Extra reinforcements from cards or house rules" /><button class="button" data-action="add-reinforcements">Add card / bonus troops</button></div>`;
    return;
  }
  if (game.phase === PHASES.ATTACK) {
    elements.actionKicker.textContent = `Turn ${game.turnNumber}`;
    elements.actionTitle.textContent = 'Attack';
    const source = selection.sourceId ? territoryById(selection.sourceId) : null;
    const target = selection.targetId ? territoryById(selection.targetId) : null;
    const prediction = source && target ? predictAttack(source.id, target.id) : null;
    elements.actionPanel.innerHTML = `
      <div class="selection-summary">
        <span><small>From</small><strong>${source?.name ?? 'Select source'}</strong></span>
        <span class="selection-arrow">→</span>
        <span><small>Target</small><strong>${target?.name ?? 'Select target'}</strong></span>
      </div>
      ${source && target ? `
        <div class="prediction-box">
          <span>Predicted outcome</span>
          <strong>${prediction.result === 'captured' ? 'Capture' : 'Defender holds'} · ${formatPercent(prediction.winChance, 1)} win chance</strong>
          <small>Assumes the attacker continues until capture or only one troop remains behind.</small>
        </div>
        <div class="compact-grid">
          <label>Source after<input id="source-after" type="number" min="1" max="${game.territories[source.id].troops}" value="${prediction.sourceAfter}" /></label>
          <label>Target after<input id="target-after" type="number" min="1" value="${prediction.targetAfter}" /></label>
        </div>
        <label>Confirm result<select id="attack-result"><option value="captured" ${prediction.result === 'captured' ? 'selected' : ''}>Territory captured</option><option value="held" ${prediction.result === 'held' ? 'selected' : ''}>Defender held</option></select></label>
        <button class="button button-primary button-full" data-action="record-attack">Confirm result</button>
      ` : ''}
      <div class="action-row">
        <button class="text-button" data-action="clear-selection" ${source ? '' : 'disabled'}>Clear</button>
        <button class="button" data-action="to-fortify">Done attacking</button>
      </div>`;
    return;
  }
  if (game.phase === PHASES.FORTIFY) {
    elements.actionKicker.textContent = `Turn ${game.turnNumber}`;
    elements.actionTitle.textContent = 'Fortify';
    const source = selection.sourceId ? territoryById(selection.sourceId) : null;
    const target = selection.targetId ? territoryById(selection.targetId) : null;
    elements.actionPanel.innerHTML = `
      <div class="selection-summary">
        <span><small>From</small><strong>${source?.name ?? 'Select source'}</strong></span>
        <span class="selection-arrow">→</span>
        <span><small>To</small><strong>${target?.name ?? 'Select destination'}</strong></span>
      </div>
      ${source && target ? `<label>Troops to move<input id="fortify-count" type="number" min="1" max="${game.territories[source.id].troops - 1}" value="1" /></label><button class="button button-primary button-full" data-action="record-fortify">Move troops & end turn</button>` : ''}
      <div class="action-row">
        <button class="text-button" data-action="clear-selection" ${source ? '' : 'disabled'}>Clear</button>
        <button class="button" data-action="skip-fortify">Skip & end turn</button>
      </div>`;
    return;
  }
  if (game.phase === PHASES.GAME_OVER) {
    elements.actionKicker.textContent = 'Final result';
    elements.actionTitle.textContent = `${playerById(game.winnerId)?.name ?? 'Winner'} controls the map`;
    elements.actionPanel.innerHTML = '<p class="action-copy">The final capture and full game history are saved locally. Use Undo if the result was entered incorrectly.</p>';
  }
}

function renderMap() {
  const edges = buildEdges().map(([fromId, toId]) => {
    const from = territoryById(fromId);
    const to = territoryById(toId);
    const bridgeClass = bridges.has(edgeKey(fromId, toId)) ? ' bridge' : '';
    return `<line class="edge${bridgeClass}" x1="${mapPoint(from.x)}" y1="${mapPoint(from.y)}" x2="${mapPoint(to.x)}" y2="${mapPoint(to.y)}" />`;
  }).join('');
  const shapes = continents.map((continent) => `<path class="continent-shape" transform="scale(${MAP_SPREAD})" d="${continent.shape}" fill="${continent.color}" />`).join('');
  const labels = continents.map((continent) => (
    `<text class="continent-label" x="${mapPoint(continent.labelX)}" y="${mapPoint(continent.labelY)}">${continent.name}</text>`
  )).join('');
  const nodes = territories.map((territory) => {
    const state = game.territories[territory.id];
    const owner = playerById(state.ownerId);
    const selected = [selectedTerritoryId, selection.sourceId, selection.targetId].includes(territory.id) ? ' selected' : '';
    const valid = isValidTarget(territory.id) ? ' valid-target' : '';
    const odds = reachOdds[territory.id];
    const oddsLabel = odds ? formatPercent(odds.chance) : '';
    return `
      <g class="territory-node${selected}${valid}" data-territory-id="${territory.id}" role="button" tabindex="0"
        aria-label="${territory.name}, ${owner?.name ?? 'Unclaimed'}, ${state.troops} troops${odds ? `, ${oddsLabel} estimated reach chance` : ''}"
        transform="translate(${mapPoint(territory.x)}, ${mapPoint(territory.y)})" style="--owner-color:${owner?.color ?? '#64748b'}">
        <circle class="hit-area" r="38"></circle><circle class="owner-ring" r="28"></circle><circle class="territory-core" r="21"></circle>
        <text class="troop-count" y="6">${state.troops}</text>
        <text class="territory-name" y="43">${territory.name}</text>
        ${odds ? `
          <g class="odds-band" transform="translate(0, 63)">
            ${oddsPill(-40, 'low', formatPercent(odds.low))}
            ${oddsPill(0, 'average', oddsLabel)}
            ${oddsPill(40, 'high', formatPercent(odds.high))}
          </g>
        ` : ''}
      </g>`;
  }).join('');
  elements.mapWrap.innerHTML = `
    <svg class="strategy-map${showReachOdds ? ' odds-visible' : ''}${mapZoomed ? ' zoomed' : ''}" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="group" aria-label="42 territory world map">
      <defs><linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0d2b3c"></stop><stop offset="100%" stop-color="#071521"></stop></linearGradient><filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity=".4"></feDropShadow></filter></defs>
      <rect width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="20" fill="url(#ocean)"></rect>
      <g class="map-grid" aria-hidden="true"><path d="M0 ${MAP_HEIGHT / 4}H${MAP_WIDTH}M0 ${MAP_HEIGHT / 2}H${MAP_WIDTH}M0 ${MAP_HEIGHT * 0.75}H${MAP_WIDTH}"></path><path d="M${MAP_WIDTH / 4} 0V${MAP_HEIGHT}M${MAP_WIDTH / 2} 0V${MAP_HEIGHT}M${MAP_WIDTH * 0.75} 0V${MAP_HEIGHT}"></path></g>
      ${shapes}${labels}<g class="connection-lines">${edges}</g><g class="territories">${nodes}</g>
    </svg>`;
  elements.mapWrap.querySelectorAll('[data-territory-id]').forEach((node) => {
    node.addEventListener('click', () => onTerritoryClick(node.dataset.territoryId));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onTerritoryClick(node.dataset.territoryId);
      }
    });
  });
  elements.mapWrap.querySelector('.strategy-map').addEventListener('dblclick', (event) => {
    if (event.target.closest('[data-territory-id]')) return;
    mapZoomed = !mapZoomed;
    renderMap();
    if (mapZoomed) centerMapViewport();
  });
  elements.continentLegend.innerHTML = [
    ...continents.map((continent) => `<span><i style="--continent-color:${continent.color}"></i>${continent.name} <b>+${continent.bonus}</b></span>`),
    showReachOdds ? '<span class="odds-key"><i></i>Worst · average · best</span>' : '',
    '<span class="zoom-key">Double-click open map to zoom</span>',
  ].join('');
}

function renderPlayerProgress() {
  if (game.phase === PHASES.SETUP) return;
  elements.territoryProgress.textContent = `${claimedCount()} / ${territories.length} claimed`;
  elements.playerProgress.innerHTML = game.players.map((player, index) => {
    const isLive = isLivePhase();
    const isActive = index === game.activePlayerIndex && !player.eliminated && game.phase !== PHASES.READY;
    const secondStat = isLive ? `${totalTroopsFor(player.id)} troops` : `${remainingSetupTroops(player)} troops left`;
    const percentage = isLive ? (territoriesOwnedBy(player.id) / territories.length) * 100 : (player.placedTroops / game.startingTroops) * 100;
    return `
      <div class="progress-player${isActive ? ' active' : ''}${player.eliminated ? ' eliminated' : ''}" style="--player-color:${player.color}">
        <div class="progress-player-main"><span class="player-swatch"></span><span class="player-position">${index + 1}</span><strong>${escapeHtml(player.name)}</strong>${player.eliminated ? '<span class="turn-tag">Out</span>' : isActive ? '<span class="turn-tag">Turn</span>' : ''}</div>
        <div class="player-stats"><span><strong>${territoriesOwnedBy(player.id)}</strong> territories</span><span><strong>${secondStat}</strong></span></div>
        <div class="progress-track"><span style="width:${Math.min(100, percentage)}%"></span></div>
      </div>`;
  }).join('');
}

function renderTerritoryDetails() {
  if (!selectedTerritoryId) {
    elements.territoryDetails.innerHTML = '<span class="muted">Select a territory to inspect it.</span>';
    return;
  }
  const territory = territoryById(selectedTerritoryId);
  const state = game.territories[selectedTerritoryId];
  const owner = playerById(state.ownerId);
  const continent = continentById(territory.continent);
  const odds = reachOdds[selectedTerritoryId];
  const route = odds?.path.map((id) => territoryById(id).name).join(' → ');
  elements.territoryDetails.innerHTML = `
    <div class="territory-detail-title"><span class="detail-swatch" style="--detail-color:${owner?.color ?? continent.color}"></span><div><strong>${territory.name}</strong><small>${continent.name}</small></div><span class="troop-badge">${state.troops}</span></div>
    <div class="detail-row"><span>Owner</span><strong>${owner ? escapeHtml(owner.name) : 'Unclaimed'}</strong></div>
    <div class="detail-row"><span>Connected to</span><strong>${adjacency[territory.id].length} territories</strong></div>
    ${odds ? `<div class="odds-detail"><span>Estimated route range</span><div class="odds-detail-values"><b class="low">${formatPercent(odds.low, 1)}</b><b class="average">${formatPercent(odds.chance, 1)}</b><b class="high">${formatPercent(odds.high, 1)}</b></div><small>Worst · average · best. Route: ${escapeHtml(route)}</small></div>` : ''}`;
}

function renderContinents() {
  elements.continentList.innerHTML = continents.map((continent) => {
    const members = territories.filter((territory) => territory.continent === continent.id);
    const ownerId = members[0] ? game.territories[members[0].id].ownerId : null;
    const controller = ownerId && members.every((territory) => game.territories[territory.id].ownerId === ownerId) ? playerById(ownerId) : null;
    return `<div class="continent-row"><span><i style="--continent-color:${continent.color}"></i>${continent.name}</span><strong>${controller ? `${escapeHtml(controller.name)} (+${continent.bonus})` : `${members.length} territories`}</strong></div>`;
  }).join('');
}

function renderHistory() {
  elements.gameHistory.innerHTML = game.history.slice(-12).reverse().map((entry) => `<div class="history-entry"><span>${escapeHtml(entry.message)}</span><small>${escapeHtml(entry.time)}</small></div>`).join('');
}

function isValidTarget(territoryId) {
  const state = game.territories[territoryId];
  if (game.phase === PHASES.CLAIM) return !state.ownerId;
  if ([PHASES.STACK, PHASES.REINFORCE].includes(game.phase)) return state.ownerId === activePlayer()?.id;
  if (game.phase === PHASES.ATTACK) {
    if (!selection.sourceId) return state.ownerId === activePlayer()?.id && state.troops >= 2;
    return state.ownerId !== activePlayer()?.id && adjacency[selection.sourceId].includes(territoryId);
  }
  if (game.phase === PHASES.FORTIFY) {
    if (!selection.sourceId) return state.ownerId === activePlayer()?.id && state.troops >= 2;
    return state.ownerId === activePlayer()?.id && territoryId !== selection.sourceId && hasOwnedPath(selection.sourceId, territoryId, activePlayer().id);
  }
  return false;
}

function calculateReinforcements(playerId) {
  return Math.max(3, Math.floor(territoriesOwnedBy(playerId) / 3)) + continentBonusFor(playerId);
}

function addExtraReinforcements() {
  const amount = Number(document.querySelector('#extra-reinforcements')?.value);
  if (!Number.isInteger(amount) || amount < 1) return showToast('Enter at least 1 extra troop.', 'error');
  pushUndo();
  game.reinforcementPool += amount;
  addHistory(`${activePlayer().name} added ${amount} card or bonus troop${amount === 1 ? '' : 's'}.`);
  saveGame();
  render();
}

function continentBonusFor(playerId) {
  return continents.reduce((total, continent) => {
    const controls = territories.filter((territory) => territory.continent === continent.id).every((territory) => game.territories[territory.id].ownerId === playerId);
    return total + (controls ? continent.bonus : 0);
  }, 0);
}

function hasOwnedPath(startId, endId, playerId) {
  const queue = [startId];
  const visited = new Set(queue);
  while (queue.length) {
    const current = queue.shift();
    if (current === endId) return true;
    adjacency[current].forEach((neighbor) => {
      if (!visited.has(neighbor) && game.territories[neighbor].ownerId === playerId) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    });
  }
  return false;
}

function checkEliminationsAndWinner() {
  game.players.forEach((player) => {
    if (!player.eliminated && territoriesOwnedBy(player.id) === 0) {
      player.eliminated = true;
      addHistory(`${player.name} was eliminated.`);
    }
  });
  const living = game.players.filter((player) => !player.eliminated);
  if (living.length === 1) {
    game.winnerId = living[0].id;
    game.phase = PHASES.GAME_OVER;
    addHistory(`${living[0].name} won the game.`);
  }
}

function advancePlayer() {
  game.activePlayerIndex = (game.activePlayerIndex + 1) % game.players.length;
}

function advanceToNextEligiblePlayer() {
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (game.activePlayerIndex + offset) % game.players.length;
    if (remainingSetupTroops(game.players[index]) > 0) {
      game.activePlayerIndex = index;
      return;
    }
  }
}

function advanceToNextLivingPlayer() {
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (game.activePlayerIndex + offset) % game.players.length;
    if (!game.players[index].eliminated) {
      game.activePlayerIndex = index;
      return;
    }
  }
}

function activePlayer() { return game.players[game.activePlayerIndex]; }
function playerById(id) { return game.players.find((player) => player.id === id); }
function claimedCount() { return territories.filter(({ id }) => game.territories[id].ownerId).length; }
function territoriesOwnedBy(playerId) { return territories.filter(({ id }) => game.territories[id].ownerId === playerId).length; }
function totalTroopsFor(playerId) { return territories.reduce((total, territory) => total + (game.territories[territory.id].ownerId === playerId ? game.territories[territory.id].troops : 0), 0); }
function remainingSetupTroops(player) { return Math.max(0, game.startingTroops - player.placedTroops); }
function isLivePhase() { return [PHASES.REINFORCE, PHASES.ATTACK, PHASES.FORTIFY, PHASES.GAME_OVER].includes(game.phase); }
function canShowReachOdds() { return [PHASES.READY, PHASES.REINFORCE, PHASES.ATTACK, PHASES.FORTIFY].includes(game.phase); }

function toggleReachOdds() {
  if (!canShowReachOdds()) return;
  showReachOdds = !showReachOdds;
  render();
}

function getReachOdds() {
  const playerId = activePlayer()?.id;
  const boardKey = territories
    .map(({ id }) => `${game.territories[id].ownerId ?? '-'}:${game.territories[id].troops}`)
    .join('|');
  const key = `${playerId}|${boardKey}`;
  if (reachOddsCache.key !== key) {
    reachOddsCache = { key, value: computeReachOdds(game, playerId) };
  }
  return reachOddsCache.value;
}

function predictAttack(sourceId, targetId) {
  const sourceTroops = game.territories[sourceId].troops;
  const targetTroops = game.territories[targetId].troops;
  const stats = distributionStats(Math.max(1, sourceTroops - 1), Math.max(1, targetTroops), 'trueRandom');
  const capturedTroops = Math.max(1, Math.min(
    sourceTroops - 1,
    Math.round(stats.expectedAttackersRemaining),
  ));
  const heldTroops = Math.max(1, Math.min(
    targetTroops,
    Math.round(stats.expectedDefendersRemaining),
  ));
  const result = stats.winChance >= 0.5 ? 'captured' : 'held';
  return {
    result,
    winChance: stats.winChance,
    sourceAfter: 1,
    targetAfter: result === 'captured' ? capturedTroops : heldTroops,
    capturedTroops,
    heldTroops,
  };
}

function applyPredictedAttackCounts(result) {
  if (!selection.sourceId || !selection.targetId) return;
  const prediction = predictAttack(selection.sourceId, selection.targetId);
  const sourceInput = document.querySelector('#source-after');
  const targetInput = document.querySelector('#target-after');
  if (sourceInput) sourceInput.value = String(prediction.sourceAfter);
  if (targetInput) {
    targetInput.value = String(result === 'captured' ? prediction.capturedTroops : prediction.heldTroops);
  }
}

function oddsPill(x, tone, label) {
  return `<g class="odds-pill ${tone}" transform="translate(${x}, 0)"><rect x="-19" y="-11" width="38" height="22" rx="11"></rect><text y="4">${label}</text></g>`;
}

function mapPoint(value) {
  return Math.round(value * MAP_SPREAD * 10) / 10;
}

function centerMapViewport() {
  window.requestAnimationFrame(() => {
    elements.mapWrap.scrollLeft = Math.max(0, (elements.mapWrap.scrollWidth - elements.mapWrap.clientWidth) / 2);
    elements.mapWrap.scrollTop = Math.max(0, (elements.mapWrap.scrollHeight - elements.mapWrap.clientHeight) / 2);
  });
}

function buildEdges() {
  const seen = new Set();
  const edges = [];
  Object.entries(adjacency).forEach(([id, neighbors]) => neighbors.forEach((neighbor) => {
    const key = edgeKey(id, neighbor);
    if (!seen.has(key)) {
      seen.add(key);
      edges.push([id, neighbor]);
    }
  }));
  return edges;
}

function addHistory(message) {
  game.history.push({ message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  game.history = game.history.slice(-80);
}

function pushUndo() {
  const snapshot = structuredClone({ ...game, undoStack: [] });
  game.undoStack.push(snapshot);
  game.undoStack = game.undoStack.slice(-30);
}

function undoLastAction() {
  const snapshot = game.undoStack.pop();
  if (!snapshot) return;
  const remainingUndo = game.undoStack;
  game = { ...snapshot, undoStack: remainingUndo };
  clearSelection();
  saveGame();
  render();
  showToast('Last action undone.', 'success');
}

function clearSelection() {
  selection = { sourceId: null, targetId: null };
  selectedTerritoryId = null;
}

function saveGame() {
  game.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 3 && Object.values(PHASES).includes(saved.phase)) return saved;
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (!legacy?.territories || !legacy?.players) return null;
    return {
      ...createInitialGame(),
      ...legacy,
      version: 3,
      players: legacy.players.map((player) => ({ ...player, eliminated: false })),
      history: [],
      undoStack: [],
      reinforcementPool: 0,
      turnNumber: 0,
      winnerId: null,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function resetGame() {
  if (game.phase !== PHASES.SETUP && !window.confirm('Start a new game? This clears the current board and history.')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  game = createInitialGame();
  clearSelection();
  syncSetupControls();
  render();
  showToast('New game ready.', 'success');
}

function showToast(message, type = 'info') {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.dataset.type = type;
  elements.toast.classList.add('visible');
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 3200);
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
