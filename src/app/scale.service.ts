import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
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
    if (supabaseEnv && supabaseEnv.url) {
      localStorage.setItem('supabase_url', supabaseEnv.url);
      return supabaseEnv.url;
    }

    const stored = localStorage.getItem('supabase_url');
    if (stored) return stored;

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
    if (supabaseEnv && supabaseEnv.key) {
      localStorage.setItem('supabase_key', supabaseEnv.key);
      return supabaseEnv.key;
    }

    const stored = localStorage.getItem('supabase_key');
    if (stored) return stored;

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

  // Firebase Initialization
  private app = initializeApp(firebaseConfig);
  private db = initializeFirestore(this.app, {
    experimentalForceLongPolling: true
  }, firebaseConfig.databaseId || undefined);

  // Supabase Client Reference
  private supabase: any = null;

  constructor() {
    if (supabaseEnv && supabaseEnv.url && supabaseEnv.key) {
      this.activeDb.set('supabase');
      localStorage.setItem('active_db', 'supabase');
    }
    this.initFirebaseSync();
    this.initSupabase();
  }

  setDatabaseProvider(provider: 'firebase' | 'supabase') {
    this.activeDb.set(provider);
    localStorage.setItem('active_db', provider);
    this.databaseError.set(null);
    if (provider === 'supabase') {
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
        // Fill with default data locally so the UI has visual preview
        this.collaborators.set(this.getDefaultCollaborators());
        this.shiftTypes.set(this.getDefaultShiftTypes());
        this.siglaTypes.set(this.getDefaultSiglaTypes());
        this.auditHistory.set(this.getDefaultAuditHistory());
      }
    }
  }

  syncSupabase() {
    if (!this.supabase) return;
    this.databaseError.set(null);

    // Fetch from table systems on Supabase (colaboradores, escala_diaria, sigla_types, shift_types, audit_history)
    // Individual catches prevent a single missing table from failing the entire synchronization flow.
    const queryCollabs = Promise.resolve(this.supabase.from('colaboradores').select('*'));
    const queryEscala = Promise.resolve(this.supabase.from('escala_diaria').select('*').eq('month', 6).eq('year', 2026));
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
          this.collaborators.set(this.getDefaultCollaborators());
          return;
        }

        // 1. Sync & Seed Siglas
        const siglasError = siglasResult?.error;
        const siglasData = siglasResult?.data;
        if (siglasError || !siglasData || siglasData.length === 0) {
          const defaultSiglas = this.getDefaultSiglaTypes();
          this.siglaTypes.set(defaultSiglas);
          // Only attempt to seed if table exists and was just empty
          if (this.supabase && !siglasError && siglasData && siglasData.length === 0) {
            Promise.resolve(this.supabase.from('sigla_types').insert(defaultSiglas))
              .catch((err: any) => console.error('Erro ao semear sigla_types:', err));
          }
        } else {
          this.siglaTypes.set(siglasData);
        }

        // 2. Sync & Seed Shift Types
        const shiftsError = shiftsResult?.error;
        const shiftsData = shiftsResult?.data;
        if (shiftsError || !shiftsData || shiftsData.length === 0) {
          const defaultShifts = this.getDefaultShiftTypes();
          this.shiftTypes.set(defaultShifts);
          if (this.supabase && !shiftsError && shiftsData && shiftsData.length === 0) {
            Promise.resolve(this.supabase.from('shift_types').insert(defaultShifts))
              .catch((err: any) => console.error('Erro ao semear shift_types:', err));
          }
        } else {
          this.shiftTypes.set(shiftsData);
        }

        // 3. Sync & Seed Audit History
        const auditError = auditResult?.error;
        const auditData = auditResult?.data;
        if (auditError || !auditData || auditData.length === 0) {
          const defaultAudit = this.getDefaultAuditHistory();
          this.auditHistory.set(defaultAudit);
          if (this.supabase && !auditError && auditData && auditData.length === 0) {
            Promise.resolve(this.supabase.from('audit_history').insert(defaultAudit))
              .catch((err: any) => console.error('Erro ao semear audit_history:', err));
          }
        } else {
          const sortedAudit = [...auditData];
          sortedAudit.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));
          this.auditHistory.set(sortedAudit);
        }

        // 4. Sync Collaborators & Daily Scales
        if (!collabsData || collabsData.length === 0) {
          // Seed default collaborators
          const defaultCollabs = this.getDefaultCollaborators();
          this.collaborators.set(defaultCollabs);
          // Map back and save to colaboradores if empty
          const recordsToInsert = defaultCollabs.map(c => ({
            id: c.id,
            name: c.name,
            role: c.role,
            schedule: c.hours,
            grupo: c.group,
            shift: c.shift,
            sector: c.sector,
            bh_balance: c.bhBalance,
            score: c.score
          }));
          Promise.resolve(this.supabase.from('colaboradores').insert(recordsToInsert))
            .catch((err: any) => console.error('Erro ao semear colaboradores:', err));

          // Seeding scale too
          const scaleRecords: any[] = [];
          defaultCollabs.forEach(c => {
            for (let d = 1; d <= 30; d++) {
              scaleRecords.push({
                collaborator_id: c.id,
                day: d,
                month: 6,
                year: 2026,
                value: c.scale[d] || 'F'
              });
            }
          });
          Promise.resolve(this.supabase.from('escala_diaria').insert(scaleRecords))
            .catch((err: any) => console.error('Erro ao semear escala_diaria:', err));
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
          const mappedCollabs: Collaborator[] = collabsData.map((row: any) => {
            // If this collaborator has no scale in database yet, initialize one
            let scale = scaleMap[row.id];
            if (!scale) {
              scale = {};
              const defaultShiftCode = row.shift === 'MADRUGADA' ? 'N' : row.shift === 'TARDE' ? 'T' : row.shift === 'ADMINISTRATIVO' ? 'ADM' : 'M';
              for (let d = 1; d <= 30; d++) {
                if (d % 7 === 6 || d % 7 === 0) {
                  scale[d] = 'F';
                } else {
                  scale[d] = defaultShiftCode;
                }
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
          this.collaborators.set(mappedCollabs);
        }
      })
      .catch((err: any) => {
        console.error('Promise.all error syncing Supabase:', err);
        if (this.activeDb() === 'supabase') {
          this.databaseError.set(`Erro de conexão com o Supabase.`);
          this.collaborators.set(this.getDefaultCollaborators());
          this.shiftTypes.set(this.getDefaultShiftTypes());
          this.siglaTypes.set(this.getDefaultSiglaTypes());
          this.auditHistory.set(this.getDefaultAuditHistory());
        }
      });
  }

  private initFirebaseSync() {
    // 1. Listen to Collaborators
    const collCollab = collection(this.db, 'collaborators');
    onSnapshot(collCollab, (snapshot) => {
      if (this.activeDb() !== 'firebase') return;
      if (snapshot.empty) {
        // Seed default collaborators
        const defaultCollabs = this.getDefaultCollaborators();
        defaultCollabs.forEach(col => {
          setDoc(doc(this.db, 'collaborators', col.id), col).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `collaborators/${col.id}`);
          });
        });
      } else {
        const list: Collaborator[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Collaborator);
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        this.collaborators.set(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'collaborators');
    });

    // 2. Listen to Shift Types
    const collShifts = collection(this.db, 'shiftTypes');
    onSnapshot(collShifts, (snapshot) => {
      if (this.activeDb() !== 'firebase') return;
      if (snapshot.empty) {
        const defaultShifts = this.getDefaultShiftTypes();
        defaultShifts.forEach(s => {
          setDoc(doc(this.db, 'shiftTypes', s.code), s).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `shiftTypes/${s.code}`);
          });
        });
      } else {
        const list: ShiftType[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ShiftType);
        });
        this.shiftTypes.set(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shiftTypes');
    });

    // 3. Listen to Sigla Types
    const collSiglas = collection(this.db, 'siglaTypes');
    onSnapshot(collSiglas, (snapshot) => {
      if (this.activeDb() !== 'firebase') return;
      if (snapshot.empty) {
        const defaultSiglas = this.getDefaultSiglaTypes();
        defaultSiglas.forEach(s => {
          setDoc(doc(this.db, 'siglaTypes', s.code), s).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `siglaTypes/${s.code}`);
          });
        });
      } else {
        const list: SiglaType[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as SiglaType);
        });
        this.siglaTypes.set(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'siglaTypes');
    });

    // 4. Listen to Audit History
    const collAudit = collection(this.db, 'auditHistory');
    onSnapshot(collAudit, (snapshot) => {
      if (this.activeDb() !== 'firebase') return;
      if (snapshot.empty) {
        const defaultAudit = this.getDefaultAuditHistory();
        defaultAudit.forEach(a => {
          setDoc(doc(this.db, 'auditHistory', a.id), a).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `auditHistory/${a.id}`);
          });
        });
      } else {
        const list: BackupHistory[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as BackupHistory);
        });
        list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        this.auditHistory.set(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'auditHistory');
    });
  }

  // Database operations
  getAutoPreSelectedFolgas(collab: Collaborator): FolgaRequest[] {
    const preSelected: FolgaRequest[] = [];
    
    // 1. Check birthday (Month 6 - June)
    if (collab.birthday) {
      const parts = collab.birthday.split('-'); // YYYY-MM-DD
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (m === 6) { // June
          preSelected.push({
            date: `2026-06-${String(d).padStart(2, '0')}`,
            isPreSelected: true
          });
        }
      }
    }
    
    // 2. Check special dates (Month 6 - June)
    if (collab.specialDates && Array.isArray(collab.specialDates)) {
      const sorted = [...collab.specialDates].sort((a, b) => a.priority - b.priority);
      for (const sd of sorted) {
        if (!sd.date) continue;
        const parts = sd.date.split('-');
        if (parts.length === 3) {
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (m === 6) {
            const dateStr = `2026-06-${String(d).padStart(2, '0')}`;
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

  refreshPreSelectedFolgas(collab: Collaborator): Collaborator {
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
    newList.forEach(req => {
      const parts = req.date.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        updatedScale[d] = 'F';
      }
    });

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

  addCollaborator(
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
    
    // Initialize standard scale (5 days work, 2 days off) for June 2026
    const initialScale: { [day: number]: string } = {};
    const defaultShiftCode = shift === 'MADRUGADA' ? 'N' : shift === 'TARDE' ? 'T' : shift === 'ADMINISTRATIVO' ? 'ADM' : 'M';
    for (let d = 1; d <= 30; d++) {
      if (d % 7 === 6 || d % 7 === 0) {
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

    newCollab = this.refreshPreSelectedFolgas(newCollab);

    if (this.activeDb() === 'supabase' && this.supabase) {
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
      Promise.resolve(this.supabase.from('colaboradores').upsert(dbRow))
        .then(() => {
          const scaleRows = [];
          for (let d = 1; d <= 30; d++) {
            scaleRows.push({
              collaborator_id: newCollab.id,
              day: d,
              month: 6,
              year: 2026,
              value: newCollab.scale[d] || 'F'
            });
          }
          return Promise.resolve(this.supabase.from('escala_diaria').upsert(scaleRows));
        })
        .then(() => {
          this.syncSupabase();
          this.addAuditHistory('CADASTRO_COLABORADOR', `Colaborador ${name} cadastrado no Supabase.`);
        })
        .catch((err: any) => {
          console.error(err);
          this.databaseError.set(`Falha ao salvar no Supabase: ${err.message || err}`);
        });
    } else {
      setDoc(doc(this.db, 'collaborators', id), newCollab).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `collaborators/${id}`);
      });
      this.addAuditHistory('CADASTRO_COLABORADOR', `Colaborador ${name} cadastrado no Firebase.`);
    }
  }

  removeCollaborator(id: string) {
    const target = this.collaborators().find(c => c.id === id);
    if (!target) return;

    if (this.activeDb() === 'supabase' && this.supabase) {
      Promise.all([
        Promise.resolve(this.supabase.from('escala_diaria').delete().eq('collaborator_id', id)),
        Promise.resolve(this.supabase.from('colaboradores').delete().eq('id', id))
      ])
        .then(() => {
          this.syncSupabase();
          this.addAuditHistory('REMOCAO_COLABORADOR', `Colaborador ${target.name} removido do Supabase.`);
        })
        .catch((err: any) => console.error(err));
    } else {
      deleteDoc(doc(this.db, 'collaborators', id)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `collaborators/${id}`);
      });
      this.addAuditHistory('REMOCAO_COLABORADOR', `Colaborador ${target.name} removido do Firebase.`);
    }
  }

  updateCollaborator(col: Collaborator) {
    const refreshedCol = this.refreshPreSelectedFolgas(col);

    if (this.activeDb() === 'supabase' && this.supabase) {
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
      Promise.resolve(this.supabase.from('colaboradores').upsert(dbRow))
        .then(() => {
          const scaleRows = [];
          for (let d = 1; d <= 30; d++) {
            scaleRows.push({
              collaborator_id: refreshedCol.id,
              day: d,
              month: 6,
              year: 2026,
              value: refreshedCol.scale[d] || 'F'
            });
          }
          return Promise.resolve(this.supabase.from('escala_diaria').upsert(scaleRows));
        })
        .then(() => {
          this.syncSupabase();
        })
        .catch((err: any) => console.error(err));
    } else {
      setDoc(doc(this.db, 'collaborators', refreshedCol.id), refreshedCol).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `collaborators/${refreshedCol.id}`);
      });
    }
  }

  clearAllScales() {
    this.collaborators().forEach(collab => {
      const emptyScale: { [day: number]: string } = {};
      for (let d = 1; d <= 30; d++) {
        emptyScale[d] = '-';
      }
      const updated = { ...collab, scale: emptyScale };
      this.updateCollaborator(updated);
    });
    this.addAuditHistory('LIMPAR_ESCALA', 'Toda a escala mensal de trabalho foi redefinida para Sem Definição (-).');
  }

  generateAutoScale() {
    this.collaborators().forEach(collab => {
      const generatedScale: { [day: number]: string } = {};
      const baseShift = collab.shift === 'MADRUGADA' ? 'N' : collab.shift === 'TARDE' ? 'T' : collab.shift === 'ADMINISTRATIVO' ? 'ADM' : 'M';
      
      for (let d = 1; d <= 30; d++) {
        const isWeekend = (d % 7 === 6 || d % 7 === 0);
        if (isWeekend) {
          generatedScale[d] = 'F';
        } else {
          generatedScale[d] = baseShift;
        }
      }
      const updated = { ...collab, scale: generatedScale };
      this.updateCollaborator(updated);
    });
    this.addAuditHistory('GERAR_AUTO', 'Escala mensal gerada com sucesso via algoritmo IA.');
  }

  addSiglaType(code: string, label: string, color: string, description: string) {
    if (!code || !label) return;
    const upperCode = code.toUpperCase().trim();
    const newSigla: SiglaType = {
      code: upperCode,
      label,
      color,
      description
    };

    if (this.activeDb() === 'supabase' && this.supabase) {
      Promise.resolve(this.supabase.from('sigla_types').upsert(newSigla))
        .then(() => {
          this.syncSupabase();
          this.addAuditHistory('CADASTRO_SIGLA', `Nova sigla ${upperCode} cadastrada no Supabase.`);
        })
        .catch((err: any) => console.error(err));
    } else {
      setDoc(doc(this.db, 'siglaTypes', upperCode), newSigla).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `siglaTypes/${upperCode}`);
      });
      this.addAuditHistory('CADASTRO_SIGLA', `Nova sigla ${upperCode} cadastrada no Firebase.`);
    }
  }

  removeSiglaType(code: string) {
    if (this.activeDb() === 'supabase' && this.supabase) {
      Promise.resolve(this.supabase.from('sigla_types').delete().eq('code', code))
        .then(() => {
          this.syncSupabase();
          this.addAuditHistory('REMOCAO_SIGLA', `Sigla ${code} removida do Supabase.`);
        })
        .catch((err: any) => console.error(err));
    } else {
      deleteDoc(doc(this.db, 'siglaTypes', code)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `siglaTypes/${code}`);
      });
      this.addAuditHistory('REMOCAO_SIGLA', `Sigla ${code} removida do Firebase.`);
    }
  }

  saveSiglaType(sigla: SiglaType) {
    if (this.activeDb() === 'supabase' && this.supabase) {
      Promise.resolve(this.supabase.from('sigla_types').upsert(sigla))
        .then(() => this.syncSupabase())
        .catch((err: any) => console.error(err));
    } else {
      setDoc(doc(this.db, 'siglaTypes', sigla.code), sigla).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `siglaTypes/${sigla.code}`);
      });
    }
  }

  saveShiftType(shift: ShiftType) {
    if (this.activeDb() === 'supabase' && this.supabase) {
      Promise.resolve(this.supabase.from('shift_types').upsert(shift))
        .then(() => this.syncSupabase())
        .catch((err: any) => console.error(err));
    } else {
      setDoc(doc(this.db, 'shiftTypes', shift.code), shift).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `shiftTypes/${shift.code}`);
      });
    }
  }

  removeShiftType(code: string) {
    if (this.activeDb() === 'supabase' && this.supabase) {
      Promise.resolve(this.supabase.from('shift_types').delete().eq('code', code))
        .then(() => this.syncSupabase())
        .catch((err: any) => console.error(err));
    } else {
      deleteDoc(doc(this.db, 'shiftTypes', code)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `shiftTypes/${code}`);
      });
    }
  }

  addAuditHistory(action: string, description: string) {
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
      Promise.resolve(this.supabase.from('audit_history').upsert(newHistory))
        .then(() => this.syncSupabase())
        .catch((err: any) => console.error(err));
    } else {
      setDoc(doc(this.db, 'auditHistory', id), newHistory).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `auditHistory/${id}`);
      });
    }
  }

  // Default initial values for seeding
  private getDefaultCollaborators(): Collaborator[] {
    return [
      {
        id: 'collab_1',
        name: 'Adilson Santos',
        role: 'LIDER',
        hours: '7h20',
        group: 'Líderes',
        shift: 'MANHÃ',
        sector: 'AERÓDROMO',
        bhBalance: 12,
        score: 98,
        scale: {
          1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'F', 7: 'F',
          8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'F', 13: 'F', 14: 'F',
          15: 'M', 16: 'M', 17: 'M', 18: 'M', 19: 'M', 20: 'F', 21: 'F',
          22: 'F', 23: 'M', 24: 'M', 25: 'M', 26: 'M', 27: 'F', 28: 'F',
          29: 'M', 30: 'M'
        },
        birthday: '1988-11-16',
        specialDates: [
          { description: 'Aniversário de Casamento', date: '2026-06-12', priority: 1 },
          { description: 'Aniversário Filho', date: '2026-06-22', priority: 2 }
        ],
        folgaRequests: [
          { date: '2026-06-12', isPreSelected: true },
          { date: '2026-06-22', isPreSelected: true }
        ]
      },
      {
        id: 'collab_2',
        name: 'Bernardo Oliveira',
        role: 'OPERADOR',
        hours: '7h20',
        group: 'Manhã',
        shift: 'MANHÃ',
        sector: 'AERÓDROMO',
        bhBalance: -4,
        score: 94,
        scale: {
          1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'F', 6: 'F', 7: 'F',
          8: 'F', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'F', 14: 'F',
          15: 'F', 16: 'M', 17: 'M', 18: 'M', 19: 'M', 20: 'F', 21: 'F',
          22: 'M', 23: 'M', 24: 'M', 25: 'M', 26: 'M', 27: 'F', 28: 'F',
          29: 'M', 30: 'M'
        },
        birthday: '1992-06-05',
        specialDates: [
          { description: 'Aniversário Cônjuge', date: '2026-06-15', priority: 3 }
        ],
        folgaRequests: [
          { date: '2026-06-05', isPreSelected: true },
          { date: '2026-06-15', isPreSelected: true },
          { date: '2026-06-08', isPreSelected: false }
        ]
      },
      {
        id: 'collab_3',
        name: 'Carlos Alberto',
        role: 'OPERADOR',
        hours: '7h20',
        group: 'Tarde',
        shift: 'TARDE',
        sector: 'AERÓDROMO',
        bhBalance: 8,
        score: 96,
        scale: {
          1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'F', 7: 'F',
          8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'F', 14: 'F',
          15: 'T', 16: 'T', 17: 'T', 18: 'T', 19: 'T', 20: 'F', 21: 'F',
          22: 'T', 23: 'T', 24: 'T', 25: 'T', 26: 'T', 27: 'F', 28: 'F',
          29: 'T', 30: 'T'
        }
      },
      {
        id: 'collab_4',
        name: 'Daniel Lima',
        role: 'OPERADOR',
        hours: '7h20',
        group: 'Madrugada',
        shift: 'MADRUGADA',
        sector: 'AERÓDROMO',
        bhBalance: 16,
        score: 100,
        scale: {
          1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'N', 6: 'F', 7: 'F',
          8: 'N', 9: 'N', 10: 'N', 11: 'N', 12: 'N', 13: 'F', 14: 'F',
          15: 'N', 16: 'N', 17: 'N', 18: 'N', 19: 'N', 20: 'F', 21: 'F',
          22: 'N', 23: 'N', 24: 'N', 25: 'N', 26: 'N', 27: 'F', 28: 'F',
          29: 'N', 30: 'N'
        }
      },
      {
        id: 'collab_5',
        name: 'Everton Souza',
        role: 'OPERADOR',
        hours: '7h20',
        group: 'VIP',
        shift: 'TARDE',
        sector: 'VIP',
        bhBalance: 2,
        score: 92,
        scale: {
          1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'F', 7: 'F',
          8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'F', 14: 'F',
          15: 'T', 16: 'T', 17: 'T', 18: 'T', 19: 'T', 20: 'F', 21: 'F',
          22: 'T', 23: 'T', 24: 'T', 25: 'T', 26: 'T', 27: 'F', 28: 'F',
          29: 'T', 30: 'T'
        }
      },
      {
        id: 'collab_7',
        name: 'Horácio Lima',
        role: 'OPERADOR',
        hours: '7h20',
        group: 'Madrugada',
        shift: 'MADRUGADA',
        sector: 'AERÓDROMO',
        bhBalance: 4,
        score: 95,
        scale: {
          1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'N', 6: 'F', 7: 'F',
          8: 'N', 9: 'N', 10: 'N', 11: 'N', 12: 'N', 13: 'F', 14: 'F',
          15: 'N', 16: 'N', 17: 'N', 18: 'N', 19: 'N', 20: 'F', 21: 'F',
          22: 'N', 23: 'N', 24: 'N', 25: 'N', 26: 'N', 27: 'F', 28: 'F',
          29: 'N', 30: 'N'
        }
      },
      {
        id: 'collab_6',
        name: 'Fabiano Costa',
        role: 'SUPERVISOR',
        hours: '8h00',
        group: 'Líderes',
        shift: 'ADMINISTRATIVO',
        sector: 'AERÓDROMO',
        bhBalance: 24,
        score: 99,
        scale: {
          1: 'ADM', 2: 'ADM', 3: 'ADM', 4: 'ADM', 5: 'ADM', 6: 'F', 7: 'F',
          8: 'ADM', 9: 'ADM', 10: 'ADM', 11: 'ADM', 12: 'ADM', 13: 'F', 14: 'F',
          15: 'ADM', 16: 'ADM', 17: 'ADM', 18: 'ADM', 19: 'ADM', 20: 'F', 21: 'F',
          22: 'ADM', 23: 'ADM', 24: 'ADM', 25: 'ADM', 26: 'ADM', 27: 'F', 28: 'F',
          29: 'ADM', 30: 'ADM'
        }
      }
    ];
  }

  private getDefaultShiftTypes(): ShiftType[] {
    return [
      { code: 'M', label: 'Manhã (06h - 14h)', hours: '7h20', color: '#0ea5e9', startTime: '06:00', endTime: '14:00' },
      { code: 'T', label: 'Tarde (14h - 22h)', hours: '7h20', color: '#10b981', startTime: '14:00', endTime: '22:00' },
      { code: 'N', label: 'Noite (22h - 06h)', hours: '7h20', color: '#8b5cf6', startTime: '22:00', endTime: '06:00' },
      { code: 'F', label: 'Folga', hours: '0h00', color: '#1e293b', startTime: '00:00', endTime: '00:00' }
    ];
  }

  private getDefaultSiglaTypes(): SiglaType[] {
    return [
      { code: 'ADM', label: 'Administrativo', color: '#64748b', description: 'Serviço administrative fixo' },
      { code: 'LM', label: 'Licença Médica', color: '#ef4444', description: 'Afastamento por motivo de saúde' },
      { code: 'FE', label: 'Férias', color: '#3b82f6', description: 'Férias anuais programadas' },
      { code: 'TR', label: 'Treinamento', color: '#eab308', description: 'Curso de aperfeiçoamento de equipe' }
    ];
  }

  private getDefaultAuditHistory(): BackupHistory[] {
    return [
      {
        id: 'bk_1',
        timestamp: '26/06/2026 10:30',
        author: 'Anderson Pires',
        action: 'PUBLICAR_ESCALA',
        description: 'Escala oficial de Junho 2026 publicada no sistema.'
      },
      {
        id: 'bk_2',
        timestamp: '25/06/2026 15:45',
        author: 'Anderson Pires',
        action: 'GERAR_AUTO',
        description: 'Geração automatizada de escala gerada via algoritmo de IA.'
      }
    ];
  }
}
