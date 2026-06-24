# Visual QA checklist

Use this checklist before publishing changes.

## Start the preview

1. Open the project folder in VS Code.
2. Install **Live Server** by Ritwick Dey if prompted.
3. Open `index.html`.
4. Click **Go Live**.
5. Confirm the page opens at `http://127.0.0.1:5500/`.

## Layout checks

- The page loads without console errors.
- The map is the dominant interface.
- Territory names, owner colors, troop counts, active player, and current phase are readable.
- The sidebar does not feel crowded during setup, attack, or fortify phases.
- The desktop layout has no page-level horizontal overflow.
- At mobile width, controls remain readable and the map scrolls inside its panel.
- Reach-odds badges do not overlap territory names badly.
- The full map fits in its panel by default.

## Setup smoke test

1. Create three players.
2. Start the territory draft.
3. Claim all territories.
4. Stack the remaining troops.
5. Refresh during setup and confirm state restores.
6. Confirm **Ready for game** appears after all starting troops are used.

## Live-game smoke test

1. Begin the first turn.
2. Confirm reinforcement calculations make sense.
3. Place reinforcements until the pool reaches zero.
4. Record a failed attack.
5. Record a capture.
6. Finish attacking.
7. Try an invalid fortification and confirm it is rejected.
8. Complete a valid fortification or skip it.
9. Confirm the next living player starts their turn.
10. Undo an action and confirm the board restores.
11. Refresh and confirm the game restores.
12. Eliminate a player and confirm they are marked out.
13. Capture the final enemy territory and confirm the winner state.
14. Reset and confirm the board, history, and saved game are cleared.

## Odds smoke test

1. Reach **Ready for game** or a live turn.
2. Enable **Show reach odds**.
3. Confirm owned territories do not receive percentage badges.
4. Confirm reachable enemy territories display values between 0% and 100%.
5. Select a territory with percentages and confirm the route appears in the details panel.
6. Advance to the next player and confirm the overlay switches perspective.
7. Toggle the overlay off and confirm the map returns to its uncluttered state.

## Scope guard

Do not treat multi-territory route percentages as exact whole-turn simulations. Recommendations should stay optional, explainable, and separate from authoritative board updates.
