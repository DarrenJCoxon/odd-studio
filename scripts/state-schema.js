'use strict';

export const STATE_VERSION = '2.1.0';

export const STATE_DEFAULTS = {
  version: STATE_VERSION,
  projectName: null,
  initialisedAt: null,
  lastSaved: null,
  lastCommit: null,
  lastCommitAt: null,
  currentPhase: 'planning',
  planningPhase: 'not-started',
  currentStep: null,
  personas: [],
  outcomes: [],
  contractsMapped: false,
  planApproved: false,
  techStackDecided: false,
  designApproachDecided: false,
  architectureDocGenerated: false,
  servicesConfigured: false,
  sessionBriefExported: false,
  sessionBriefCount: 0,
  briefConfirmed: false,
  verificationConfirmed: false,
  swarmActive: false,
  buildPhase: null,
  currentBuildPhase: null,
  buildMode: 'idle',
  debugStrategy: null,
  debugTarget: null,
  debugSummary: null,
  debugStartedAt: null,
  checkpointStatus: 'unknown',
  lastCheckpointAt: null,
  checkpointFindings: 0,
  securityBaselineVersion: '2026-04-12',
  notes: '',
};

export function mergeStateWithDefaults(state = {}) {
  return {
    ...STATE_DEFAULTS,
    ...state,
    version: STATE_VERSION,
  };
}
