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

    return '';
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

    return '';
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

    // Fetch from colaboradores and escala_diaria for June (6) 2026
    Promise.all([
      this.supabase.from('colaboradores').select('*'),
      this.supabase.from('escala_diaria').select('*').eq('month', 6).eq('year', 2026)
    ]).then(([collabsResult, escalaResult]: any[]) => {
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
        this.supabase.from('colaboradores').insert(recordsToInsert).catch((err: any) => console.error('Erro ao semear colaboradores:', err));

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
        this.supabase.from('escala_diaria').insert(scaleRecords).catch((err: any) => console.error('Erro ao semear escala_diaria:', err));
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
            scale: scale
          };
        });

        mappedCollabs.sort((a, b) => a.id.localeCompare(b.id));
        this.collaborators.set(mappedCollabs);
      }
    }).catch((err: any) => {
      console.error('Promise.all error syncing Supabase:', err);
      if (this.activeDb() === 'supabase') {
        this.databaseError.set(`Erro de conexão com o Supabase.`);
        this.collaborators.set(this.getDefaultCollaborators());
      }
    });

    // Load defaults for local client-managed lists (shifts, siglas, history)
    this.shiftTypes.set(this.getDefaultShiftTypes());
    this.siglaTypes.set(this.getDefaultSiglaTypes());
    this.auditHistory.set(this.getDefaultAuditHistory());
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
  addCollaborator(
    name: string,
    role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR',
    hours: string,
    group: string,
    shift: string,
    sector: 'AERÓDROMO' | 'VIP' | 'TREINAMENTO',
    bh: number,
    score: number
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

    const newCollab: Collaborator = {
      id,
      name,
      role,
      hours,
      group,
      shift,
      sector,
      bhBalance: bh,
      score,
      scale: initialScale
    };

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
        score: newCollab.score
      };
      this.supabase.from('colaboradores').upsert(dbRow)
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
          return this.supabase.from('escala_diaria').upsert(scaleRows);
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
        this.supabase.from('escala_diaria').delete().eq('collaborator_id', id),
        this.supabase.from('colaboradores').delete().eq('id', id)
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
    if (this.activeDb() === 'supabase' && this.supabase) {
      const dbRow = {
        id: col.id,
        name: col.name,
        role: col.role,
        schedule: col.hours,
        grupo: col.group,
        shift: col.shift,
        sector: col.sector,
        bh_balance: col.bhBalance,
        score: col.score
      };
      this.supabase.from('colaboradores').upsert(dbRow)
        .then(() => {
          const scaleRows = [];
          for (let d = 1; d <= 30; d++) {
            scaleRows.push({
              collaborator_id: col.id,
              day: d,
              month: 6,
              year: 2026,
              value: col.scale[d] || 'F'
            });
          }
          return this.supabase.from('escala_diaria').upsert(scaleRows);
        })
        .then(() => {
          this.syncSupabase();
        })
        .catch((err: any) => console.error(err));
    } else {
      setDoc(doc(this.db, 'collaborators', col.id), col).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `collaborators/${col.id}`);
      });
    }
  }

  clearAllScales() {
    this.collaborators().forEach(collab => {
      const emptyScale: { [day: number]: string } = {};
      for (let d = 1; d <= 30; d++) {
        emptyScale[d] = 'F';
      }
      const updated = { ...collab, scale: emptyScale };
      this.updateCollaborator(updated);
    });
    this.addAuditHistory('LIMPAR_ESCALA', 'Toda a escala mensal de trabalho foi redefinida para Folga (F).');
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
      this.supabase.from('sigla_types').upsert(newSigla)
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
      this.supabase.from('sigla_types').delete().eq('code', code)
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
      this.supabase.from('sigla_types').upsert(sigla)
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
      this.supabase.from('shift_types').upsert(shift)
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
      this.supabase.from('shift_types').delete().eq('code', code)
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
      this.supabase.from('audit_history').upsert(newHistory)
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
          8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'F', 14: 'F',
          15: 'M', 16: 'M', 17: 'M', 18: 'M', 19: 'M', 20: 'F', 21: 'F',
          22: 'M', 23: 'M', 24: 'M', 25: 'M', 26: 'M', 27: 'F', 28: 'F',
          29: 'M', 30: 'M'
        }
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
          1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'F', 7: 'F',
          8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'F', 14: 'F',
          15: 'M', 16: 'M', 17: 'M', 18: 'M', 19: 'M', 20: 'F', 21: 'F',
          22: 'M', 23: 'M', 24: 'M', 25: 'M', 26: 'M', 27: 'F', 28: 'F',
          29: 'M', 30: 'M'
        }
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
      { code: 'M', label: 'Manhã (06h - 14h)', hours: '7h20', color: '#005cfa', startTime: '06:00', endTime: '14:00' },
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
