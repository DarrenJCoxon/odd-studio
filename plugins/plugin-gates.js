import { resolve } from 'path';
import { checkBriefQuality, checkCodeElegance, checkOutcomeQuality, checkPersonaQuality, checkSecurityBaseline } from './plugin-quality-checks.js';
import { isBriefFile, isOutcomeFile, isPersonaFile, isSourceCodePath, isSrcFile } from './plugin-paths.js';
import { markerExists, markerValid, removeMarker, touchMarker } from './plugin-markers.js';

export function createBeforeHook(readState) {
  return (event) => {
    const state = readState();
    if (!state) return;

    const toolName = event.tool?.name || '';
    const filePath = event.input?.file_path || event.input?.path || '';

    if (toolName === 'Agent' && state.currentPhase === 'build') {
      if (!state.briefConfirmed) {
        const prompt = (event.input?.prompt || '').slice(0, 200).toLowerCase();
        if (!prompt.match(/session.brief|session-brief|generate.*brief|write.*brief/)) {
          return { blocked: true, message: 'ODD BRIEF GATE: Build agents blocked. The session brief has not been confirmed. Run /odd-sync first.' };
        }
      }

      if (state.briefConfirmed && !markerValid(resolve(process.cwd(), '.odd', '.odd-flow-phase-synced'), 1800000)) {
        return { blocked: true, message: 'ODD BUILD GATE: Brief confirmed but odd-flow not synced. Run /odd-sync first.' };
      }

      if (state.briefConfirmed && !markerValid(resolve(process.cwd(), '.odd', '.odd-flow-agents-ready'), 7200000)) {
        const prompt = (event.input?.prompt || '').slice(0, 300).toLowerCase();
        if (!prompt.match(/session.brief|session-brief|generate.*brief|odd-sync|fix.*hook|update.*hook/)) {
          return { blocked: true, message: 'ODD BUILD GATE: Task agents blocked — odd-flow swarm not initialised. Run the full swarm init sequence.' };
        }
      }
    }

    if ((toolName === 'Write' || toolName === 'Edit') && state.currentPhase === 'build' && isSourceCodePath(filePath)) {
      if (!markerValid(resolve(process.cwd(), '.odd', '.odd-flow-swarm-active'), 3600000)) {
        return { blocked: true, message: `ODD SWARM WRITE GATE: Source writes blocked — no active build session. Run *build first. File: ${filePath}` };
      }
      if (!markerValid(resolve(process.cwd(), '.odd', '.odd-flow-agent-token'), 120000)) {
        return { blocked: true, message: `ODD SWARM WRITE GATE: Source writes blocked — no agent write token. Only Task agents can write source code, not the orchestrator. Dispatch work to agents instead. File: ${filePath}` };
      }
    }

    if ((toolName === 'Edit' || toolName === 'Write') && filePath.includes('state.json')) {
      const newContent = event.input?.new_string || event.input?.content || '';
      if (newContent.includes('"verified"') && state.buildMode === 'debug') {
        return { blocked: true, message: 'ODD VERIFY GATE: Cannot mark outcomes as verified while debug mode is active. Return buildMode to verify first.' };
      }
      if (newContent.includes('"verified"') && (markerExists('.checkpoint-dirty') || !markerExists('.checkpoint-clear'))) {
        return { blocked: true, message: 'ODD CHECKPOINT GATE: Cannot mark outcomes as verified until a fresh Checkpoint scan clears the latest source changes.' };
      }
      if (newContent.includes('"verified"') && !state.verificationConfirmed) {
        return { blocked: true, message: 'ODD VERIFY GATE: Cannot mark outcomes as verified. Walk through the verification checklist first.' };
      }
      if (/"briefConfirmed"\s*:\s*true/.test(newContent) && !markerExists('.odd-flow-brief-stored')) {
        return { blocked: true, message: 'ODD CONFIRM GATE: Brief not stored in odd-flow memory. Store it first.' };
      }
    }

    if (toolName === 'Bash' && state.currentPhase === 'build') {
      const cmd = event.input?.command || '';
      if (/git\s+commit/.test(cmd)) {
        if (state.buildMode === 'debug') {
          return { blocked: true, message: 'ODD DEBUG GATE: Commits are blocked while debug mode is active. Finish the fix and return to verification first.' };
        }
        if (markerExists('.checkpoint-dirty') || !markerExists('.checkpoint-clear')) {
          return { blocked: true, message: 'ODD CHECKPOINT GATE: Commit blocked — run Checkpoint and clear the latest source changes first.' };
        }
        if (!markerExists('.odd-flow-state-ready')) {
          return { blocked: true, message: 'ODD COMMIT GATE: Commit blocked — odd-flow state not stored. Call mcp__odd-flow__memory_store key=odd-project-state first.' };
        }
        removeMarker('.odd-flow-state-ready');
      }
    }
  };
}

export function createAfterHook(readState, readLastCommit, writeState) {
  return (event) => {
    const toolName = event.tool?.name || '';
    const filePath = event.input?.file_path || event.input?.path || '';
    const warnings = [];

    if (toolName === 'Write' && isOutcomeFile(filePath)) warnings.push(...checkOutcomeQuality(filePath));
    if (toolName === 'Write' && isPersonaFile(filePath)) warnings.push(...checkPersonaQuality(filePath));
    if ((toolName === 'Write' || toolName === 'Edit') && isSrcFile(filePath)) {
      warnings.push(...checkCodeElegance(filePath));
      warnings.push(...checkSecurityBaseline(filePath));
    }
    if (toolName === 'Write' && isBriefFile(filePath)) warnings.push(...checkBriefQuality(filePath));

    const state = readState();
    if ((toolName === 'Write' || toolName === 'Edit') && isSrcFile(filePath) && state?.currentPhase === 'build') {
      touchMarker('.checkpoint-dirty');
      removeMarker('.checkpoint-clear');
    }

    if (toolName === 'Bash') {
      const cmd = event.input?.command || '';
      const state = readState();
      if (state?.currentPhase === 'build' && /@darrenjcoxon\/vibeguard|vibeguard/.test(cmd) && event.exitCode === 0) {
        touchMarker('.checkpoint-clear');
        removeMarker('.checkpoint-dirty');
      }
      if (/git\s+commit/.test(cmd) && event.exitCode === 0) {
        if (state) {
          state.lastCommit = readLastCommit();
          state.lastSaved = new Date().toISOString();
          state.lastCommitAt = state.lastSaved;
          writeState(state);
          touchMarker('.odd-flow-phase-synced');
          touchMarker('.odd-flow-state-dirty');
        }
      }
    }

    if (toolName === 'mcp__odd-flow__memory_store') {
      const state = readState();
      if (state?.currentPhase === 'build' && event.input?.key === 'odd-project-state') {
        touchMarker('.odd-flow-state-ready');
        removeMarker('.odd-flow-state-dirty');
      }
    }

    if (toolName === 'mcp__odd-flow__coordination_sync') {
      const state = readState();
      if (state?.currentPhase === 'build') {
        touchMarker('.odd-flow-agents-ready');
        touchMarker('.odd-flow-phase-synced');
      }
    }

    if (warnings.length > 0) return { warnings };
  };
}

export function createChatHook(readState) {
  return () => {
    const state = readState();
    if (!state || state.currentPhase !== 'build') return;
    if (state.buildMode === 'debug') {
      return { warnings: [`ODD DEBUG MODE: ${state.debugStrategy || 'Choose a strategy'} — keep the work inside the active outcome and return to verification when the fix is ready.`] };
    }
    if (markerExists('.odd-flow-state-dirty')) {
      return { warnings: ['ODD STATE NOT SAVED: A git commit was made but state was not stored to odd-flow. Store it now.'] };
    }
    if (markerExists('.checkpoint-dirty')) {
      return { warnings: ['ODD CHECKPOINT DIRTY: Source changes have not passed a fresh security scan yet. Run Checkpoint before verification or commit.'] };
    }

    const swarmPath = resolve(process.cwd(), '.odd', '.odd-flow-swarm-active');
    if (!markerValid(swarmPath, 3600000)) {
      const stale = markerExists('.odd-flow-swarm-active') ? ' (marker expired — re-init required)' : '';
      return { warnings: [`ODD SWARM GUARD: You are in build phase. The odd-flow swarm must be initialised before any build action.${stale}`] };
    }
  };
}
