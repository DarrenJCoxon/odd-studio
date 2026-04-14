import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

const STATE_TEMPLATE = path.resolve(import.meta.dirname, '..', 'templates', '.odd', 'state.json');

describe('state.json schema (audit #11)', () => {
  let schema;

  it('loads without error', async () => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(schema).toBeDefined();
  });

  it('has a version field', async () => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(schema.version).toBeDefined();
    expect(typeof schema.version).toBe('string');
  });

  const requiredFields = [
    'version',
    'projectName',
    'initialisedAt',
    'lastSaved',
    'lastCommit',
    'lastCommitAt',
    'currentPhase',
    'planningPhase',
    'currentStep',
    'personas',
    'outcomes',
    'contractsMapped',
    'planApproved',
    'techStackDecided',
    'designApproachDecided',
    'architectureDocGenerated',
    'servicesConfigured',
    'sessionBriefExported',
    'sessionBriefCount',
    'briefConfirmed',
    'verificationConfirmed',
    'swarmActive',
    'buildPhase',
    'currentBuildPhase',
    'buildMode',
    'debugStrategy',
    'debugTarget',
    'debugSummary',
    'debugStartedAt',
    'checkpointStatus',
    'lastCheckpointAt',
    'checkpointFindings',
    'securityBaselineVersion',
    'notes',
  ];

  it.each(requiredFields)('includes field: %s', async (field) => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(field in schema).toBe(true);
  });

  it('has currentPhase field that hooks depend on', async () => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(schema.currentPhase).toBe('planning');
  });

  it('has briefConfirmed field that hooks depend on', async () => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(schema.briefConfirmed).toBe(false);
  });

  it('has verificationConfirmed field that hooks depend on', async () => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(schema.verificationConfirmed).toBe(false);
  });

  it('has swarmActive field that plugin depends on', async () => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(schema.swarmActive).toBe(false);
  });

  it('has sessionBriefCount field that commands depend on', async () => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(schema.sessionBriefCount).toBe(0);
  });

  it('starts outside debug mode', async () => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(schema.buildMode).toBe('idle');
    expect(schema.debugStrategy).toBe(null);
  });

  it('starts with unknown checkpoint status', async () => {
    schema = await fs.readJson(STATE_TEMPLATE);
    expect(schema.checkpointStatus).toBe('unknown');
    expect(schema.checkpointFindings).toBe(0);
  });
});
