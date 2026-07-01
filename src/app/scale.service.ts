import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';
import { createClient } from '@supabase/supabase-js';
import { supabaseEnv } from './supabase-env';

declare const process: any;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export interface SpecialDate {
  description: string;
  date: string; // "YYYY-MM-DD" or "MM-DD"
  priority: number; // 1 (inegociável) to 5
}

export interface FolgaRequest {
  date: string; // "YYYY-MM-DD"
  isPreSelected?: boolean;
}

export interface Collaborator {
  id: string;
  name: string;
  role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR';
  hours: string;
  group: string;
  shift: string;
  sector: 'AERÓDROMO' | 'VIP' | 'TREINAMENTO';
  bhBalance: number;
  score: number;
  scale: { [day: number]: string }; // Day 1 to 30 of June 2026
  photo?: string;
  birthday?: string; // Format: "YYYY-MM-DD"
  specialDates?: SpecialDate[];
  folgaRequests?: FolgaRequest[];
}

export interface ShiftType {
  code: string;
  label: string;
  hours: string;
  color: string;
  startTime?: string;
  endTime?: string;
}

export interface SiglaType {
  code: string;
  label: string;
  color: string;
  description?: string;
}

export interface BackupHistory {
  id: string;
  timestamp: string;
  author: string;
  action: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScaleService {
  // Selected state signals
  selectedCollabName = signal<string | null>(null);
  currentRole = signal<'SUPERVISOR' | 'LIDER' | 'OPERADOR'>('SUPERVISOR');

  // Real-time synchronization lists via signals
  collaborators = signal<Collaborator[]>([]);
  shiftTypes = signal<ShiftType[]>([]);
  siglaTypes = signal<SiglaType[]>([]);
  auditHistory = signal<BackupHistory[]>([]);

  // Helper to resolve initial Supabase URL
  private getInitialSupabaseUrl(): string {
    const stored = localStorage.getItem('supabase_url');
    if (stored) return stored;

    if (supabaseEnv && supabaseEnv.url) {
      return supabaseEnv.url;
    }

    const windowUrl = (window as any)['SUPABASE_URL'] || (window as any)['env']?.['SUPABASE_URL'];
    if (windowUrl) {
      localStorage.setItem('supabase_url', windowUrl);
      return windowUrl;
    }

    const processUrl = typeof process !== 'undefined' ? process?.env?.['SUPABASE_URL'] || process?.env?.['NG_APP_SUPABASE_URL'] : '';
    if (processUrl) {
      localStorage.setItem('supabase_url', processUrl);
      return processUrl;
    }

    const importMetaUrl = (import.meta as any).env?.['SUPABASE_URL'] || (import.meta as any).env?.['NG_APP_SUPABASE_URL'] || (import.meta as any).env?.['VITE_SUPABASE_URL'];
    if (importMetaUrl) {
      localStorage.setItem('supabase_url', importMetaUrl);
      return importMetaUrl;
    }

    return 'https://vefyegxmvjficncbetyp.supabase.co';
  }

  // Helper to resolve initial Supabase Key
  private getInitialSupabaseKey(): string {
    const stored = localStorage.getItem('supabase_key');
    if (stored) return stored;

    if (supabaseEnv && supabaseEnv.key) {
      return supabaseEnv.key;
    }

    const windowKey = (window as any)['SUPABASE_KEY'] || (window as any)['env']?.['SUPABASE_KEY'];
    if (windowKey) {
      localStorage.setItem('supabase_key', windowKey);
      return windowKey;
    }

    const processKey = typeof process !== 'undefined' ? process?.env?.['SUPABASE_KEY'] || process?.env?.['NG_APP_SUPABASE_KEY'] : '';
    if (processKey) {
      localStorage.setItem('supabase_key', processKey);
      return processKey;
    }

    const importMetaKey = (import.meta as any).env?.['SUPABASE_KEY'] || (import.meta as any).env?.['NG_APP_SUPABASE_KEY'] || (import.meta as any).env?.['VITE_SUPABASE_KEY'];
    if (importMetaKey) {
      localStorage.setItem('supabase_key', importMetaKey);
      return importMetaKey;
    }

    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZnllZ3htdmpmaWNuY2JldHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNjYwMjksImV4cCI6MjA5Nzg0MjAyOX0.ioaZkwS98123Jb2xw2l6vev3FgoLwIVwsitg7pTew7c';
  }

  // Database Connection Configuration
  activeDb = signal<'firebase' | 'supabase'>(
    (localStorage.getItem('active_db') as 'firebase' | 'supabase') || 'supabase'
  );
  supabaseUrl = signal<string>(this.getInitialSupabaseUrl());
  supabaseKey = signal<string>(this.getInitialSupabaseKey());
  databaseError = signal<string | null>(null);

  // Firebase Initialization - Defensive getFirestore to avoid any initialization or undefined databaseId crash
  private app = initializeApp(firebaseConfig);
  private db = (() => {
    try {
      if (firebaseConfig.databaseId) {
        return initializeFirestore(this.app, {
          experimentalForceLongPolling: true
        }, firebaseConfig.databaseId);
      } else {
        return initializeFirestore(this.app, {
          experimentalForceLongPolling: true
        });
      }
    } catch (e) {
      console.warn('Fallback to standard getFirestore:', e);
      return getFirestore(this.app);
    }
  })();

  // Supabase Client Reference
  private supabase: any = null;
  private firebaseUnsubscribes: (() => void)[] = [];

  constructor() {
    const storedDb = localStorage.getItem('active_db');
    if (storedDb === 'firebase' || storedDb === 'supabase') {
      this.activeDb.set(storedDb);
    } else if (supabaseEnv && supabaseEnv.url && supabaseEnv.key) {
      this.activeDb.set('supabase');
      localStorage.setItem('active_db', 'supabase');
    } else {
      this.activeDb.set('firebase');
      localStorage.setItem('active_db', 'firebase');
    }
    
    if (this.activeDb() === 'firebase') {
      this.initFirebaseSync();
    } else {
      this.initSupabase();
    }
  }

  setDatabaseProvider(provider: 'firebase' | 'supabase') {
    this.activeDb.set(provider);
    localStorage.setItem('active_db', provider);
    this.databaseError.set(null);
    if (provider === 'supabase') {
      this.clearFirebaseSync();
      this.initSupabase();
    } else {
      this.initFirebaseSync();
    }
  }

  setSupabaseConfig(url: string, key: string) {
    this.supabaseUrl.set(url);
    this.supabaseKey.set(key);
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    this.setDatabaseProvider('supabase');
  }

  initSupabase() {
    const url = this.supabaseUrl();
    const key = this.supabaseKey();
    if (url && key) {
      try {
        this.supabase = createClient(url, key);
        this.databaseError.set(null);
        this.syncSupabase();
      } catch (err: any) {
        console.error('Erro ao inicializar Supabase:', err);
        this.databaseError.set(err.message || 'Erro ao inicializar cliente Supabase');
      }
    } else {
      this.supabase = null;
      if (this.activeDb() === 'supabase') {
        this.databaseError.set('URL ou Chave Anon do Supabase não configurados.');
        this.collaborators.set([]);
        this.shiftTypes.set([]);
        this.siglaTypes.set([]);
        this.auditHistory.set([]);
      }
    }
  }

  syncSupabase() {
    if (!this.supabase) return;
    this.databaseError.set(null);

    // Fetch from table systems on Supabase (colaboradores, escala_diaria, sigla_types, shift_types, audit_history)
    const queryCollabs = Promise.resolve(this.supabase.from('colaboradores').select('*')).catch((err: any) => ({ error: err, data: null }));
    const queryEscala = Promise.resolve(this.supabase.from('escala_diaria').select('*').eq('month', 7).eq('year', 2026)).catch((err: any) => ({ error: err, data: null }));
    const querySiglas = Promise.resolve(this.supabase.from('sigla_types').select('*')).catch((err: any) => ({ error: err, data: null }));
    const queryShifts = Promise.resolve(this.supabase.from('shift_types').select('*')).catch((err: any) => ({ error: err, data: null }));
    const queryAudit = Promise.resolve(this.supabase.from('audit_history').select('*')).catch((err: any) => ({ error: err, data: null }));

    Promise.all([queryCollabs, queryEscala, querySiglas, queryShifts, queryAudit])
      .then(([collabsResult, escalaResult, siglasResult, shiftsResult, auditResult]: any[]) => {
        if (this.activeDb() !== 'supabase') return;

        const collabsError = collabsResult.error;
        const collabsData = collabsResult.data;
        const escalaError = escalaResult.error;
        const escalaData = escalaResult.data;

        if (collabsError) {
          console.error('Supabase colaboradores error:', collabsError);
          this.databaseError.set(`Erro ao carregar colaboradores do Supabase: ${collabsError.message}`);
          this.collaborators.set([]);
          return;
        }

        // 1. Sync Siglas (No Seed)
        const siglasError = siglasResult?.error;
        const siglasData = siglasResult?.data;
        if (siglasError) {
          console.error('Supabase sigla_types error:', siglasError);
          this.siglaTypes.set([]);
        } else {
          this.siglaTypes.set(siglasData || []);
        }

        // 2. Sync Shift Types (No Seed)
        const shiftsError = shiftsResult?.error;
        const shiftsData = shiftsResult?.data;
        if (shiftsError) {
          console.error('Supabase shift_types error:', shiftsError);
          this.shiftTypes.set([]);
        } else {
          this.shiftTypes.set(shiftsData || []);
        }

        // 3. Sync Audit History (No Seed)
        const auditError = auditResult?.error;
        const auditData = auditResult?.data;
        if (auditError) {
          console.error('Supabase audit_history error:', auditError);
          this.auditHistory.set([]);
        } else {
          const sortedAudit = [...(auditData || [])];
          sortedAudit.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));
          this.auditHistory.set(sortedAudit);
        }

        // 4. Sync Collaborators & Daily Scales (No Seed)
        if (!collabsData || collabsData.length === 0) {
          this.collaborators.set([]);
        } else {
          // Group scales by collaborator_id
          const scaleMap: { [collabId: string]: { [day: number]: string } } = {};
          if (escalaData) {
            escalaData.forEach((row: any) => {
              if (!scaleMap[row.collaborator_id]) {
                scaleMap[row.collaborator_id] = {};
              }
              scaleMap[row.collaborator_id][row.day] = row.value || 'F';
            });
          }

          // Map database records to Collaborator interface
          const mappedCollabs: Collaborator[] = collabsData.map((row: any, index: number) => {
            // If this collaborator has no scale in database yet, initialize one as blank (-)
            let scale = scaleMap[row.id];
            if (!scale) {
              scale = {};
              for (let d = 1; d <= 31; d++) {
                scale[d] = '-';
              }
            }

            return {
              id: row.id,
              name: row.name || 'Sem Nome',
              role: row.role || 'OPERADOR',
              hours: row.schedule || '7h20',
              group: row.grupo || 'Madrugada',
              shift: row.shift || 'MADRUGADA',
              sector: row.sector || 'AERÓDROMO',
              bhBalance: row.bh_balance || 0,
              score: row.score || 90,
              scale: scale,
              birthday: row.birthday || '',
              specialDates: typeof row.special_dates === 'string' ? JSON.parse(row.special_dates) : (row.special_dates || []),
              folgaRequests: typeof row.folga_requests === 'string' ? JSON.parse(row.folga_requests) : (row.folga_requests || [])
            };
          });

          mappedCollabs.sort((a, b) => a.id.localeCompare(b.id));
          console.log('Supabase sync loaded colaboradores count:', mappedCollabs.length);
          this.collaborators.set(mappedCollabs);
        }
      })
      .catch((err: any) => {
        console.error('Promise.all error syncing Supabase:', err);
        if (this.activeDb() === 'supabase') {
          this.databaseError.set(`Erro de conexão com o Supabase.`);
          this.collaborators.set([]);
          this.shiftTypes.set([]);
          this.siglaTypes.set([]);
          this.auditHistory.set([]);
        }
      });
  }

  private initFirebaseSync() {
    this.clearFirebaseSync();
    if (this.activeDb() !== 'firebase') return;

    // 1. Listen to Collaborators
    const collCollab = collection(this.db, 'collaborators');
    const unsubCollab = onSnapshot(collCollab, (snapshot) => {
      if (this.activeDb() !== 'firebase') return;
      const list: Collaborator[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Collaborator);
      });
      list.sort((a, b) => a.id.localeCompare(b.id));
      this.collaborators.set(list);
    }, (error) => {
      if (this.activeDb() === 'firebase') {
        handleFirestoreError(error, OperationType.GET, 'collaborators');
      }
    });
    this.firebaseUnsubscribes.push(unsubCollab);

    // 2. Listen to Shift Types
    const collShifts = collection(this.db, 'shiftTypes');
    const unsubShifts = onSnapshot(collShifts, (snapshot) => {
      if (this.activeDb() !== 'firebase') return;
      const list: ShiftType[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as ShiftType);
      });
      this.shiftTypes.set(list);
    }, (error) => {
      if (this.activeDb() === 'firebase') {
        handleFirestoreError(error, OperationType.GET, 'shiftTypes');
      }
    });
    this.firebaseUnsubscribes.push(unsubShifts);

    // 3. Listen to Sigla Types
    const collSiglas = collection(this.db, 'siglaTypes');
    const unsubSiglas = onSnapshot(collSiglas, (snapshot) => {
      if (this.activeDb() !== 'firebase') return;
      const list: SiglaType[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as SiglaType);
      });
      this.siglaTypes.set(list);
    }, (error) => {
      if (this.activeDb() === 'firebase') {
        handleFirestoreError(error, OperationType.GET, 'siglaTypes');
      }
    });
    this.firebaseUnsubscribes.push(unsubSiglas);

    // 4. Listen to Audit History
    const collAudit = collection(this.db, 'auditHistory');
    const unsubAudit = onSnapshot(collAudit, (snapshot) => {
      if (this.activeDb() !== 'firebase') return;
      const list: BackupHistory[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as BackupHistory);
      });
      list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      this.auditHistory.set(list);
    }, (error) => {
      if (this.activeDb() === 'firebase') {
        handleFirestoreError(error, OperationType.GET, 'auditHistory');
      }
    });
    this.firebaseUnsubscribes.push(unsubAudit);
  }

  private clearFirebaseSync() {
    this.firebaseUnsubscribes.forEach(unsub => {
      try {
        unsub();
      } catch (e) {}
    });
    this.firebaseUnsubscribes = [];
  }

  // Database operations
  getAutoPreSelectedFolgas(collab: Collaborator): FolgaRequest[] {
    const preSelected: FolgaRequest[] = [];
    
    // 1. Check birthday (Month 7 - July)
    if (collab.birthday) {
      const parts = collab.birthday.split('-'); // YYYY-MM-DD
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (m === 7) { // July
          preSelected.push({
            date: `2026-07-${String(d).padStart(2, '0')}`,
            isPreSelected: true
          });
        }
      }
    }
    
    // 2. Check special dates (Month 7 - July)
    if (collab.specialDates && Array.isArray(collab.specialDates)) {
      const sorted = [...collab.specialDates].sort((a, b) => a.priority - b.priority);
      for (const sd of sorted) {
        if (!sd.date) continue;
        const parts = sd.date.split('-');
        if (parts.length === 3) {
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (m === 7) {
            const dateStr = `2026-07-${String(d).padStart(2, '0')}`;
            if (!preSelected.some(p => p.date === dateStr)) {
              preSelected.push({
                date: dateStr,
                isPreSelected: true
              });
            }
          }
        }
      }
    }
    
    return preSelected.slice(0, 3);
  }

  refreshPreSelectedFolgas(collab: Collaborator, forceApplyToScale = false): Collaborator {
    const preSelected = this.getAutoPreSelectedFolgas(collab);
    const manualRequests = (collab.folgaRequests || []).filter(r => !r.isPreSelected);
    const newList: FolgaRequest[] = [...preSelected];
    
    for (const req of manualRequests) {
      if (newList.length < 3) {
        if (!newList.some(p => p.date === req.date)) {
          newList.push(req);
        }
      }
    }
    
    const updatedScale = { ...collab.scale };
    if (forceApplyToScale) {
      newList.forEach(req => {
        const parts = req.date.split('-');
        if (parts.length === 3) {
          const d = parseInt(parts[2], 10);
          updatedScale[d] = 'F';
        }
      });
    }

    return {
      ...collab,
      folgaRequests: newList,
      scale: updatedScale
    };
  }

  requestFolga(collabId: string, date: string, simulatedDay: number): { success: boolean, message: string } {
    if (simulatedDay > 10) {
      return { success: false, message: 'Escolha indisponível. Solicitações de folga são permitidas apenas do dia 1 ao dia 10 do mês anterior.' };
    }

    const collabs = this.collaborators();
    const targetCollab = collabs.find(c => c.id === collabId);
    if (!targetCollab) {
      return { success: false, message: 'Colaborador não encontrado.' };
    }

    const currentRequests = targetCollab.folgaRequests || [];
    
    if (currentRequests.some(r => r.date === date)) {
      return { success: false, message: 'Você já solicitou folga para este dia.' };
    }

    if (currentRequests.length >= 3) {
      return { success: false, message: 'Limite de 3 folgas mensais atingido.' };
    }

    // Check count of other collabs requesting the same day
    const count = collabs.filter(c => (c.folgaRequests || []).some(r => r.date === date)).length;
    if (count >= 2) {
      return { success: false, message: 'Data indisponível. O limite de 2 colaboradores para esta data já foi atingido.' };
    }

    const updatedRequests = [...currentRequests, { date, isPreSelected: false }];
    let updatedCollab: Collaborator = { ...targetCollab, folgaRequests: updatedRequests };

    const parts = date.split('-');
    if (parts.length === 3) {
      const dayNum = parseInt(parts[2], 10);
      updatedCollab.scale = { ...targetCollab.scale, [dayNum]: 'F' };
    }

    updatedCollab = this.refreshPreSelectedFolgas(updatedCollab);
    this.updateCollaborator(updatedCollab);
    this.addAuditHistory('SOLICITACAO_FOLGA', `Colaborador ${targetCollab.name} solicitou folga para o dia ${date}.`);
    
    return { success: true, message: 'Folga solicitada com sucesso!' };
  }

  removeFolga(collabId: string, date: string, simulatedDay: number): { success: boolean, message: string } {
    if (simulatedDay > 10) {
      return { success: false, message: 'Escolha indisponível. Solicitações de folga são permitidas apenas do dia 1 ao dia 10 do mês anterior.' };
    }

    const collabs = this.collaborators();
    const targetCollab = collabs.find(c => c.id === collabId);
    if (!targetCollab) {
      return { success: false, message: 'Colaborador não encontrado.' };
    }

    const currentRequests = targetCollab.folgaRequests || [];
    const targetRequest = currentRequests.find(r => r.date === date);
    if (!targetRequest) {
      return { success: false, message: 'Solicitação não encontrada.' };
    }

    if (targetRequest.isPreSelected) {
      return { success: false, message: 'Não é possível remover folga pré-selecionada de aniversário ou data magna.' };
    }

    const updatedRequests = currentRequests.filter(r => r.date !== date);
    let updatedCollab: Collaborator = { ...targetCollab, folgaRequests: updatedRequests };

    const parts = date.split('-');
    if (parts.length === 3) {
      const dayNum = parseInt(parts[2], 10);
      const defaultShiftCode = targetCollab.shift === 'MADRUGADA' ? 'N' : targetCollab.shift === 'TARDE' ? 'T' : targetCollab.shift === 'ADMINISTRATIVO' ? 'ADM' : 'M';
      updatedCollab.scale = { ...targetCollab.scale, [dayNum]: defaultShiftCode };
    }

    updatedCollab = this.refreshPreSelectedFolgas(updatedCollab);
    this.updateCollaborator(updatedCollab);
    this.addAuditHistory('SOLICITACAO_FOLGA_REMOVIDA', `Colaborador ${targetCollab.name} removeu folga de ${date}.`);
    
    return { success: true, message: 'Folga removida com sucesso!' };
  }

  async addCollaborator(
    name: string,
    role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR',
    hours: string,
    group: string,
    shift: string,
    sector: 'AERÓDROMO' | 'VIP' | 'TREINAMENTO',
    bh: number,
    score: number,
    photo?: string,
    birthday?: string,
    specialDates?: SpecialDate[],
    folgaRequests?: FolgaRequest[]
  ) {
    if (!name.trim()) return;
    const id = 'collab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    
    // Initialize standard scale (5 days work, 2 days off) for July 2026
    const initialScale: { [day: number]: string } = {};
    const defaultShiftCode = shift === 'MADRUGADA' ? 'N' : shift === 'TARDE' ? 'T' : shift === 'ADMINISTRATIVO' ? 'ADM' : 'M';
    for (let d = 1; d <= 31; d++) {
      const dayOfWeek = (d + 2) % 7; // July 1st, 2026 is a Wednesday (Index 3)
      if (dayOfWeek === 6 || dayOfWeek === 0) {
        initialScale[d] = 'F';
      } else {
        initialScale[d] = defaultShiftCode;
      }
    }

    let newCollab: Collaborator = {
      id,
      name,
      role,
      hours,
      group,
      shift,
      sector,
      bhBalance: bh,
      score,
      scale: initialScale,
      photo: photo || undefined,
      birthday: birthday || '',
      specialDates: specialDates || [],
      folgaRequests: folgaRequests || []
    };

    newCollab = this.refreshPreSelectedFolgas(newCollab, true);

    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const dbRow = {
          id: newCollab.id,
          name: newCollab.name,
          role: newCollab.role,
          schedule: newCollab.hours,
          grupo: newCollab.group,
          shift: newCollab.shift,
          sector: newCollab.sector,
          bh_balance: newCollab.bhBalance,
          score: newCollab.score,
          birthday: newCollab.birthday || null,
          special_dates: newCollab.specialDates ? JSON.stringify(newCollab.specialDates) : null,
          folga_requests: newCollab.folgaRequests ? JSON.stringify(newCollab.folgaRequests) : null
        };
        const upRes = await this.supabase.from('colaboradores').upsert(dbRow);
        if (upRes.error) throw upRes.error;

        const scaleRows = [];
        for (let d = 1; d <= 31; d++) {
          scaleRows.push({
            collaborator_id: newCollab.id,
            day: d,
            month: 7,
            year: 2026,
            value: newCollab.scale[d] || 'F'
          });
        }
        const upScaleRes = await this.supabase.from('escala_diaria').upsert(scaleRows);
        if (upScaleRes.error) throw upScaleRes.error;

        this.syncSupabase();
        this.addAuditHistory('CADASTRO_COLABORADOR', `Colaborador ${name} cadastrado no Supabase.`);
      } catch (err: any) {
        console.error(err);
        this.databaseError.set(`Falha ao salvar no Supabase: ${err.message || err}`);
      }
    } else {
      setDoc(doc(this.db, 'collaborators', id), newCollab).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `collaborators/${id}`);
      });
      this.addAuditHistory('CADASTRO_COLABORADOR', `Colaborador ${name} cadastrado no Firebase.`);
    }
  }

  async removeCollaborator(id: string) {
    const target = this.collaborators().find(c => c.id === id);
    if (!target) return;

    // Update local state optimistically
    const list = this.collaborators();
    this.collaborators.set(list.filter(c => c.id !== id));

    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const delScaleRes = await this.supabase.from('escala_diaria').delete().eq('collaborator_id', id);
        if (delScaleRes.error) throw delScaleRes.error;

        const delCollabRes = await this.supabase.from('colaboradores').delete().eq('id', id);
        if (delCollabRes.error) throw delCollabRes.error;

        this.syncSupabase();
        this.addAuditHistory('REMOCAO_COLABORADOR', `Colaborador ${target.name} removido do Supabase.`);
      } catch (err: any) {
        console.error(err);
        // Rollback on error
        this.collaborators.set(list);
        this.databaseError.set(`Falha ao remover colaborador: ${err.message || err}`);
      }
    } else {
      deleteDoc(doc(this.db, 'collaborators', id))
        .then(() => {
          this.addAuditHistory('REMOCAO_COLABORADOR', `Colaborador ${target.name} removido do Firebase.`);
        })
        .catch((err) => {
          // Rollback on error
          this.collaborators.set(list);
          handleFirestoreError(err, OperationType.DELETE, `collaborators/${id}`);
        });
    }
  }

  async updateCollaborator(col: Collaborator) {
    const refreshedCol = this.refreshPreSelectedFolgas(col);

    // Optimistically update local state to make the UI instant and prevent concurrent click race conditions
    const list = this.collaborators();
    const index = list.findIndex(c => c.id === col.id);
    if (index !== -1) {
      const updated = [...list];
      updated[index] = refreshedCol;
      this.collaborators.set(updated);
    }

    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const dbRow = {
          id: refreshedCol.id,
          name: refreshedCol.name,
          role: refreshedCol.role,
          schedule: refreshedCol.hours,
          grupo: refreshedCol.group,
          shift: refreshedCol.shift,
          sector: refreshedCol.sector,
          bh_balance: refreshedCol.bhBalance,
          score: refreshedCol.score,
          birthday: refreshedCol.birthday || null,
          special_dates: refreshedCol.specialDates ? JSON.stringify(refreshedCol.specialDates) : null,
          folga_requests: refreshedCol.folgaRequests ? JSON.stringify(refreshedCol.folgaRequests) : null
        };
        const upRes = await this.supabase.from('colaboradores').upsert(dbRow);
        if (upRes.error) throw upRes.error;

        const scaleRows = [];
        for (let d = 1; d <= 31; d++) {
          scaleRows.push({
            collaborator_id: refreshedCol.id,
            day: d,
            month: 7,
            year: 2026,
            value: refreshedCol.scale[d] || 'F'
          });
        }
        const upScaleRes = await this.supabase.from('escala_diaria').upsert(scaleRows);
        if (upScaleRes.error) throw upScaleRes.error;

        this.syncSupabase();
      } catch (err: any) {
        console.error('Error in updateCollaborator:', err);
        this.databaseError.set(`Falha ao atualizar colaborador: ${err.message || err.details || err.hint || JSON.stringify(err)}`);
        // Rollback state on error
        this.syncSupabase();
      }
    } else {
      setDoc(doc(this.db, 'collaborators', refreshedCol.id), refreshedCol).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `collaborators/${refreshedCol.id}`);
      });
    }
  }

  async clearAllScales() {
    const list = this.collaborators();
    if (!list || list.length === 0) return;

    const updatedList = list.map(collab => {
      const emptyScale: { [day: number]: string } = {};
      for (let d = 1; d <= 31; d++) {
        emptyScale[d] = '-';
      }
      return { ...collab, folgaRequests: [], scale: emptyScale };
    });
    this.collaborators.set(updatedList);

    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const collabRows: any[] = [];
        
        updatedList.forEach(refreshed => {
          collabRows.push({
            id: refreshed.id,
            name: refreshed.name,
            role: refreshed.role,
            schedule: refreshed.hours,
            grupo: refreshed.group,
            shift: refreshed.shift,
            sector: refreshed.sector,
            bh_balance: refreshed.bhBalance,
            score: refreshed.score,
            birthday: refreshed.birthday || null,
            special_dates: refreshed.specialDates ? JSON.stringify(refreshed.specialDates) : null,
            folga_requests: JSON.stringify([])
          });
        });

        const upRes = await this.supabase.from('colaboradores').upsert(collabRows);
        if (upRes.error) throw upRes.error;

        // Physically delete all scale rows for month 7 and year 2026 in the database to completely wipe the records.
        // This ensures the data is truly deleted from the database!
        const delScaleRes = await this.supabase.from('escala_diaria').delete().eq('month', 7).eq('year', 2026);
        if (delScaleRes.error) throw delScaleRes.error;

        this.syncSupabase();
        this.addAuditHistory('LIMPAR_ESCALA', 'Toda a escala mensal de trabalho foi redefinida para Sem Definição (-).');
      } catch (err: any) {
        console.error('Error in clearAllScales:', err);
        this.databaseError.set(`Falha ao limpar escala: ${err.message || err.details || err.hint || JSON.stringify(err)}`);
      }
    } else {
      const promises = updatedList.map(refreshed => {
        return setDoc(doc(this.db, 'collaborators', refreshed.id), refreshed);
      });

      Promise.all(promises)
        .then(() => {
          this.addAuditHistory('LIMPAR_ESCALA', 'Toda a escala mensal de trabalho foi redefinida para Sem Definição (-).');
        })
        .catch((err) => {
          console.error('Error clearing scales in Firebase:', err);
        });
    }
  }

  async generateAutoScale() {
    const list = this.collaborators();
    if (!list || list.length === 0) return;

    const updatedList = list.map(collab => {
      const generatedScale: { [day: number]: string } = {};
      const baseShift = collab.shift === 'MADRUGADA' ? 'N' : collab.shift === 'TARDE' ? 'T' : collab.shift === 'ADMINISTRATIVO' ? 'ADM' : 'M';
      
      for (let d = 1; d <= 31; d++) {
        const dayOfWeek = (d + 2) % 7; // July 1st, 2026 is a Wednesday (Index 3)
        const isWeekend = (dayOfWeek === 6 || dayOfWeek === 0);
        if (isWeekend) {
          generatedScale[d] = 'F';
        } else {
          generatedScale[d] = baseShift;
        }
      }
      
      return this.refreshPreSelectedFolgas({ ...collab, scale: generatedScale }, true);
    });
    this.collaborators.set(updatedList);

    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const scaleRows: any[] = [];
        const collabRows: any[] = [];
        
        updatedList.forEach(refreshed => {
          for (let d = 1; d <= 31; d++) {
            scaleRows.push({
              collaborator_id: refreshed.id,
              day: d,
              month: 7,
              year: 2026,
              value: refreshed.scale[d] || 'F'
            });
          }
          
          collabRows.push({
            id: refreshed.id,
            name: refreshed.name,
            role: refreshed.role,
            schedule: refreshed.hours,
            grupo: refreshed.group,
            shift: refreshed.shift,
            sector: refreshed.sector,
            bh_balance: refreshed.bhBalance,
            score: refreshed.score,
            birthday: refreshed.birthday || null,
            special_dates: refreshed.specialDates ? JSON.stringify(refreshed.specialDates) : null,
            folga_requests: refreshed.folgaRequests ? JSON.stringify(refreshed.folgaRequests) : null
          });
        });

        const upRes = await this.supabase.from('colaboradores').upsert(collabRows);
        if (upRes.error) throw upRes.error;

        // Perform a single atomic bulk upsert for all scale rows.
        const upScaleRes = await this.supabase.from('escala_diaria').upsert(scaleRows);
        if (upScaleRes.error) throw upScaleRes.error;

        this.syncSupabase();
        this.addAuditHistory('GERAR_AUTO', 'Escala mensal gerada com sucesso via algoritmo IA.');
      } catch (err: any) {
        console.error('Error in generateAutoScale:', err);
        this.databaseError.set(`Falha ao gerar escala: ${err.message || err.details || err.hint || JSON.stringify(err)}`);
      }
    } else {
      const promises = updatedList.map(refreshed => {
        return setDoc(doc(this.db, 'collaborators', refreshed.id), refreshed);
      });

      Promise.all(promises)
        .then(() => {
          this.addAuditHistory('GERAR_AUTO', 'Escala mensal gerada com sucesso via algoritmo IA.');
        })
        .catch((err) => {
          console.error('Error generating auto scale in Firebase:', err);
        });
    }
  }

  async addSiglaType(code: string, label: string, color: string, description: string) {
    if (!code || !label) return;
    const upperCode = code.toUpperCase().trim();
    const newSigla: SiglaType = {
      code: upperCode,
      label,
      color,
      description
    };

    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const res = await this.supabase.from('sigla_types').upsert(newSigla);
        if (res.error) throw res.error;
        this.syncSupabase();
        this.addAuditHistory('CADASTRO_SIGLA', `Nova sigla ${upperCode} cadastrada no Supabase.`);
      } catch (err: any) {
        console.error(err);
      }
    } else {
      setDoc(doc(this.db, 'siglaTypes', upperCode), newSigla).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `siglaTypes/${upperCode}`);
      });
      this.addAuditHistory('CADASTRO_SIGLA', `Nova sigla ${upperCode} cadastrada no Firebase.`);
    }
  }

  async removeSiglaType(code: string) {
    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const res = await this.supabase.from('sigla_types').delete().eq('code', code);
        if (res.error) throw res.error;
        this.syncSupabase();
        this.addAuditHistory('REMOCAO_SIGLA', `Sigla ${code} removida do Supabase.`);
      } catch (err: any) {
        console.error(err);
      }
    } else {
      deleteDoc(doc(this.db, 'siglaTypes', code)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `siglaTypes/${code}`);
      });
      this.addAuditHistory('REMOCAO_SIGLA', `Sigla ${code} removida do Firebase.`);
    }
  }

  async saveSiglaType(sigla: SiglaType) {
    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const res = await this.supabase.from('sigla_types').upsert(sigla);
        if (res.error) throw res.error;
        this.syncSupabase();
      } catch (err: any) {
        console.error(err);
      }
    } else {
      setDoc(doc(this.db, 'siglaTypes', sigla.code), sigla).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `siglaTypes/${sigla.code}`);
      });
    }
  }

  async saveShiftType(shift: ShiftType) {
    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const res = await this.supabase.from('shift_types').upsert(shift);
        if (res.error) throw res.error;
        this.syncSupabase();
      } catch (err: any) {
        console.error(err);
      }
    } else {
      setDoc(doc(this.db, 'shiftTypes', shift.code), shift).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `shiftTypes/${shift.code}`);
      });
    }
  }

  async removeShiftType(code: string) {
    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const res = await this.supabase.from('shift_types').delete().eq('code', code);
        if (res.error) throw res.error;
        this.syncSupabase();
      } catch (err: any) {
        console.error(err);
      }
    } else {
      deleteDoc(doc(this.db, 'shiftTypes', code)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `shiftTypes/${code}`);
      });
    }
  }

  async addAuditHistory(action: string, description: string) {
    const now = new Date();
    const ts = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const id = 'bk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const newHistory: BackupHistory = {
      id,
      timestamp: ts,
      author: this.selectedCollabName() || 'ADMINISTRADOR',
      action,
      description
    };

    if (this.activeDb() === 'supabase' && this.supabase) {
      try {
        const res = await this.supabase.from('audit_history').upsert(newHistory);
        if (res.error) throw res.error;
        this.syncSupabase();
      } catch (err: any) {
        console.error(err);
      }
    } else {
      setDoc(doc(this.db, 'auditHistory', id), newHistory).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `auditHistory/${id}`);
      });
    }
  }

}
