import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProjectManager } from '../src/core/project-manager';
import { initializeDatabase, closeDatabase } from '../src/db/client';

describe('Project Manager', () => {
  let tempDir: string;
  let sampleProjectDir: string;
  let mgr: ProjectManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-proj-test-'));
    process.env.CPM_HOME = tempDir;
    process.env.CPM_DB_PATH = path.join(tempDir, 'test.db');
    initializeDatabase(process.env.CPM_DB_PATH);

    sampleProjectDir = path.join(tempDir, 'DemoApp');
    fs.mkdirSync(sampleProjectDir);

    mgr = new ProjectManager();
  });

  afterEach(() => {
    closeDatabase();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should add, get, list, and remove projects', () => {
    const proj = mgr.addProject('DemoApp', sampleProjectDir, 'AUTO');
    expect(proj.name).toBe('DemoApp');
    expect(proj.path.toLowerCase()).toBe(path.resolve(sampleProjectDir).toLowerCase());

    const retrieved = mgr.getProject('DemoApp');
    expect(retrieved?.id).toBe(proj.id);

    const byPath = mgr.getProjectByPath(sampleProjectDir);
    expect(byPath?.name).toBe('DemoApp');

    const all = mgr.listProjects();
    expect(all.length).toBe(1);

    const removed = mgr.removeProject('DemoApp');
    expect(removed).toBe(true);

    expect(mgr.getProject('DemoApp')).toBeNull();
  });

  it('should reject non-existent directory paths', () => {
    expect(() => {
      mgr.addProject('FakeProj', path.join(tempDir, 'does-not-exist'));
    }).toThrow(/Directory does not exist/);
  });
});
