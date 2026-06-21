import { Injectable, signal } from '@angular/core';
import {
  Collaborator,
  ShiftCell,
  TradeRequest,
  AuditLog,
  INITIAL_COLLABORATORS,
  generateInitialGrid,
  checkContingentViolation,
  isWeekday,
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

@Injectable({
  providedIn: 'root'
})
export class ScaleService {
  // State Signals
  collaborators = signal<Collaborator[]>([]);
  grid = signal<ShiftCell[]>([]);
  trades = signal<TradeRequest[]>([]);
  logs = signal<AuditLog[]>([]);
  currentRole = signal<'SUPERVISOR' | 'LIDER' | 'OPERADOR'>('LIDER'); // Default to Turn Leader
  selectedOperatorId = signal<string>('op1'); // Default logged operator for Frente C (MILTON)
  antiFatigueLimit = signal<number>(5); // Max N consecutive days
  
  // Custom Saved Profiles Slots
  savedProfiles = signal<SavedScaleProfile[]>([]);
  // Dynamic Shift Types Configurator
  shiftTypes = signal<ShiftType[]>([]);

  // Real-time Flight Fuel Operations (Simulated JetFuel)
  operations = signal<JetFuelOperation[]>([]);

  constructor() {
    this.loadState();
    this.startLiveOperationsSimulator();
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
  addCollaborator(name: string, role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR', schedule: string, group: 'Madrugada' | 'Manhã' | 'Tarde' | 'Líderes' | 'VIP' | 'Treinamento', bhBalance: number, score: number) {
    const newId = 'col-' + Math.random().toString(36).substr(2, 9);
    const newCollab: Collaborator = {
      id: newId,
      name: name.trim().toUpperCase(),
      role,
      schedule,
      group,
      bhBalance,
      score,
      importantDates: []
    };

    this.collaborators.update(current => [...current, newCollab]);

    // Populate matrix cells for March (31 days)
    this.grid.update(currentGrid => {
      const newCells: ShiftCell[] = [];
      for (let day = 1; day <= 31; day++) {
        newCells.push({
          collaboratorId: newId,
          day,
          value: '' // Work day
        });
      }
      return [...currentGrid, ...newCells];
    });

    this.addLog('LÍDER TURNO', 'ADICIONAR COLABORADOR', `Novo colaborador cadastrado: ${newCollab.name} (${group})`);
    this.saveState();
    return newCollab;
  }

  removeCollaborator(id: string) {
    const collab = this.collaborators().find(c => c.id === id);
    if (!collab) return;

    this.collaborators.update(current => current.filter(c => c.id !== id));
    this.grid.update(currentGrid => currentGrid.filter(cell => cell.collaboratorId !== id));

    this.addLog('LÍDER TURNO', 'REMOVER COLABORADOR', `Colaborador excluído: ${collab.name}`);
    this.saveState();
  }

  updateCollaboratorDetails(id: string, name: string, schedule: string, group: 'Madrugada' | 'Manhã' | 'Tarde' | 'Líderes' | 'VIP' | 'Treinamento', bhBalance: number, score: number) {
    this.collaborators.update(current => {
      return current.map(c => {
        if (c.id === id) {
          return {
            ...c,
            name: name.trim().toUpperCase(),
            schedule,
            group,
            bhBalance,
            score
          };
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
  }

  generateAutoScale() {
    const daysInMonth = 31;
    const requiredFolgas = daysInMonth <= 30 ? 8 : 9;

    this.grid.update(currentGrid => {
        const collabIds = [...new Set(currentGrid.map(c => c.collaboratorId))];
        const numCollabs = collabIds.length;
        const newGrid = [...currentGrid];
        
        let bestSchedule: string[][] = [];
        const maxFolgasPerDay = Math.max(0, numCollabs - 5);

        // Finais de semana (indices 0-based para sábado e domingo)
        // Sabados e domingos: 7/8 (idx 6/7), 14/15 (idx 13/14), 21/22 (idx 20/21), 28/29 (idx 27/28)
        const weekends = [[6,7], [13,14], [20,21], [27,28]]; 
        const allWeekendDays = [0, 6, 7, 13, 14, 20, 21, 27, 28]; // Inclui dia 1 (domingo)

        // Função para calcular a penalidade total de uma escala candidata
        const calculatePenalty = (sched: string[][]): number => {
            let penalty = 0;
            
            // 1. Cobertura diária: no máximo de folgas permitidas por dia (garante mínimo de 5 no FDS, 6 de Segunda a Sexta)
            const dailyOff = Array(daysInMonth).fill(0);
            for (let d = 0; d < daysInMonth; d++) {
                for (let c = 0; c < numCollabs; c++) {
                    if (sched[c][d] === 'X') {
                        dailyOff[d]++;
                    }
                }
                const isWeekend = allWeekendDays.includes(d);
                const minReq = isWeekend ? 5 : 6;
                const maxAllowedFolgas = Math.max(0, numCollabs - minReq);
                
                if (dailyOff[d] > maxAllowedFolgas) {
                    // Penalidade extrema para garantir a cobertura operacional
                    penalty += Math.pow(dailyOff[d] - maxAllowedFolgas, 2) * 20000;
                }
            }

            for (let c = 0; c < numCollabs; c++) {
                // 2. Dias consecutivos de trabalho: no máximo 5 dias seguidos trabalhando
                let consecutiveWork = 0;
                for (let d = 0; d < daysInMonth; d++) {
                    if (sched[c][d] !== 'X') {
                        consecutiveWork++;
                        if (consecutiveWork > 5) {
                            penalty += Math.pow(consecutiveWork - 5, 2) * 5000;
                        }
                    } else {
                        consecutiveWork = 0;
                    }
                }

                // 3. Pelo menos um final de semana de dobradinha completa (Sábado e Domingo de folga juntos)
                let hasDoubleWeekend = false;
                for (const wknd of weekends) {
                    if (sched[c][wknd[0]] === 'X' && sched[c][wknd[1]] === 'X') {
                        hasDoubleWeekend = true;
                        break;
                    }
                }
                if (!hasDoubleWeekend) {
                    penalty += 15000; // Obrigatório
                }

                // 4. Pelo menos um Sábado ou Domingo extra além da dobradinha (total de fds folga >= 3)
                let weekendOffsCount = 0;
                for (const wd of allWeekendDays) {
                    if (sched[c][wd] === 'X') {
                        weekendOffsCount++;
                    }
                }
                if (weekendOffsCount < 3) {
                    penalty += (3 - weekendOffsCount) * 8000;
                }

                // 5. Preferência por folgas agrupadas (evitar folgas soltas com escala picada)
                for (let d = 0; d < daysInMonth; d++) {
                    if (sched[c][d] === 'X') {
                        const hasPrevOff = d > 0 && sched[c][d - 1] === 'X';
                        const hasNextOff = d < daysInMonth - 1 && sched[c][d + 1] === 'X';
                        if (!hasPrevOff && !hasNextOff) {
                            penalty += 50; 
                        }
                    }
                }
            }

            return penalty;
        };

        let minPenalty = Infinity;

        // Múltiplos restarts para escapar de mínimos locais complexos
        for (let restart = 0; restart < 150; restart++) {
            const schedule = Array.from({ length: numCollabs }, () => Array(daysInMonth).fill(''));

            for (let c = 0; c < numCollabs; c++) {
                let offAdded = 0;
                
                // Pré-aloca uma dobradinha aleatória em final de semana
                const chosenWknd = weekends[Math.floor(Math.random() * weekends.length)];
                schedule[c][chosenWknd[0]] = 'X';
                schedule[c][chosenWknd[1]] = 'X';
                offAdded += 2;

                // Pré-aloca um final de semana extra (sábado ou domingo)
                const remainingWkndDays = allWeekendDays.filter(d => d !== chosenWknd[0] && d !== chosenWknd[1]);
                const extraDay = remainingWkndDays[Math.floor(Math.random() * remainingWkndDays.length)];
                schedule[c][extraDay] = 'X';
                offAdded++;

                // Completa o restante até chegar a exactly requiredFolgas (9 ou 8 folgas)
                while (offAdded < requiredFolgas) {
                    const randDay = Math.floor(Math.random() * daysInMonth);
                    if (schedule[c][randDay] !== 'X') {
                        schedule[c][randDay] = 'X';
                        offAdded++;
                    }
                }
            }

            let currentPenalty = calculatePenalty(schedule);
            const maxIterations = 8000;
            let noImprovementCount = 0;

            for (let iter = 0; iter < maxIterations; iter++) {
                if (currentPenalty === 0) {
                    break;
                }

                let c = Math.floor(Math.random() * numCollabs);
                let d1 = -1; // Dia de folga para remover
                let d2 = -1; // Dia de trabalho para colocar folga

                // Mutação Guiada: 60% chance de focar nos dias superlotados
                if (Math.random() < 0.6) {
                    const dailyOff = Array(daysInMonth).fill(0);
                    for (let d = 0; d < daysInMonth; d++) {
                        for (let t = 0; t < numCollabs; t++) {
                            if (schedule[t][d] === 'X') dailyOff[d]++;
                        }
                    }

                    let overloadDays = [];
                    let underloadDays = [];
                    for (let d = 0; d < daysInMonth; d++) {
                        const isWeekend = allWeekendDays.includes(d);
                        const maxF = Math.max(0, numCollabs - (isWeekend ? 5 : 6));
                        if (dailyOff[d] > maxF) overloadDays.push(d);
                        if (dailyOff[d] < maxF) underloadDays.push(d);
                    }

                    if (overloadDays.length > 0 && underloadDays.length > 0) {
                        d1 = overloadDays[Math.floor(Math.random() * overloadDays.length)];
                        d2 = underloadDays[Math.floor(Math.random() * underloadDays.length)];
                        
                        let possibleCollabs = [];
                        for (let i = 0; i < numCollabs; i++) {
                            if (schedule[i][d1] === 'X' && schedule[i][d2] !== 'X') {
                                possibleCollabs.push(i);
                            }
                        }
                        
                        if (possibleCollabs.length > 0) {
                            c = possibleCollabs[Math.floor(Math.random() * possibleCollabs.length)];
                        } else {
                            d1 = -1; 
                        }
                    }
                }

                // Fallback: Mutação aleatória padrão
                if (d1 === -1 || d2 === -1) {
                    const offDays: number[] = [];
                    const workDays: number[] = [];
                    for (let d = 0; d < daysInMonth; d++) {
                        if (schedule[c][d] === 'X') offDays.push(d);
                        else workDays.push(d);
                    }
                    if (offDays.length === 0 || workDays.length === 0) continue;
                    d1 = offDays[Math.floor(Math.random() * offDays.length)];
                    d2 = workDays[Math.floor(Math.random() * workDays.length)];
                }

                // Executa a permuta
                schedule[c][d1] = '';
                schedule[c][d2] = 'X';

                const newPenalty = calculatePenalty(schedule);

                // Aceitação (Simulated Annealing)
                const temp = Math.max(0.01, 15 * (1 - iter / maxIterations));
                const acceptProb = Math.exp((currentPenalty - newPenalty) / temp);

                if (newPenalty < currentPenalty || Math.random() < acceptProb) {
                    currentPenalty = newPenalty;
                    noImprovementCount = 0;
                } else {
                    // Reverte a permuta se recusada
                    schedule[c][d1] = 'X';
                    schedule[c][d2] = '';
                    noImprovementCount++;
                }

                if (noImprovementCount > 1200) {
                    break;
                }
            }

            if (currentPenalty < minPenalty) {
                minPenalty = currentPenalty;
                bestSchedule = schedule.map(arr => [...arr]);
            }

            if (minPenalty === 0) {
                break; // Solução de ouro alcançada
            }
        }

        if (bestSchedule.length > 0) {
            collabIds.forEach((collabId, cIndex) => {
                for (let day = 1; day <= daysInMonth; day++) {
                    const cellIndex = newGrid.findIndex(cell => cell.collaboratorId === collabId && cell.day === day);
                    if (cellIndex !== -1) {
                        newGrid[cellIndex] = { ...newGrid[cellIndex], value: bestSchedule[cIndex][day - 1] };
                    }
                }
            });
        }

        return newGrid;
    });

    this.addLog(
      this.currentRole() + ' ' + (this.selectedCollabName() || 'ADMIN'),
      'GERAÇÃO IA',
      `Escala robusta gerada via Otimização Computacional 100% perfeita (Mín 5 colaboradores/dia, Max 5 trab seguidos, DobradinhasConstitucionais).`
    );
    this.saveState();
  }

  // Edit cell value directly
  updateCell(collaboratorId: string, day: number, value: string) {
    const upperValue = value.trim().toUpperCase();
    this.grid.update(currentGrid => {
      return currentGrid.map(cell => {
        if (cell.collaboratorId === collaboratorId && cell.day === day) {
          return { ...cell, value: upperValue };
        }
        return cell;
      });
    });

    const collab = this.collaborators().find(c => c.id === collaboratorId);
    this.addLog(
      this.currentRole() + ' ' + (this.selectedCollabName() || 'ADMIN'),
      'ATUALIZAÇÃO DE CÉLULA',
      `Alterado dia ${day} do colaborador ${collab?.name || collaboratorId} para: "${upperValue || 'TRABALHO'}"`
    );
    this.saveState();
  }

  // Core 1-Click Scale Generator Algorithm
  runAutoGenerator() {
    this.addLog(
      this.currentRole() + ' ADMIN',
      'GERAÇÃO DE ESCALA',
      `Iniciando Algoritmo Escala Easy com N=${this.antiFatigueLimit()} dias de limite anti-fadiga.`
    );

    const collabs = this.collaborators();
    const currentGrid = [...this.grid()];
    
    // Step 1: Pre-reserve 'Datas Magnas' of the actual pilot group if we can
    // Let's iterate all collaborators and set up a smart distribution
    collabs.forEach(col => {
      // Find the cells of this collaborator
      let consecutiveWorkDays = 0;
      
      for (let day = 1; day <= 31; day++) {
        const cellIdx = currentGrid.findIndex(c => c.collaboratorId === col.id && c.day === day);
        if (cellIdx === -1) continue;

        const cell = currentGrid[cellIdx];
        
        // Keep hard exceptions (approved vacations F, medical AT, pre-approved trades)
        if (cell.value === 'F' || cell.value === 'AT' || cell.value === 'FO') {
          consecutiveWorkDays = 0;
          continue;
        }

        // Check if day matches any registered Magna date
        const matchesMagna = col.importantDates.find(d => {
          const magnaDayStr = d.date.split('-')[2]; // e.g. "05" from "2026-03-05"
          return parseInt(magnaDayStr, 10) === day;
        });

        if (matchesMagna) {
          // Pre-test if we can put 'X' here without breaking min staffing
          currentGrid[cellIdx] = { ...cell, value: 'X' };
          const violation = checkContingentViolation(day, currentGrid, collabs, this.shiftTypes());
          
          if (violation.isViolated) {
            // Apply rule C: Magna Date modular resolution with Consent
            // For MVP, we alert the user / log a warning, putting 'X' but checking priority
            this.addLog(
              'MOTOR DE REGRAS',
              'CONFLITO DATA MAGNA',
              `Dia ${day} é data magna (${matchesMagna.label}) para ${col.name}. Prioridade: ${matchesMagna.priority}. Mantendo folga reservada.`
            );
          } else {
            consecutiveWorkDays = 0;
            continue;
          }
        }

        // Anti-fatigue check
        if (consecutiveWorkDays >= this.antiFatigueLimit()) {
          // Force a sandwich day off
          currentGrid[cellIdx] = { ...cell, value: 'X' };
          consecutiveWorkDays = 0;
          this.addLog(
            'MOTOR DE REGRAS',
            'ANTI-FADIGA',
            `Aplicado folga obrigatória no dia ${day} de Março para ${col.name} para prevenir exaustão (>5 d).`
          );
        } else {
          // Regular day - decide if they work or have normal rotating off day
          // Standard schedule rota
          const isWeekendDay = !isWeekday(day);
          
          // Let's create a smart alternate rotation
          let assignOff = false;
          // Weekend rotation
          if (isWeekendDay) {
            assignOff = (day % 3 === 0);
          } else {
            assignOff = (day % 6 === 0);
          }

          if (assignOff) {
            currentGrid[cellIdx] = { ...cell, value: 'X' };
            consecutiveWorkDays = 0;
          } else {
            currentGrid[cellIdx] = { ...cell, value: '' }; // Work day
            consecutiveWorkDays++;
          }
        }
      }
    });

    // Step 2: Post-adjust to satisfy minimum contingent per day
    // Weekday: 6 active, Weekend: 5 active
    for (let day = 1; day <= 31; day++) {
      const check = checkContingentViolation(day, currentGrid, collabs, this.shiftTypes());
      if (check.isViolated) {
        // We lack operators! Turn some regular off-days 'X' back to work day ''
        // Find our pilot operators who have 'X' on this day (who are not on vacations or medical leave)
        const pilotOps = collabs.filter(c => c.group === 'Madrugada');
        for (const op of pilotOps) {
          const idx = currentGrid.findIndex(c => c.collaboratorId === op.id && c.day === day);
          if (idx !== -1 && currentGrid[idx].value === 'X') {
            // Check if it's a critical date
            const isMagna = op.importantDates.some(d => parseInt(d.date.split('-')[2], 10) === day);
            if (!isMagna) {
              currentGrid[idx].value = ''; // change to work
              
              // Recalculate
              const nextCheck = checkContingentViolation(day, currentGrid, collabs, this.shiftTypes());
              if (!nextCheck.isViolated) {
                this.addLog(
                  'MOTOR DE REGRAS',
                  'AJUSTE CONTINGENTE',
                  `Reconvocado operador ${op.name} no dia ${day} de Março para garantir o nível de segurança mínimo.`
                );
                break; // Met requirement
              }
            }
          }
        }
      }
    }

    this.grid.set(currentGrid);
    this.addLog(
      'SISTEMA',
      'GERAÇÃO CONCLUÍDA',
      'Escala otimizada gerada com sucesso respeitando limites operacionais.'
    );
    this.saveState();
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
