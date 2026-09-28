import path from 'path';
import fs from 'fs';
import { eq, or } from 'drizzle-orm';
import { getDb } from '../db/client';
import { projectsTable } from '../db/schema';
import { Project, NewProject } from '../types';

export class ProjectManager {
  public listProjects(): Project[] {
    const db = getDb();
    return db.select().from(projectsTable).all() as Project[];
  }

  public getProject(nameOrId: string): Project | null {
    const db = getDb();
    const clean = nameOrId.trim();
    const results = db
      .select()
      .from(projectsTable)
      .where(
        or(
          eq(projectsTable.id, clean),
          eq(projectsTable.name, clean)
        )
      )
      .all() as Project[];

    return results.length > 0 ? results[0] : null;
  }

  public getProjectByPath(targetPath: string): Project | null {
    const db = getDb();
    const normalized = path.resolve(targetPath).toLowerCase();
    const all = this.listProjects();
    return all.find((p) => path.resolve(p.path).toLowerCase() === normalized) || null;
  }

  public addProject(name: string, projectPath: string, preferredAccountId: string = 'AUTO'): Project {
    const cleanName = name.trim();
    const resolvedPath = path.resolve(projectPath);

    if (!cleanName) {
      throw new Error('Project name cannot be empty');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Directory does not exist: ${resolvedPath}`);
    }

    const existing = this.getProject(cleanName);
    if (existing) {
      throw new Error(`Project with name "${cleanName}" already exists.`);
    }

    const db = getDb();
    const id = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const now = Date.now();

    const newProject: NewProject = {
      id,
      name: cleanName,
      path: resolvedPath,
      preferredAccountId: preferredAccountId || 'AUTO',
      createdAt: now,
      updatedAt: now,
    };

    db.insert(projectsTable).values(newProject as any).run();
    return this.getProject(id)!;
  }

  public updateProject(nameOrId: string, updates: Partial<Pick<Project, 'name' | 'path' | 'preferredAccountId'>>): Project {
    const proj = this.getProject(nameOrId);
    if (!proj) {
      throw new Error(`Project "${nameOrId}" not found.`);
    }

    const db = getDb();
    const now = Date.now();

    const data: any = { updatedAt: now };
    if (updates.name) data.name = updates.name.trim();
    if (updates.path) data.path = path.resolve(updates.path);
    if (updates.preferredAccountId !== undefined) data.preferredAccountId = updates.preferredAccountId;

    db.update(projectsTable)
      .set(data)
      .where(eq(projectsTable.id, proj.id))
      .run();

    return this.getProject(proj.id)!;
  }

  public removeProject(nameOrId: string): boolean {
    const proj = this.getProject(nameOrId);
    if (!proj) {
      return false;
    }

    const db = getDb();
    db.delete(projectsTable).where(eq(projectsTable.id, proj.id)).run();
    return true;
  }
}

export const projectManager = new ProjectManager();
