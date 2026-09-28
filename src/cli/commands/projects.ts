import prompts from 'prompts';
import path from 'path';
import pc from 'picocolors';
import { projectManager } from '../../core/project-manager';
import { renderTable, formatTimeAgo } from '../../terminal/tables';
import { Project } from '../../types';
import { logSuccess, logError } from '../../terminal/progress';

export function listProjectsCommand(): void {
  const projects = projectManager.listProjects();

  console.log('\n' + pc.bold('PROJECTS') + '\n');

  if (projects.length === 0) {
    console.log(pc.dim('  No projects registered yet. Run "cpm project add" to register a project.\n'));
    return;
  }

  const tableStr = renderTable<Project>(projects, [
    { header: 'NAME', render: (p) => pc.cyan(p.name) },
    { header: 'PATH', render: (p) => p.path },
    { header: 'PREFERRED ACCOUNT', render: (p) => p.preferredAccountId || 'AUTO' },
    { header: 'ADDED', render: (p) => formatTimeAgo(p.createdAt) },
  ]);

  console.log(tableStr);
  console.log('');
}

export async function addProjectCommand(nameArg?: string, pathArg?: string): Promise<void> {
  let name = nameArg;
  let dirPath = pathArg;

  if (!name || !dirPath) {
    const res = await prompts([
      {
        type: 'text',
        name: 'name',
        message: 'Project name:',
        initial: name || path.basename(process.cwd()),
        validate: (v: string) => (v && v.trim().length > 0 ? true : 'Name is required'),
      },
      {
        type: 'text',
        name: 'path',
        message: 'Project directory path:',
        initial: dirPath || process.cwd(),
        validate: (v: string) => (v && v.trim().length > 0 ? true : 'Path is required'),
      },
      {
        type: 'text',
        name: 'preferredAccount',
        message: 'Preferred account ID (or AUTO):',
        initial: 'AUTO',
      },
    ]);

    if (!res.name || !res.path) {
      console.log(pc.dim('Operation cancelled.'));
      return;
    }

    name = res.name;
    dirPath = res.path;
    try {
      const proj = projectManager.addProject(name!, dirPath!, res.preferredAccount);
      logSuccess(`Project "${proj.name}" added successfully.`);
      console.log(`  Path: ${proj.path}`);
      console.log(`  Preferred Account: ${proj.preferredAccountId}\n`);
    } catch (err: any) {
      logError(err.message);
    }
    return;
  }

  try {
    const proj = projectManager.addProject(name, dirPath);
    logSuccess(`Project "${proj.name}" registered successfully.`);
    console.log(`  Path: ${proj.path}\n`);
  } catch (err: any) {
    logError(err.message);
  }
}

export function removeProjectCommand(name: string): void {
  const removed = projectManager.removeProject(name);
  if (removed) {
    logSuccess(`Project "${name}" removed successfully.`);
  } else {
    logError(`Project "${name}" not found.`);
  }
}
