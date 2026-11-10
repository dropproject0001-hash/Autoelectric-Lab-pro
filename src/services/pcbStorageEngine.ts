/**
 * Persistent Project & Annotation Storage Engine for PCB Scanner
 * AutoElectric Lab Pro - RAMT Engineering Suite
 */

import { PCBProject, AuditHistoryRecord, DetectedComponent, ElectricalNet } from '../types/pcbScanner';

const STORAGE_KEY_PROJECTS = 'autoelectric_pcb_projects';

export class PcbStorageEngine {
  /**
   * Load all saved PCB projects from persistent storage
   */
  static loadProjects(): PCBProject[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load PCB projects from local storage:', e);
      return [];
    }
  }

  /**
   * Save a PCB project to persistent storage
   */
  static saveProject(project: PCBProject): void {
    try {
      const projects = this.loadProjects();
      const idx = projects.findIndex((p) => p.id === project.id);
      project.updatedAt = new Date().toISOString();

      if (idx >= 0) {
        projects[idx] = project;
      } else {
        projects.unshift(project);
      }

      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save PCB project:', e);
    }
  }

  /**
   * Delete a PCB project by ID
   */
  static deleteProject(projectId: string): void {
    try {
      const projects = this.loadProjects().filter((p) => p.id !== projectId);
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to delete PCB project:', e);
    }
  }

  /**
   * Append an audit history record to a project
   */
  static addAuditRecord(projectId: string, record: Omit<AuditHistoryRecord, 'id' | 'timestamp'>): PCBProject | null {
    const projects = this.loadProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return null;

    const fullRecord: AuditHistoryRecord = {
      ...record,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };

    project.auditHistory.unshift(fullRecord);
    this.saveProject(project);
    return project;
  }
}
