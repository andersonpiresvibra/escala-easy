import { Injectable, signal, inject, effect, untracked } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Collaborator,
  ShiftCell,
  TradeRequest,
  AuditLog,
  INITIAL_COLLABORATORS,
  generateInitialGrid,
  isActiveCellValue,
  isFixedAbsenceValue,
  isWorkDayForFatigue,
  isRestDayForTarget,
  normalizeCellValue,
  JetFuelOperation,
  GOL_AIRCRAFT_737_7,
  GOL_AIRCRAFT_737_8,
  FLEET_SERVIDORES,
  FLEET_CTAS,
  SIGLAS,
  ShiftType
} from './data';

export interface SavedScaleProfile {
  id: string;
  name: string;
  description: string;
  timestamp: string;
  grid: ShiftCell[];
  collaborators: Collaborator[];
}

interface DbCollaborator {
  id: string;
  name: string;
  role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR';
  schedule: string;
  grupo: 'Madrugada' | 'Manhã' | 'Tarde' | 'Líderes' | 'VIP' | 'Treinamento';
  shift: 'MANHÃ' | 'TARDE' | 'MADRUGADA' | 'ADMINISTRATIVO' | 'NOITE' | 'TESTE';
  sector: 'AERÓDROMO' | 'VIP' | 'TREINAMENTO';
  bh_balance: number;
  score: number;
}

interface DbMagnaDate {
  collaborator_id: string;
  label: string;
  day: number;
  month: number;
  year: number | null;
  priority: number;
}

interface DbTraining {
  id: number;
  collaborator_id: string;
  title: string;
  completion_date: string;
  expiration_date: string | null;
  status: 'CONCLUÍDO' | 'EXPIRADO' | 'EM_CURSO';
}

interface DbCourse {
  id: number;
  collaborator_id: string;
  name: string;
  institution: string;
  issue_date: string;
  certificate_code: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ScaleService {
  private supabaseService = inject(SupabaseService);

  // State Signals
  collaborators = signal<Collaborator[]>([]);
  grid = signal<ShiftCell[]>([]);
  trades = signal<TradeRequest[]>([]);
  logs = signal<AuditLog[]>([]);
  currentRole = signal<'SUPERVISOR' | 'LIDER' | 'OPERADOR'>('LIDER'); // Default to Turn Leader
  selectedOperatorId = signal<string>('001'); // Default logged operator (MICHEL)
  antiFatigueLimit = signal<number>(5); // Max N consecutive days
  
  // Sync state signals for UI
  isSyncing = signal<boolean>(false);
  lastSyncTime = signal<string>('');
  isSchemaMissing = signal<boolean>(false);
  isDatabaseOffline = signal<boolean>(false);

  // Custom Saved Profiles Slots
  savedProfiles = signal<SavedScaleProfile[]>([]);
  // Dynamic Shift Types Configurator
  shiftTypes = signal<ShiftType[]>([]);

  // Real-time Flight Fuel Operations (Simulated JetFuel)
  operations = signal<JetFuelOperation[]>([]);

  // Current Date context mapping
  currentMonth = signal<number>(new Date().getMonth() + 1); // Current month
  currentYear = signal<number>(new Date().getFullYear()); // Current year

  constructor() {
    this.loadState();
    this.loadFromSupabase(); // Sincroniza de forma assíncrona com o Supabase!
    this.setupRealtimeSubscription(); // Inscreve nos canais de tempo real!
    this.startLiveOperationsSimulator();

    // Re-carrega automaticamente do Supabase quando o mês ou ano muda
    effect(() => {
      this.currentMonth();
      this.currentYear();
      untracked(() => {
        this.loadFromSupabase();
      });
    });

    // Fallback polling de contingência a cada 10 segundos para máxima reatividade
    setInterval(() => {
      this.loadFromSupabase();
    }, 10000);
  }

  // Set up real-time subscription for Supabase tables
  setupRealtimeSubscription() {
    try {
      const client = this.supabaseService.client;

      // Inscrição para escutar alterações em tempo real nas tabelas principais
      client
        .channel('supabase-realtime-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'colaboradores' },
          (payload) => {
            console.log('⚡ [Realtime] Mudança detectada na tabela colaboradores:', payload);
            this.loadFromSupabase();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'datas_magnas' },
          (payload) => {
            console.log('⚡ [Realtime] Mudança detectada na tabela datas_magnas:', payload);
            this.loadFromSupabase();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'treinamentos' },
          (payload) => {
            console.log('⚡ [Realtime] Mudança detectada na tabela treinamentos:', payload);
            this.loadFromSupabase();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cursos_certificacoes' },
          (payload) => {
            console.log('⚡ [Realtime] Mudança detectada na tabela cursos_certificacoes:', payload);
            this.loadFromSupabase();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'escala_diaria' },
          (payload) => {
            console.log('⚡ [Realtime] Mudança detectada na tabela escala_diaria:', payload);
            this.loadFromSupabase();
          }
        )
        .subscribe((status) => {
          console.log(`📡 [Realtime] Conexão com canais de tempo real do Supabase: ${status}`);
        });
    } catch (err) {
      console.error('❌ Erro ao configurar o canal de tempo real do Supabase:', err);
    }
  }

  // Load from Supabase Database
  async loadFromSupabase() {
    this.isSyncing.set(true);
    try {
      console.log('🔄 Baixando dados reais do Supabase...');
      const client = this.supabaseService.client;

      // 1. Fetch colaboradores
      const { data: colabs, error: colabsErr } = await client
        .from('colaboradores')
        .select('*');

      if (colabsErr) {
        if (colabsErr.message?.includes('Failed to fetch') || colabsErr.message?.includes('fetch') || colabsErr.message?.includes('network')) {
          this.isDatabaseOffline.set(true);
        }
        throw colabsErr;
      }
      this.isDatabaseOffline.set(false);

      // 2. Fetch datas_magnas
      const { data: magnas, error: magnasErr } = await client
        .from('datas_magnas')
        .select('*');

      if (magnasErr) throw magnasErr;

      // 3. Fetch treinamentos
      const { data: treinos, error: treinosErr } = await client
        .from('treinamentos')
        .select('*');

      if (treinosErr) throw treinosErr;

      // 4. Fetch cursos_certificacoes
      const { data: cursos, error: cursosErr } = await client
        .from('cursos_certificacoes')
        .select('*');

      if (cursosErr) throw cursosErr;

      // 5. Fetch escala_diaria (Com paginação para evitar limite de 1000 registros e filtrando pelo mês/ano corrente)
      let typedEscala: { collaborator_id: string; day: number; month: number; year: number; value: string }[] = [];
      try {
        const currentM = this.currentMonth();
        const currentY = this.currentYear();
        let hasMore = true;
        let fromOffset = 0;
        const pageSize = 1000;

        while (hasMore) {
          const toOffset = fromOffset + pageSize - 1;
          const { data: chunk, error: escalaErr } = await client
            .from('escala_diaria')
            .select('*')
            .eq('month', currentM)
            .eq('year', currentY)
            .range(fromOffset, toOffset);

          if (escalaErr) {
            console.warn('⚠️ [Aviso] Falha ao ler lote de escala_diaria do Supabase:', escalaErr.message);
            if (escalaErr.message?.includes('Could not find') || escalaErr.code === 'PGRST116') {
              this.isSchemaMissing.set(true);
            }
            break;
          }

          if (chunk && chunk.length > 0) {
            typedEscala = [...typedEscala, ...chunk];
            if (chunk.length < pageSize) {
              hasMore = false;
            } else {
              fromOffset += pageSize;
            }
            this.isSchemaMissing.set(false);
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        console.warn('⚠️ [Aviso] Exceção ao ler tabela escala_diaria do Supabase:', err);
      }

      console.log(`✅ Dados do Supabase baixados com sucesso! Colaboradores: ${colabs?.length}, Datas: ${magnas?.length}, Treinamentos: ${treinos?.length}, Cursos: ${cursos?.length}, Escalas diárias: ${typedEscala?.length}`);

      if (colabs && colabs.length > 0) {
        const typedColabs = colabs as DbCollaborator[];
        const typedMagnas = (magnas || []) as DbMagnaDate[];
        const typedTreinos = (treinos || []) as DbTraining[];
        const typedCursos = (cursos || []) as DbCourse[];

        const mappedColabs = typedColabs.map((c: DbCollaborator) => {
          // find important dates for this colab
          const datesForColab = typedMagnas
            .filter((m: DbMagnaDate) => m.collaborator_id === c.id)
            .map((m: DbMagnaDate) => {
              const yearStr = m.year ? m.year : new Date().getFullYear();
              const monthStr = String(m.month).padStart(2, '0');
              const dayStr = String(m.day).padStart(2, '0');
              return {
                label: m.label,
                date: `${yearStr}-${monthStr}-${dayStr}`,
                priority: m.priority
              };
            });

          // find trainings for this colab
          const treinosForColab = typedTreinos
            .filter((t: DbTraining) => t.collaborator_id === c.id)
            .map((t: DbTraining) => ({
              id: t.id,
              title: t.title,
              completion_date: t.completion_date,
              expiration_date: t.expiration_date,
              status: t.status
            }));

          // find courses for this colab
          const cursosForColab = typedCursos
            .filter((cur: DbCourse) => cur.collaborator_id === c.id)
            .map((cur: DbCourse) => ({
              id: cur.id,
              name: cur.name,
              institution: cur.institution,
              issue_date: cur.issue_date,
              certificate_code: cur.certificate_code
            }));

          return {
            id: c.id,
            name: c.name,
            role: c.role,
            schedule: c.schedule,
            group: c.grupo,
            shift: c.shift === 'MADRUGADA' ? 'NOITE' : (c.shift === 'ADMINISTRATIVO' ? 'TESTE' : c.shift),
            sector: c.sector,
            bhBalance: c.bh_balance || 0,
            score: c.score || 90,
            importantDates: datesForColab,
            trainings: treinosForColab,
            courses: cursosForColab
          };
        });

        // Set state reactive signal
        this.collaborators.set(mappedColabs);
        
        // Save current synced state in local storage as local cache
        localStorage.setItem('es_collaborators', JSON.stringify(mappedColabs));

        // 6. Atualizar o grid com os dados baixados do Supabase
        if (typedEscala && typedEscala.length > 0) {
          const mappedGrid: ShiftCell[] = typedEscala.map(item => ({
            collaboratorId: item.collaborator_id,
            day: item.day,
            month: item.month || this.currentMonth(),
            year: item.year || this.currentYear(),
            value: item.value || ''
          }));

          // Garantir que temos todas as células completas para o mês e ano corrente para todos os colaboradores
          const month = this.currentMonth();
          const year = this.currentYear();
          const numDays = new Date(year, month, 0).getDate();

          let mergedGrid = [...mappedGrid];
          const missingCells: ShiftCell[] = [];

          mappedColabs.forEach(colab => {
            for (let day = 1; day <= numDays; day++) {
              const exists = mergedGrid.some(c => c.collaboratorId === colab.id && c.day === day && c.month === month && c.year === year);
              if (!exists) {
                missingCells.push({
                  collaboratorId: colab.id,
                  day,
                  month,
                  year,
                  value: ''
                });
              }
            }
          });

          if (missingCells.length > 0) {
            mergedGrid = [...mergedGrid, ...missingCells];
          }

          // Filtra o grid para conter apenas colaboradores válidos e preencher propriedades nulas/indefinidas
          const validCollabIds = new Set(mappedColabs.map(colab => colab.id));
          const cleanedGrid = mergedGrid
            .filter(c => c && c.collaboratorId && validCollabIds.has(c.collaboratorId))
            .map(c => ({
              ...c,
              month: c.month || month,
              year: c.year || year
            }));

          this.grid.set(cleanedGrid);
          localStorage.setItem('es_grid', JSON.stringify(cleanedGrid));
        } else {
          // Se escala_diaria retornou vazia mas temos dados locais, populamos o Supabase com eles
          const localGrid = localStorage.getItem('es_grid');
          if (localGrid) {
            try {
              const parsed = JSON.parse(localGrid) as ShiftCell[];
              const validCollabIds = new Set(mappedColabs.map(colab => colab.id));
              const m = this.currentMonth();
              const y = this.currentYear();
              const cleaned = parsed
                .filter(c => c && c.collaboratorId && validCollabIds.has(c.collaboratorId))
                .map(c => ({
                  ...c,
                  month: c.month || m,
                  year: c.year || y
                }));
              this.grid.set(cleaned);
              localStorage.setItem('es_grid', JSON.stringify(cleaned));
            } catch (err) {
              console.warn('Erro ao restaurar grid local de contingência:', err);
            }
          }
          this.saveGridToSupabase();
        }
      }
    } catch (err) {
      const errStr = String(err);
      const isOffline = errStr.includes('Failed to fetch') || errStr.includes('fetch') || errStr.includes('NetworkError') || errStr.includes('Load failed');
      if (isOffline) {
        this.isDatabaseOffline.set(true);
        console.warn('[Supabase Contingency] Banco de dados offline/pausado ao carregar dados. Usando dados locais.');
      } else {
        console.error('❌ Erro ao carregar dados do Supabase:', err);
      }
    } finally {
      this.isSyncing.set(false);
      this.lastSyncTime.set(new Date().toLocaleTimeString());
    }
  }

  // Save/Upsert collaborator to Supabase
  async saveCollaboratorToSupabase(c: Collaborator) {
    try {
      const client = this.supabaseService.client;
      const { error } = await client.from('colaboradores').upsert({
        id: c.id,
        name: c.name,
        role: c.role,
        schedule: c.schedule,
        grupo: c.group,
        shift: c.shift === 'NOITE' ? 'MADRUGADA' : (c.shift === 'TESTE' ? 'ADMINISTRATIVO' : c.shift),
        sector: c.sector,
        bh_balance: c.bhBalance,
        score: c.score
      });
      if (error) throw error;
      console.log(`✅ Colaborador ${c.name} salvo no Supabase.`);
    } catch (err) {
      console.error(`❌ Erro ao salvar colaborador no Supabase:`, err);
    }
  }

  // Delete collaborator from Supabase
  async deleteCollaboratorFromSupabase(id: string) {
    try {
      const client = this.supabaseService.client;
      const { error } = await client.from('colaboradores').delete().eq('id', id);
      if (error) throw error;
      console.log(`✅ Colaborador ${id} removido do Supabase.`);
    } catch (err) {
      console.error(`❌ Erro ao remover colaborador do Supabase:`, err);
    }
  }

  // Save specific daily scale cell to Supabase
  async saveCellToSupabase(collaboratorId: string, day: number, month: number, year: number, value: string) {
    try {
      // Validar se o colaborador realmente existe
      const validCollabs = this.collaborators();
      const exists = validCollabs.some(colab => colab.id === collaboratorId);
      if (!exists) {
        console.warn(`⚠️ [Aviso] Tentativa de salvar escala para colaborador inexistente: ${collaboratorId}`);
        return;
      }

      const currentM = month || this.currentMonth();
      const currentY = year || this.currentYear();

      const client = this.supabaseService.client;
      const { error } = await client.from('escala_diaria').upsert({
        collaborator_id: collaboratorId,
        day,
        month: currentM,
        year: currentY,
        value: value || ''
      }, { onConflict: 'collaborator_id,day,month,year' });
      if (error) {
        const isOffline = error.message?.includes('Failed to fetch') || error.message?.includes('fetch') || error.message?.includes('network');
        if (isOffline) {
          this.isDatabaseOffline.set(true);
          console.warn(`[Supabase Contingency] Célula (${collaboratorId}, dia ${day}) salva localmente devido à conexão offline.`);
        } else {
          console.error(`❌ Erro ao salvar célula (${collaboratorId}, dia ${day}) no Supabase:`, error.message);
        }
        if (error.message?.includes('Could not find') || error.code === 'PGRST116') {
          this.isSchemaMissing.set(true);
        }
      } else {
        this.isSchemaMissing.set(false);
        console.log(`✅ Célula (${collaboratorId}, ${day}/${currentM}/${currentY}) salva como "${value}" no Supabase.`);
      }
    } catch (err) {
      const errStr = String(err);
      const isOffline = errStr.includes('Failed to fetch') || errStr.includes('fetch') || errStr.includes('network') || errStr.includes('Load failed');
      if (isOffline) {
        this.isDatabaseOffline.set(true);
        console.warn(`[Supabase Contingency] Conexão indisponível ao salvar célula (salvo localmente).`);
      } else {
        console.error('❌ Erro na conexão para salvar célula no Supabase:', err);
      }
    }
  }

  // Save the entire grid to Supabase
  async saveGridToSupabase() {
    try {
      const client = this.supabaseService.client;
      const cells = this.grid();
      if (cells.length === 0) return;

      const validCollabs = this.collaborators();
      const validCollabIds = new Set(validCollabs.map(colab => colab.id));
      const currentM = this.currentMonth();
      const currentY = this.currentYear();

      const validCells = cells.filter(c => c && c.collaboratorId && validCollabIds.has(c.collaboratorId));

      console.log(`🔄 Salvando lote de escalas (${validCells.length} de ${cells.length} células válidas) no Supabase...`);
      const rows = validCells.map(c => ({
        collaborator_id: c.collaboratorId,
        day: c.day,
        month: c.month || currentM,
        year: c.year || currentY,
        value: c.value || ''
      }));

      // Fat-batch upsert em blocos de 300 registros para garantir alta performance e evitar limites de tamanho de payload
      const chunkSize = 300;
      let hasError = false;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        try {
          const { error } = await client
            .from('escala_diaria')
            .upsert(chunk, { onConflict: 'collaborator_id,day,month,year' });
          
          if (error) {
            hasError = true;
            const isOffline = error.message?.includes('Failed to fetch') || error.message?.includes('fetch') || error.message?.includes('network');
            if (isOffline) {
              this.isDatabaseOffline.set(true);
              console.warn(`[Supabase Contingency] Lote de escalas ${i} operando offline (salvo localmente).`);
            } else {
              console.error(`❌ Erro no upsert do lote ${i} de escalas no Supabase:`, error.message);
            }
            if (error.message?.includes('Could not find') || error.code === 'PGRST116') {
              this.isSchemaMissing.set(true);
            }
          }
        } catch (innerErr) {
          hasError = true;
          const errStr = String(innerErr);
          const isOffline = errStr.includes('Failed to fetch') || errStr.includes('fetch') || errStr.includes('network') || errStr.includes('Load failed');
          if (isOffline) {
            this.isDatabaseOffline.set(true);
            console.warn(`[Supabase Contingency] Lote de escalas ${i} operando offline (salvo localmente).`);
          } else {
            console.error(`❌ Exceção no upsert do lote ${i}:`, errStr);
          }
        }
      }
      if (!hasError) {
        this.isSchemaMissing.set(false);
        this.isDatabaseOffline.set(false);
        console.log('✅ Escalas (grid) salvas com sucesso no Supabase.');
      }
    } catch (err) {
      const errStr = String(err);
      const isOffline = errStr.includes('Failed to fetch') || errStr.includes('fetch') || errStr.includes('NetworkError') || errStr.includes('Load failed');
      if (isOffline) {
        this.isDatabaseOffline.set(true);
        console.warn(`[Supabase Contingency] Conexão indisponível para salvar grid de escalas (salvo localmente).`);
      } else {
        console.error('❌ Erro na conexão para salvar grid de escalas no Supabase:', err);
      }
    }
  }

  // Save Magna Date to Supabase
  async saveMagnaDateToSupabase(collabId: string, label: string, date: string, priority: number) {
    try {
      const client = this.supabaseService.client;
      const dateParts = date.split('-');
      const year = dateParts[0] ? parseInt(dateParts[0]) : null;
      const month = dateParts[1] ? parseInt(dateParts[1]) : 1;
      const day = dateParts[2] ? parseInt(dateParts[2]) : 1;

      const { error } = await client.from('datas_magnas').insert({
        collaborator_id: collabId,
        label,
        day,
        month,
        year,
        priority,
        icon_type: label.toLowerCase().includes('aniversário') || label.toLowerCase().includes('niver') ? 'cake' : 'star'
      });
      if (error) throw error;
      console.log(`✅ Data magna "${label}" salva no Supabase.`);
    } catch (err) {
      console.error(`❌ Erro ao salvar data magna no Supabase:`, err);
    }
  }

  // Save training to Supabase
  async addTrainingToSupabase(collabId: string, title: string, completion_date: string, expiration_date: string | null, status: 'CONCLUÍDO' | 'EXPIRADO' | 'EM_CURSO') {
    try {
      const client = this.supabaseService.client;
      const { error } = await client.from('treinamentos').insert({
        collaborator_id: collabId,
        title,
        completion_date,
        expiration_date: expiration_date || null,
        status
      });
      if (error) throw error;
      console.log(`✅ Treinamento "${title}" salvo no Supabase.`);
      await this.loadFromSupabase();
    } catch (err) {
      console.error(`❌ Erro ao salvar treinamento no Supabase:`, err);
    }
  }

  // Save course/certification to Supabase
  async addCourseToSupabase(collabId: string, name: string, institution: string, issue_date: string, certificate_code: string | null) {
    try {
      const client = this.supabaseService.client;
      const { error } = await client.from('cursos_certificacoes').insert({
        collaborator_id: collabId,
        name,
        institution: institution || 'GOL',
        issue_date,
        certificate_code: certificate_code || null
      });
      if (error) throw error;
      console.log(`✅ Curso/Certificado "${name}" salvo no Supabase.`);
      await this.loadFromSupabase();
    } catch (err) {
      console.error(`❌ Erro ao salvar curso no Supabase:`, err);
    }
  }

  loadState() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.collaborators.set([...INITIAL_COLLABORATORS]);
      this.grid.set(generateInitialGrid(INITIAL_COLLABORATORS));
      this.shiftTypes.set([...SIGLAS]);
      return;
    }
    try {
      const storedCollabs = localStorage.getItem('es_collaborators');
      let storedGrid = localStorage.getItem('es_grid');
      
      const hasCleaned = localStorage.getItem('es_grid_cleaned_v12');
      if (!hasCleaned) {
        localStorage.removeItem('es_grid');
        localStorage.removeItem('es_trades');
        storedGrid = null;
        localStorage.setItem('es_grid_cleaned_v12', 'true');
      }

      const storedTrades = localStorage.getItem('es_trades');
      const storedLogs = localStorage.getItem('es_logs');
      const storedProfiles = localStorage.getItem('es_saved_profiles');
      const storedShiftTypes = localStorage.getItem('es_shift_types');

      if (storedCollabs && storedGrid) {
         this.collaborators.set(JSON.parse(storedCollabs));
         this.grid.set(JSON.parse(storedGrid));
         this.trades.set(storedTrades ? JSON.parse(storedTrades) : []);
         this.logs.set(storedLogs ? JSON.parse(storedLogs) : []);
         this.savedProfiles.set(storedProfiles ? JSON.parse(storedProfiles) : []);
         const parsedShifts: ShiftType[] = storedShiftTypes ? JSON.parse(storedShiftTypes) : [];
         const updatedShifts = [...SIGLAS];
         if (parsedShifts.length > 0) {
           parsedShifts.forEach(ps => {
             if (!SIGLAS.some(ds => ds.code === ps.code)) {
               updatedShifts.push(ps);
             } else {
               const std = updatedShifts.find(ds => ds.code === ps.code);
               if (std) {
                 std.cannotDelete = true;
                 const legacyColors = [
                   'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
                   'bg-amber-100 text-amber-800 border-amber-300',
                   'bg-sky-100 text-sky-800 border-sky-300',
                   'bg-rose-100 text-rose-800 border-rose-300',
                   'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
                   'bg-emerald-100 text-emerald-800 border-emerald-300',
                   'bg-teal-100 text-teal-805 border-teal-300',
                   'bg-orange-100 text-orange-850 border-orange-300',
                   'bg-indigo-100 text-indigo-855 border-indigo-300',
                   'bg-cyan-100 text-cyan-805 border-cyan-300',
                   'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300'
                 ];
                 if (ps.color && !legacyColors.includes(ps.color)) {
                   std.color = ps.color;
                 }
                 if (ps.label) std.label = ps.label;
                 if (ps.category) {
                   const legacyCat = ps.category as string;
                   if (legacyCat === 'FOLGAS_FERIAS') {
                     std.category = std.code === 'F' ? 'FERIAS' : 'FOLGAS';
                   } else if (legacyCat === 'CIPA_REUNIOES') {
                     std.category = 'REUNIOES';
                   } else {
                     std.category = ps.category as 'FOLGAS' | 'FERIAS' | 'CURSOS_TREINAMENTO' | 'REUNIOES' | 'AFASTAMENTO_SAUDE' | 'AUSENCIA_INJUSTIFICADA' | 'TURNO';
                   }
                 }
               }
             }
           });
         }
         this.shiftTypes.set(updatedShifts);
      } else {
        // Reset to default seeds
        this.resetToDefaults();
      }
    } catch (e) {
      console.error('Failed to load Scale Easy state from localStorage, resetting', e);
      this.resetToDefaults();
    }
  }

  saveState() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem('es_collaborators', JSON.stringify(this.collaborators()));
    localStorage.setItem('es_grid', JSON.stringify(this.grid()));
    localStorage.setItem('es_trades', JSON.stringify(this.trades()));
    localStorage.setItem('es_logs', JSON.stringify(this.logs()));
    localStorage.setItem('es_saved_profiles', JSON.stringify(this.savedProfiles()));
    localStorage.setItem('es_shift_types', JSON.stringify(this.shiftTypes()));
  }

  resetToDefaults() {
    this.collaborators.set([...INITIAL_COLLABORATORS]);
    this.grid.set(generateInitialGrid(INITIAL_COLLABORATORS));
    this.trades.set([
      {
        id: 'trade-1',
        requesterId: 'op2',
        requesterName: 'NORMAN',
        requestedDay: 12,
        targetId: 'op4',
        targetName: 'DOURADO',
        targetDay: 13,
        status: 'SOLICITADO',
        timestamp: new Date().toISOString()
      },
      {
        id: 'trade-2',
        requesterId: 'op3',
        requesterName: 'RAFAEL',
        requestedDay: 5,
        targetId: 'op6',
        targetName: 'DIOGO',
        targetDay: 7,
        status: 'LT_VALIDOU',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    ]);
    this.logs.set([
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        actor: 'SISTEMA',
        action: 'INICIALIZAÇÃO',
        details: 'Carga inicial da Escala Oficial de Março/2026 VIBRA realizada com sucesso.'
      }
    ]);
    this.savedProfiles.set([]);
    this.shiftTypes.set([...SIGLAS]);
    this.saveState();
  }

  // Shift Type Operations (Turnos)
  addShiftType(code: string, label: string, color: string, discounts: boolean, category?: 'FOLGAS' | 'FERIAS' | 'CURSOS_TREINAMENTO' | 'REUNIOES' | 'AFASTAMENTO_SAUDE' | 'AUSENCIA_INJUSTIFICADA' | 'TURNO') {
    const upperCode = code.trim().toUpperCase();
    if (!upperCode) return;
    this.shiftTypes.update(current => {
      if (current.some(s => s.code === upperCode)) return current;
      return [...current, { code: upperCode, label, color, discounts, category }];
    });
    this.addLog('LÍDER TURNO', 'ADICIONAR TURNO', `Criada nova sigla/turno: [${upperCode}] - ${label}`);
    this.saveState();
  }

  removeShiftType(code: string) {
    this.shiftTypes.update(current => current.filter(s => s.code !== code || !s.cannotDelete));
    this.addLog('LÍDER TURNO', 'REMOVER TURNO', `Excluída sigla de turno: [${code}]`);
    this.saveState();
  }

  updateShiftType(code: string, label: string, color: string, discounts: boolean, category?: 'FOLGAS' | 'FERIAS' | 'CURSOS_TREINAMENTO' | 'REUNIOES' | 'AFASTAMENTO_SAUDE' | 'AUSENCIA_INJUSTIFICADA' | 'TURNO') {
    this.shiftTypes.update(current => {
      return current.map(s => s.code === code ? { ...s, label, color, discounts, category } : s);
    });
    this.addLog('LÍDER TURNO', 'ALTERAR TURNO', `Atualizadas configurações da sigla/turno [${code}]`);
    this.saveState();
  }

  // Collaborator Operations (Plantonistas)
  addCollaborator(name: string, role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR', schedule: string, group: 'Madrugada' | 'Manhã' | 'Tarde' | 'Líderes' | 'VIP' | 'Treinamento', shift: 'MANHÃ' | 'TARDE' | 'MADRUGADA' | 'ADMINISTRATIVO' | 'NOITE' | 'TESTE', sector: 'AERÓDROMO' | 'VIP' | 'TREINAMENTO', bhBalance: number, score: number) {
    const newId = 'col-' + Math.random().toString(36).substr(2, 9);
    const newCollab: Collaborator = {
      id: newId,
      name: name.trim().toUpperCase(),
      role,
      schedule,
      group,
      shift,
      sector,
      bhBalance,
      score,
      importantDates: []
    };

    this.collaborators.update(current => [...current, newCollab]);

    // Populate matrix cells for selected month
    this.grid.update(currentGrid => {
      const newCells: ShiftCell[] = [];
      const month = this.currentMonth();
      const year = this.currentYear();
      const numDays = new Date(year, month, 0).getDate();
      for (let day = 1; day <= numDays; day++) {
        newCells.push({
          collaboratorId: newId,
          day,
          month,
          year,
          value: '' // Work day
        });
      }
      return [...currentGrid, ...newCells];
    });

    this.addLog('LÍDER TURNO', 'ADICIONAR COLABORADOR', `Novo colaborador cadastrado: ${newCollab.name} (${group})`);
    this.saveState();
    this.saveCollaboratorToSupabase(newCollab); // Salva no Supabase!
    return newCollab;
  }

  removeCollaborator(id: string) {
    const collab = this.collaborators().find(c => c.id === id);
    if (!collab) return;

    this.collaborators.update(current => current.filter(c => c.id !== id));
    this.grid.update(currentGrid => currentGrid.filter(cell => cell.collaboratorId !== id));

    this.addLog('LÍDER TURNO', 'REMOVER COLABORADOR', `Colaborador excluído: ${collab.name}`);
    this.saveState();
    this.deleteCollaboratorFromSupabase(id); // Deleta do Supabase!
  }

  updateCollaboratorDetails(id: string, name: string, schedule: string, group: 'Madrugada' | 'Manhã' | 'Tarde' | 'Líderes' | 'VIP' | 'Treinamento', shift: 'MANHÃ' | 'TARDE' | 'MADRUGADA' | 'ADMINISTRATIVO' | 'NOITE' | 'TESTE', sector: 'AERÓDROMO' | 'VIP' | 'TREINAMENTO', bhBalance: number, score: number) {
    this.collaborators.update(current => {
      return current.map(c => {
        if (c.id === id) {
          const updated = {
            ...c,
            name: name.trim().toUpperCase(),
            schedule,
            group,
            shift,
            sector,
            bhBalance,
            score
          };
          this.saveCollaboratorToSupabase(updated); // Salva as alterações no Supabase!
          return updated;
        }
        return c;
      });
    });
    this.addLog('LÍDER TURNO', 'ALTERAR COLABORADOR', `Cadastro de ${name.toUpperCase()} atualizado.`);
    this.saveState();
  }

  // Backup Slots Snapshots
  saveScaleBackupProfile(name: string, description: string) {
    const newProfile: SavedScaleProfile = {
      id: 'profile-' + Math.random().toString(36).substr(2, 9),
      name: name.trim() || `Escala Salva - ${new Date().toLocaleDateString()}`,
      description: description.trim() || 'Sem descrição.',
      timestamp: new Date().toISOString(),
      grid: [...this.grid()],
      collaborators: [...this.collaborators()]
    };

    this.savedProfiles.update(current => [newProfile, ...current]);
    this.addLog('SUPERVISOR', 'SALVAR ESCALA', `Escala atual salva em slot: [${newProfile.name}]`);
    this.saveState();
  }

  loadScaleBackupProfile(id: string): boolean {
    const profile = this.savedProfiles().find(p => p.id === id);
    if (!profile) return false;

    this.grid.set(JSON.parse(JSON.stringify(profile.grid)));
    this.collaborators.set(JSON.parse(JSON.stringify(profile.collaborators)));

    this.addLog('SUPERVISOR', 'CARREGAR ESCALA', `Restaurada escala salva: [${profile.name}]`);
    this.saveState();
    return true;
  }

  deleteScaleBackupProfile(id: string) {
    const profile = this.savedProfiles().find(p => p.id === id);
    if (!profile) return;

    this.savedProfiles.update(current => current.filter(p => p.id !== id));
    this.addLog('SUPERVISOR', 'DELETAR ESCALA', `Removido slot de backup de escala: [${profile.name}]`);
    this.saveState();
  }

  // JSON Import & Export
  importFromJSONString(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data.grid || !data.collaborators) {
        throw new Error('Formato de arquivo inválido.');
      }
      this.grid.set(data.grid);
      this.collaborators.set(data.collaborators);
      if (data.trades) this.trades.set(data.trades);
      if (data.logs) this.logs.set(data.logs);

      this.addLog('SUPERVISOR', 'IMPORTAR BACKUP', 'Importado arquivo JSON externo de escala com sucesso.');
      this.saveState();
      return true;
    } catch (e) {
      console.error('JSON Import Failed', e);
      return false;
    }
  }

  exportToJSONString(): string {
    const data = {
      grid: this.grid(),
      collaborators: this.collaborators(),
      trades: this.trades(),
      logs: this.logs()
    };
    return JSON.stringify(data, null, 2);
  }

  addLog(actor: string, action: string, details: string) {
    const newLog: AuditLog = {
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      actor,
      action,
      details
    };
    this.logs.update(current => [newLog, ...current]);
    this.saveState();
  }

  clearAllScales() {
    this.grid.update(currentGrid => currentGrid.map(cell => ({ ...cell, value: '' })));
    this.addLog(
      this.currentRole() + ' ' + (this.selectedCollabName() || 'ADMIN'),
      'LIMPEZA TOTAL DE ESCALA',
      'Todas as células da escala foram limpas com sucesso.'
    );
    this.saveState();
    this.saveGridToSupabase(); // Sincroniza a limpeza completa com o banco de dados Supabase
  }

  generateAutoScale() {
    const month = this.currentMonth();
    const year = this.currentYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    const maxConsecutiveWork = this.antiFatigueLimit ? this.antiFatigueLimit() : 5;

    this.grid.update(currentGrid => {
      const collabs = this.collaborators();
      const madrugadaOps = collabs.filter(c => c.group === 'Madrugada' && c.role === 'OPERADOR');

      const newGrid: ShiftCell[] = currentGrid.map(cell => ({ ...cell }));

      const getCellIndex = (collaboratorId: string, day: number, m = month, y = year): number => {
        return newGrid.findIndex(c => c.collaboratorId === collaboratorId && c.day === day && c.month === m && c.year === y);
      };

      const getCellValue = (collaboratorId: string, day: number, m = month, y = year): string => {
        const idx = getCellIndex(collaboratorId, day, m, y);
        if (idx === -1) return '';
        return normalizeCellValue(newGrid[idx].value);
      };

      const setCellValue = (collaboratorId: string, day: number, value: string, m = month, y = year): void => {
        const idx = getCellIndex(collaboratorId, day, m, y);
        if (idx !== -1) {
          newGrid[idx] = {
            ...newGrid[idx],
            value
          };
        } else {
          newGrid.push({ collaboratorId, day, month: m, year: y, value });
        }
      };

      const requiredForDay = (day: number): number => {
        const date = new Date(year, month - 1, day);
        const isSaturday = date.getDay() === 6;
        return isSaturday ? 5 : 6;
      };

      const activeCountForDay = (day: number): number => {
        let count = 0;
        for (const op of madrugadaOps) {
          const value = getCellValue(op.id, day);
          if (isActiveCellValue(value)) {
            count++;
          }
        }
        return count;
      };

      const canGiveDayOff = (collaboratorId: string, day: number, force = false): boolean => {
        const currentValue = getCellValue(collaboratorId, day);

        if (isFixedAbsenceValue(currentValue)) return false;
        if (currentValue === 'X') return false;

        const beforeActive = activeCountForDay(day);
        const required = requiredForDay(day);

        if (!force && beforeActive <= required) return false;

        return true;
      };

      const giveDayOff = (collaboratorId: string, day: number, force = false): boolean => {
        if (!canGiveDayOff(collaboratorId, day, force)) return false;
        setCellValue(collaboratorId, day, 'X');
        const afterActive = activeCountForDay(day);
        const required = requiredForDay(day);

        if (!force && afterActive < required) {
          setCellValue(collaboratorId, day, '');
          return false;
        }

        return true;
      };

      // Remaining code after canGiveDayOff
      const offCountSoFar = (collaboratorId: string, untilDay: number): number => {
        let count = 0;
        for (let d = 1; d <= untilDay; d++) {
          const val = getCellValue(collaboratorId, d);
          if (isRestDayForTarget(val)) count++;
        }
        return count;
      };

      const consecutiveWorkBefore = (collaboratorId: string, day: number): number => {
        let count = 0;
        let d = day - 1;
        let m = month;
        let y = year;
        
        while (true) {
          if (d < 1) {
            m--;
            if (m < 1) {
              m = 12;
              y--;
            }
            d = new Date(y, m, 0).getDate();
          }
          
          const val = getCellValue(collaboratorId, d, m, y);
          if (isWorkDayForFatigue(val)) {
            count++;
            d--;
          } else {
            break;
          }
        }
        return count;
      };

      const getDynamicWeekendPairs = (): [number, number][] => {
        const pairs: [number, number][] = [];
        for (let d = 1; d <= daysInMonth - 1; d++) {
          const date = new Date(year, month - 1, d);
          if (date.getDay() === 6) { // Saturday
            pairs.push([d, d + 1]);
          }
        }
        return pairs;
      };

      const dynamicWeekendPairs = getDynamicWeekendPairs();

      const hasDoubleWeekendOff = (collaboratorId: string): boolean => {
        return dynamicWeekendPairs.some(([sat, sun]) => {
          return getCellValue(collaboratorId, sat) === 'X' && getCellValue(collaboratorId, sun) === 'X';
        });
      };

      // =========================================================================
      // ETAPA 1 — Limpar somente folgas X geradas anteriormente no grupo Madrugada.
      // =========================================================================
      for (const op of madrugadaOps) {
        for (let day = 1; day <= daysInMonth; day++) {
          if (getCellValue(op.id, day) === 'X') {
            setCellValue(op.id, day, '');
          }
        }
      }

      // =========================================================================
      // ETAPA 2 — Aplicar Datas Magnas, mas somente se não quebrar contingente.
      // =========================================================================
      for (const op of madrugadaOps) {
        for (const magna of op.importantDates || []) {
          const dayPart = parseInt(magna.date.split('-')[2], 10);
          if (!dayPart || dayPart < 1 || dayPart > daysInMonth) continue;

          const success = giveDayOff(op.id, dayPart);
          if (success) {
            this.addLog('MOTOR DE REGRAS', 'DATA MAGNA', `Folga de Data Magna aplicada para ${op.name} no dia ${dayPart}.`);
          } else {
            this.addLog('MOTOR DE REGRAS', 'CONFLITO DATA MAGNA', `Data Magna de ${op.name} no dia ${dayPart} não aplicada automaticamente para não violar o contingente mínimo.`);
          }
        }
      }

      // =========================================================================
      // ETAPA 2.5 — Distribuir Dobradinhas Sábado e Domingo
      // Todos os colaboradores devem receber obrigatoriamente UMA dobradinha de FDS.
      // =========================================================================
      const basePairs = dynamicWeekendPairs;

      for (let i = 0; i < madrugadaOps.length; i++) {
        const op = madrugadaOps[i];
        if (hasDoubleWeekendOff(op.id)) continue;

        // Tenta alocar a dobradinha prevista
        const attemptPair = basePairs[i % basePairs.length];
        const [d1, d2] = attemptPair;
        
        let assigned = false;
        const canD1 = activeCountForDay(d1) > requiredForDay(d1) && canGiveDayOff(op.id, d1);
        const canD2 = activeCountForDay(d2) > requiredForDay(d2) && canGiveDayOff(op.id, d2);
        
        if (canD1 && canD2) {
          setCellValue(op.id, d1, 'X');
          setCellValue(op.id, d2, 'X');
          this.addLog('MOTOR DE REGRAS', 'DOBRADINHA', `Dobradinha FDS sequencial p/ ${op.name}: dias ${d1} e ${d2}.`);
          assigned = true;
        } else {
          // Fallback se contingente bater
          for (let j = 1; j < basePairs.length; j++) {
            const fallbackPair = basePairs[(i + j) % basePairs.length];
            const [fd1, fd2] = fallbackPair;
            if (activeCountForDay(fd1) > requiredForDay(fd1) && canGiveDayOff(op.id, fd1) && 
                activeCountForDay(fd2) > requiredForDay(fd2) && canGiveDayOff(op.id, fd2)) {
                
                setCellValue(op.id, fd1, 'X');
                setCellValue(op.id, fd2, 'X');
                this.addLog('MOTOR DE REGRAS', 'DOBRADINHA', `Dobradinha FDS fallback p/ ${op.name}: dias ${fd1} e ${fd2}.`);
                assigned = true;
                break;
            }
          }
        }
        
        if (!assigned) {
           this.addLog('MOTOR DE REGRAS', 'FALHA DOBRADINHA', `Atenção: Não houve contingente para a dobradinha FDS de ${op.name}.`);
        }
      }

      // =========================================================================
      // ETAPA 3 — Distribuição Balanceada Dia a Dia
      // =========================================================================
      const targetOffs = daysInMonth <= 28 ? 7 : (daysInMonth <= 30 ? 8 : 9);

      for (let day = 1; day <= daysInMonth; day++) {
        const required = requiredForDay(day);
        let availableSlots = activeCountForDay(day) - required;

        const candidates = madrugadaOps.map(op => {
          const consecutive = consecutiveWorkBefore(op.id, day);
          const totalOffsAssigned = offCountSoFar(op.id, daysInMonth);
          const isOffToday = getCellValue(op.id, day) === 'X' || isFixedAbsenceValue(getCellValue(op.id, day));
          return { op, consecutive, totalOffsAssigned, isOffToday, score: 0 };
        });

        // Só consideramos quem AINDA não bateu a cota limite!
        const needOff = candidates.filter(c => !c.isOffToday && c.totalOffsAssigned < targetOffs);

        needOff.forEach(c => {
          let score = 0;
          
          if (c.consecutive >= maxConsecutiveWork) {
            score += 100000; // MUST HAVE
          } else {
            score += c.consecutive * 1000;
          }
          
          const remainingDays = (daysInMonth - day) + 1;
          const remainingOffs = targetOffs - c.totalOffsAssigned;
          const pressure = remainingOffs / remainingDays;
          
          if (pressure >= 1) {
            score += 50000; // Must have otherwise we run out of days
          } else {
            score += pressure * 5000;
          }
          
          if (c.consecutive < 2) {
             score -= 5000; // Penalize early days off to balance T and X
          }

          c.score = score;
        });

        needOff.sort((a, b) => b.score - a.score);

        for (const c of needOff) {
          const force = c.consecutive >= maxConsecutiveWork || c.score > 40000;
          
          if (!force && c.consecutive < 2) {
            continue; // Evita TXTX se não for forçado
          }
          
          if (!force && availableSlots <= 0) {
            continue;
          }
          
          if (canGiveDayOff(c.op.id, day, force)) {
            setCellValue(c.op.id, day, 'X');
            c.totalOffsAssigned++; // local pointer increment
            if (!force) {
              availableSlots--;
            }
          }
        }
      }

      // =========================================================================
      // ETAPA 4 — Top Up: Passagem de Ajuste (Do fim pro começo e do meio)
      // Garante que TODOS atingirão exatamente a cota (8 ou 9) se houver espaço no mês
      // =========================================================================
      for (let pass = 0; pass < 2; pass++) {
        for (let day = daysInMonth; day >= 1; day--) {
          let availableSlots = activeCountForDay(day) - requiredForDay(day);

          const candidates = madrugadaOps.map(op => ({
            op,
            totalOffsAssigned: offCountSoFar(op.id, daysInMonth),
            isOffToday: getCellValue(op.id, day) === 'X' || isFixedAbsenceValue(getCellValue(op.id, day))
          })).filter(c => !c.isOffToday && c.totalOffsAssigned < targetOffs);

          candidates.sort((a, b) => a.totalOffsAssigned - b.totalOffsAssigned);

          for (const c of candidates) {
            const force = c.totalOffsAssigned < targetOffs && pass === 1; // force on last pass if missing quota
            if (!force && availableSlots <= 0) break;
            
            if (canGiveDayOff(c.op.id, day, force)) {
              setCellValue(c.op.id, day, 'X');
              c.totalOffsAssigned++;
              if (!force) availableSlots--;
            }
          }
        }
      }

      // =========================================================================
      // ETAPA 4.5 — Preencher Células Vazias com "T"
      // =========================================================================
      for (const op of collabs) {
        for (let day = 1; day <= daysInMonth; day++) {
          if (getCellValue(op.id, day) === '') {
            setCellValue(op.id, day, 'T');
          }
        }
      }

      // =========================================================================
      // ETAPA 5 — Validação final restrita.
      // Loga erros de regras para intervenção manual se necessário, mas SALVA o que conseguiu.
      // =========================================================================
      const errors: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const active = activeCountForDay(day);
        const required = requiredForDay(day);
        if (active < required) {
          errors.push(`Dia ${day}: contingente restou ${active}/${required}`);
        }
      }

      for (const op of madrugadaOps) {
        let consecutive = consecutiveWorkBefore(op.id, 1);
        const totalOffs = offCountSoFar(op.id, daysInMonth);

        // CHECAGEM RIGOROSA DO LIMITE COTA
        if (totalOffs > targetOffs) {
           errors.push(`Limite de folgas quebrado para ${op.name}: possui ${totalOffs}/${targetOffs}`);
        }

        for (let day = 1; day <= daysInMonth; day++) {
          const val = getCellValue(op.id, day);

          if (isWorkDayForFatigue(val)) {
            consecutive++;
            if (consecutive > maxConsecutiveWork) {
              errors.push(`${op.name}: ${consecutive} dias consecutivos de trabalho até o dia ${day}`);
            }
          } else {
            consecutive = 0;
          }
        }
      }

      if (errors.length > 0) {
        this.addLog(
          'MOTOR DE REGRAS',
          'ALERTA DE ESCALA',
          `Escala gerada com pendências e exige ajuste manual: ${errors.join(' | ')}`
        );
        console.warn('Escala gerou infrações (entregue p/ ajuste manual):', errors);
      } else {
        this.addLog(
          'MOTOR DE REGRAS',
          'ESCALA GERADA V2',
          `Escala automática perfeitamente distribuída: Máx ${targetOffs} folgas rigorosamente cravado.`
        );
      }

      return newGrid;
    });

    this.saveState();
    this.saveGridToSupabase(); // Envia em lote toda a escala gerada de forma automatizada ao Supabase
  }

  // Edit cell value directly
  updateCell(collaboratorId: string, day: number, value: string) {
    const upperValue = value.trim().toUpperCase();
    const month = this.currentMonth();
    const year = this.currentYear();

    this.grid.update(currentGrid => {
      let exists = false;
      const newGrid = currentGrid.map(cell => {
        if (cell.collaboratorId === collaboratorId && cell.day === day && cell.month === month && cell.year === year) {
          exists = true;
          return { ...cell, value: upperValue };
        }
        return cell;
      });
      if (!exists) {
        newGrid.push({ collaboratorId, day, month, year, value: upperValue });
      }
      return newGrid;
    });

    const collab = this.collaborators().find(c => c.id === collaboratorId);
    this.addLog(
      this.currentRole() + ' ' + (this.selectedCollabName() || 'ADMIN'),
      'ATUALIZAÇÃO DE CÉLULA',
      `Alterado dia ${day}/${month}/${year} do colaborador ${collab?.name || collaboratorId} para: "${upperValue || 'TRABALHO'}"`
    );
    this.saveState();

    // Salva a alteração da célula diretamente no banco de dados Supabase!
    this.saveCellToSupabase(collaboratorId, day, month, year, upperValue);
  }



  addTradeRequest(requestedDay: number, targetId: string, targetDay: number) {
    const requester = this.collaborators().find(c => c.id === this.selectedOperatorId());
    const target = this.collaborators().find(c => c.id === targetId);

    if (!requester || !target) return;

    const request: TradeRequest = {
      id: 'trade-' + Math.random().toString(36).substr(2, 9),
      requesterId: requester.id,
      requesterName: requester.name,
      requestedDay,
      targetId: target.id,
      targetName: target.name,
      targetDay,
      status: 'SOLICITADO',
      timestamp: new Date().toISOString()
    };

    this.trades.update(current => [request, ...current]);
    this.addLog(
      requester.name,
      'SOLICITAÇÃO DE PERMUTA',
      `Solicitou troca do dia ${requestedDay} com o dia ${targetDay} do colega ${target.name}.`
    );
    this.saveState();
  }

  updateTradeStatus(tradeId: string, nextStatus: 'COLEGA_ACEITOU' | 'LT_VALIDOU' | 'SUPERVISOR_HOMOLOGADO' | 'REJEITADO') {
    let affectedTrade: TradeRequest | undefined;

    this.trades.update(currentTrades => {
      return currentTrades.map(t => {
        if (t.id === tradeId) {
          affectedTrade = { ...t, status: nextStatus };
          return affectedTrade;
        }
        return t;
      });
    });

    if (affectedTrade) {
      const actorName = this.selectedCollabName() || 'ADMIN';
      this.addLog(
        this.currentRole() + ' ' + actorName,
        'PERMUTA: ' + nextStatus,
        `Escala de permuta do dia ${affectedTrade.requestedDay} (${affectedTrade.requesterName}) ⇄ dia ${affectedTrade.targetDay} (${affectedTrade.targetName}) atualizada para ${nextStatus}.`
      );

      // If finally authorized by LT / Homologated by Supervisor, we actually execute the swap on the grid!
      if (nextStatus === 'SUPERVISOR_HOMOLOGADO') {
        const reqId = affectedTrade.requesterId;
        const tarId = affectedTrade.targetId;
        const reqDay = affectedTrade.requestedDay;
        const tarDay = affectedTrade.targetDay;

        // Find cell values
        let reqVal = '';
        let tarVal = '';

        this.grid().forEach(c => {
          if (c.collaboratorId === reqId && c.day === reqDay) reqVal = c.value;
          if (c.collaboratorId === tarId && c.day === tarDay) tarVal = c.value;
        });

        // Swap cells on grid
        this.grid.update(currentGrid => {
          return currentGrid.map(cell => {
            if (cell.collaboratorId === reqId && cell.day === reqDay) {
              return { ...cell, value: tarVal };
            }
            if (cell.collaboratorId === tarId && cell.day === tarDay) {
              return { ...cell, value: reqVal };
            }
            return cell;
          });
        });

        this.addLog(
          'SISTEMA',
          'TROCA EFETUADA',
          `Permuta aplicada na planilha mãe: ${affectedTrade.requesterName} asssumiu dia ${tarDay} e ${affectedTrade.targetName} assumiu dia ${reqDay}.`
        );
      }
    }
    this.saveState();
    if (affectedTrade && affectedTrade.status === 'SUPERVISOR_HOMOLOGADO') {
      this.saveGridToSupabase(); // Grava as alterações decorrentes da permuta aprovada no Supabase!
    }
  }

  addMagnaDate(collabId: string, label: string, date: string, priority: number) {
    this.collaborators.update(collabs => {
      return collabs.map(c => {
        if (c.id === collabId) {
          const dates = [...c.importantDates, { label, date, priority }];
          // Limit to maximum 5 as request limits
          if (dates.length > 5) dates.shift();
          return { ...c, importantDates: dates };
        }
        return c;
      });
    });

    const collab = this.collaborators().find(c => c.id === collabId);
    this.addLog(
      collab?.name || 'COLABORADOR',
      'RESERVA DATA MAGNA',
      `Registrou data magna de prioridade ${priority}: "${label}" em ${date}.`
    );
    this.saveState();
    this.saveMagnaDateToSupabase(collabId, label, date, priority); // Salva no Supabase!
  }

  // Helpers
  selectedCollabName() {
    if (this.currentRole() === 'OPERADOR') {
      const found = this.collaborators().find(c => c.id === this.selectedOperatorId());
      return found ? found.name : 'MILTON';
    }
    return '';
  }

  // Simulated Live JetFuel Operations Feed
  startLiveOperationsSimulator() {
    this.generateLiveFeed();
    if (typeof window === 'undefined') return;
    setInterval(() => {
      this.updateLiveFeedRandomly();
    }, 7000); // update every 7 seconds
  }

  generateLiveFeed() {
    const activeOps = ['MILTON', 'NORMAN', 'RAFAEL', 'DOURADO', 'VENANCIO', 'DIOGO', 'WILLIAN', 'SILVERIO'];
    const activeServidores = FLEET_SERVIDORES.slice(0, 5);
    const activeCTAs = FLEET_CTAS.slice(0, 4);

    const initialOps: JetFuelOperation[] = [
      {
        flight: 'RG-1842',
        aircraftModel: 'Boeing 737-8',
        aircraftPrefix: GOL_AIRCRAFT_737_8[0],
        stand: 'Stand 12',
        truckId: activeCTAs[0].id,
        truckType: 'CTAs',
        truckBrand: 'Capacidade 20.000L',
        operatorName: activeOps[0],
        status: 'ABASTECENDO',
        progress: 35,
        fuelVolume: 12500
      },
      {
        flight: 'RG-2101',
        aircraftModel: 'Boeing 737-7',
        aircraftPrefix: GOL_AIRCRAFT_737_7[1],
        stand: 'Stand 04',
        truckId: activeServidores[1].id,
        truckType: 'SERVIDORES',
        truckBrand: activeServidores[1].brand,
        operatorName: activeOps[1],
        status: 'AGUARDANDO',
        progress: 0,
        fuelVolume: 8500
      },
      {
        flight: 'RG-9912',
        aircraftModel: 'Boeing 737-8',
        aircraftPrefix: GOL_AIRCRAFT_737_8[4],
        stand: 'Stand VIP 01',
        truckId: activeCTAs[1].id,
        truckType: 'CTAs',
        truckBrand: 'Capacidade 20.000L',
        operatorName: activeOps[5],
        status: 'ABASTECENDO',
        progress: 80,
        fuelVolume: 15000
      }
    ];

    this.operations.set(initialOps);
  }

  updateLiveFeedRandomly() {
    this.operations.update(current => {
      return current.map(op => {
        if (op.status === 'ABASTECENDO') {
          const nextProgress = op.progress + Math.floor(Math.random() * 15) + 5;
          if (nextProgress >= 100) {
            return {
              ...op,
              progress: 100,
              status: 'CONCLUÍDO'
            };
          }
          return {
            ...op,
            progress: nextProgress
          };
        } else if (op.status === 'AGUARDANDO') {
          // 40% chance of starting
          if (Math.random() < 0.4) {
            return {
              ...op,
              status: 'ABASTECENDO',
              progress: 10
            };
          }
        } else if (op.status === 'CONCLUÍDO') {
          // 30% chance to cycle to a new flight
          if (Math.random() < 0.3) {
            const nextFlightNum = Math.floor(Math.random() * 8000) + 1000;
            const models = ['Boeing 737-7', 'Boeing 737-8'] as const;
            const selectedModel = models[Math.floor(Math.random() * 2)];
            const prefixes = selectedModel === 'Boeing 737-7' ? GOL_AIRCRAFT_737_7 : GOL_AIRCRAFT_737_8;
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const stands = ['Stand 03', 'Stand 05', 'Stand 09', 'Stand 14', 'Stand VIP 02', 'Gate 08'];
            const activeOps = ['MILTON', 'NORMAN', 'RAFAEL', 'DOURADO', 'VENANCIO', 'DIOGO', 'WILLIAN', 'SILVERIO'];
            const opName = activeOps[Math.floor(Math.random() * activeOps.length)];
            
            const trucks = Math.random() > 0.4 ? FLEET_SERVIDORES : FLEET_CTAS;
            const chosenTruck = trucks[Math.floor(Math.random() * trucks.length)];
            const truckType = 'capacity' in chosenTruck ? 'CTAs' : 'SERVIDORES';
            const brand = 'capacity' in chosenTruck 
              ? `Capacidade ${chosenTruck.capacity}` 
              : (chosenTruck as typeof FLEET_SERVIDORES[number]).brand;

            return {
              flight: `RG-${nextFlightNum}`,
              aircraftModel: selectedModel,
              aircraftPrefix: prefix,
              stand: stands[Math.floor(Math.random() * stands.length)],
              truckId: chosenTruck.id,
              truckType: truckType as 'SERVIDORES' | 'CTAs',
              truckBrand: brand,
              operatorName: opName,
              status: 'ABASTECENDO',
              progress: 5,
              fuelVolume: Math.floor(Math.random() * 12000) + 4000
            };
          }
        }
        return op;
      });
    });
  }
}
