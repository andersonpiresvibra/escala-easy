import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScaleService, Collaborator, ShiftType } from './scale.service';

interface AppNotification {
  id: string;
  type: 'publish' | 'alert' | 'trade';
  message: string;
  timestamp: string;
  read: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html'
})
export class AppComponent {
  public scaleService = inject(ScaleService);

  // Sub tab navigation: 'matrix' | 'ger.turnos' | 'siglas' | 'team' | 'team-mgmt'
  public activeSubTab = signal<'matrix' | 'ger.turnos' | 'siglas' | 'team' | 'team-mgmt'>('matrix');

  // Selected collaborator for detailed profile view
  selectedProfileCollabId = signal<string | null>(null);

  // Computes the active collaborator, falling back to the first one in the list
  selectedProfileCollab = computed(() => {
    const list = this.scaleService.collaborators();
    if (list.length === 0) return null;
    const id = this.selectedProfileCollabId();
    if (id) {
      const found = list.find(c => c.id === id);
      if (found) return found;
    }
    return list[0]; // fallback to first
  });

  // Dynamically computes stats, fatigue indexes, and shift hours for the selected collaborator
  collabStats = computed(() => {
    const collab = this.selectedProfileCollab();
    if (!collab) return null;

    const scale = collab.scale || {};
    let workDays = 0;
    let offDays = 0;
    
    // Calculate sequences
    let currentWorkStreak = 0;
    let maxWorkStreak = 0;
    
    let currentOffStreak = 0;
    let maxOffStreak = 0;

    for (let d = 1; d <= 30; d++) {
      const val = scale[d] || 'F';
      
      // We consider F (Folga), FE (Férias), LM (Licença Médica) as rest/off days
      const isRest = val === 'F' || val === 'FE' || val === 'LM';
      
      if (!isRest) {
        workDays++;
        currentWorkStreak++;
        maxWorkStreak = Math.max(maxWorkStreak, currentWorkStreak);
        
        currentOffStreak = 0;
      } else {
        offDays++;
        currentOffStreak++;
        maxOffStreak = Math.max(maxOffStreak, currentOffStreak);
        
        currentWorkStreak = 0;
      }
    }

    // Fatigue classification
    let fatigueRisk: 'Baixo' | 'Moderado' | 'Crítico' = 'Baixo';
    let fatigueColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    let fatigueDescription = 'Ciclo de descanso balanceado. Excelente recuperação biológica.';

    if (maxWorkStreak >= 6) {
      fatigueRisk = 'Crítico';
      fatigueColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse';
      fatigueDescription = 'Risco elevado de fadiga acumulada. Sequência contínua de ' + maxWorkStreak + ' dias no pátio. Recomenda-se escala de folga imediata para evitar incidentes com combustível.';
    } else if (maxWorkStreak === 5) {
      fatigueRisk = 'Moderado';
      fatigueColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      fatigueDescription = 'Atenção. Sequência de 5 dias trabalhados. Nível de alerta operacional intermediário.';
    }

    // Map shift to times
    let entryTime = '07:00';
    let exitTime = '15:20';
    if (collab.shift === 'MANHÃ') {
      entryTime = '06:00';
      exitTime = '14:00';
    } else if (collab.shift === 'TARDE') {
      entryTime = '14:00';
      exitTime = '22:00';
    } else if (collab.shift === 'MADRUGADA' || collab.shift === 'NOITE') {
      entryTime = '22:00';
      exitTime = '06:00';
    } else if (collab.shift === 'ADMINISTRATIVO') {
      entryTime = '08:00';
      exitTime = '17:00';
    }

    return {
      workDays,
      offDays,
      maxWorkStreak,
      maxOffStreak,
      fatigueRisk,
      fatigueColor,
      fatigueDescription,
      entryTime,
      exitTime
    };
  });

  getCollabPhoto(collab: any): string {
    if (!collab) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    
    // Curated high quality portrait placeholders that match pátio aviation staff
    const photos: { [id: string]: string } = {
      'PR-01': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'PR-02': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'PR-03': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      'PR-04': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    };
    
    if (photos[collab.id]) {
      return photos[collab.id];
    }
    
    // Seeded portrait from Unsplash
    const seed = collab.name.length % 10;
    const fallbackPortraits = [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
    ];
    return fallbackPortraits[seed];
  }

  // Real-time aviation clock
  currentTimeString = signal<string>('');

  // Dropdowns & Modals states
  public isDropdownOpen = signal<boolean>(false);
  public isNotificationOpen = signal<boolean>(false);
  public isAuthModalOpen = signal<boolean>(false);
  public authMode = signal<'LOGIN' | 'SIGNUP'>('LOGIN');
  public isImportModalOpen = signal<boolean>(false);
  public isDbModalOpen = signal<boolean>(false);

  // Database Connection Indicator
  dbStatus = signal<'checking' | 'connected' | 'error'>('connected');

  // Toast System
  toastMessage = signal<string | null>(null);

  // Paintbrush Mass Edit Mode
  showPaintbrushPanel = signal<boolean>(false);
  activePaintbrush = signal<string | null>(null);

  // Filter systems
  collabSearchQuery = signal<string>('');
  selectedFilterRole = signal<string>('TODOS');
  selectedFilterSector = signal<string>('TODOS');
  selectedFilterShift = signal<string>('TODOS');

  // Days list for June 2026 (June has 30 days. June 1st, 2026 is a Monday)
  daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  // Notifications State
  notifications = signal<AppNotification[]>([
    {
      id: 'n_1',
      type: 'publish',
      message: 'Escala oficial de combustíveis publicada para Junho de 2026.',
      timestamp: 'Hoje, 10:15',
      read: false
    },
    {
      id: 'n_2',
      type: 'alert',
      message: 'Aviso: Baixo efetivo no turno da Madrugada para o Setor Aeródromo.',
      timestamp: 'Hoje, 08:30',
      read: false
    },
    {
      id: 'n_3',
      type: 'trade',
      message: 'Everton Souza solicitou uma permuta de turno com Carlos Alberto para o dia 12.',
      timestamp: 'Ontem, 16:45',
      read: true
    }
  ]);

  // Unread notifications counter
  unreadNotificationsCount = computed(() => {
    return this.notifications().filter(n => !n.read).length;
  });

  // Shift manager editing state
  newShiftCode = signal<string>('');
  newShiftLabel = signal<string>('');
  newShiftHours = signal<string>('7h20');
  newShiftColor = signal<string>('#3b82f6');
  editingShiftCode = signal<string | null>(null);

  // Sigla manager editing state
  newSiglaCode = signal<string>('');
  newSiglaLabel = signal<string>('');
  newSiglaColor = signal<string>('#64748b');
  newSiglaDescription = signal<string>('');
  editingSiglaCode = signal<string | null>(null);

  // Lists for hour and minute dropdowns
  hoursList = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // Hour/Minute selectors for shift creation/editing
  startHour = signal<string>('07');
  startMinute = signal<string>('00');
  endHour = signal<string>('16');
  endMinute = signal<string>('00');

  // Computed signal to calculate shift duration automatically (Entrance vs Exit)
  calculatedShiftHours = computed(() => {
    const sH = parseInt(this.startHour(), 10) || 0;
    const sM = parseInt(this.startMinute(), 10) || 0;
    const eH = parseInt(this.endHour(), 10) || 0;
    const eM = parseInt(this.endMinute(), 10) || 0;

    let totalMinutes = 0;
    const startTotal = sH * 60 + sM;
    const endTotal = eH * 60 + eM;

    if (endTotal >= startTotal) {
      totalMinutes = endTotal - startTotal;
    } else {
      // Crosses midnight (e.g. 22:00 to 06:00)
      totalMinutes = (24 * 60 - startTotal) + endTotal;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const padMin = minutes.toString().padStart(2, '0');
    return `${hours}h${padMin}`;
  });

  // Selected collaborator and target shift for quick reallocation
  assignmentCollabId = signal<string>('');
  assignmentShiftCode = signal<string>('');

  // Portal do Colaborador (Frente C)
  selectedSimulatedCollabId = signal<string | null>(null);
  collaboratorProfileDarkMode = signal<boolean>(true);

  // Permuta (Trade Shift) simulation state
  isPermutaModalOpen = signal<boolean>(false);
  permutaSelectedDay = signal<number>(1);
  permutaTargetCollabId = signal<string>('');
  permutaStatusMessage = signal<string>('');

  // Gemini Upload & Scan
  importingState = signal<'idle' | 'processing' | 'done'>('idle');
  scannedTextResult = signal<string>('');
  scannedDataParsed = signal<any[]>([]);

  constructor() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.showToast('Escala Easy VIBRA - Protótipo MVP Pronto');
  }

  // Clock Update Function
  private updateClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    this.currentTimeString.set(`${hh}:${mm}:${ss} BRT`);
  }

  // Toast Functionality
  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  // Role Simulator
  changeRole(role: 'SUPERVISOR' | 'LIDER' | 'OPERADOR') {
    this.scaleService.currentRole.set(role);
    this.showToast(`Perfil alterado para: ${role === 'LIDER' ? 'LÍDER DE TURNO' : role}`);
  }

  // Filters computed list
  filteredCollaborators = computed(() => {
    const query = this.collabSearchQuery().toLowerCase().trim();
    const role = this.selectedFilterRole();
    const sector = this.selectedFilterSector();
    const shift = this.selectedFilterShift();

    return this.scaleService.collaborators().filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(query) || c.group.toLowerCase().includes(query);
      const matchesRole = role === 'TODOS' || c.role === role;
      const matchesSector = sector === 'TODOS' || c.sector === sector;
      const matchesShift = shift === 'TODOS' || c.shift === shift;
      return matchesSearch && matchesRole && matchesSector && matchesShift;
    });
  });

  // Get Day of Week Name
  getDayOfWeekLabel(day: number): string {
    const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    // June 1st 2026 is a Monday (Index 1)
    // Formula: (day - 1 + 1) % 7 = day % 7
    const index = (day) % 7; 
    return weekDays[index];
  }

  isDayWeekend(day: number): boolean {
    const index = (day) % 7;
    return index === 6 || index === 0; // Saturday & Sunday
  }

  // Notification methods
  markAllNotificationsAsRead() {
    this.notifications.set(this.notifications().map(n => ({ ...n, read: true })));
    this.showToast('Todas as notificações marcadas como lidas.');
  }

  markNotificationAsRead(id: string) {
    this.notifications.set(this.notifications().map(n => n.id === id ? { ...n, read: true } : n));
  }

  // Paintbrush logic
  togglePaintbrushPanel() {
    this.showPaintbrushPanel.set(!this.showPaintbrushPanel());
    if (!this.showPaintbrushPanel()) {
      this.activePaintbrush.set(null);
    } else {
      this.showToast('Modo de Pintura Ativado: Clique em uma sigla e depois na célula da escala');
    }
  }

  selectPaintbrush(code: string) {
    this.activePaintbrush.set(code);
    this.showToast(`Pincel ativo: ${code}. Clique nas células para aplicar.`);
  }

  applyPaintbrush(collabId: string, day: number) {
    if (this.scaleService.currentRole() === 'OPERADOR') {
      this.showToast('Acesso negado: Apenas Líder ou Supervisor pode alterar escalas.');
      return;
    }

    const brush = this.activePaintbrush();
    if (!brush) return;

    const collab = this.scaleService.collaborators().find(c => c.id === collabId);
    if (collab) {
      const updatedCollab = {
        ...collab,
        scale: { ...collab.scale, [day]: brush }
      };
      this.scaleService.updateCollaborator(updatedCollab);
    }
  }

  // Manage custom shifts
  startEditingShift(shift: ShiftType) {
    this.editingShiftCode.set(shift.code);
    this.newShiftCode.set(shift.code);
    this.newShiftLabel.set(shift.label);
    this.newShiftHours.set(shift.hours);
    this.newShiftColor.set(shift.color);
    
    // Parse startTime & endTime
    if (shift.startTime) {
      const parts = shift.startTime.split(':');
      if (parts.length === 2) {
        this.startHour.set(parts[0]);
        this.startMinute.set(parts[1]);
      }
    } else {
      this.startHour.set('07');
      this.startMinute.set('00');
    }

    if (shift.endTime) {
      const parts = shift.endTime.split(':');
      if (parts.length === 2) {
        this.endHour.set(parts[0]);
        this.endMinute.set(parts[1]);
      }
    } else {
      this.endHour.set('16');
      this.endMinute.set('00');
    }

    this.showToast(`Editando o turno "${shift.code}". Modifique os campos desejados.`);
  }

  cancelEditingShift() {
    this.editingShiftCode.set(null);
    this.newShiftCode.set('');
    this.newShiftLabel.set('');
    this.newShiftHours.set('7h20');
    this.newShiftColor.set('#3b82f6');
    this.startHour.set('07');
    this.startMinute.set('00');
    this.endHour.set('16');
    this.endMinute.set('00');
  }

  saveShiftType() {
    const code = this.newShiftCode().trim().toUpperCase();
    const label = this.newShiftLabel().trim();
    if (!code || !label) {
      this.showToast('Erro: Código e Nome do turno são obrigatórios.');
      return;
    }

    const calculatedHours = this.calculatedShiftHours();
    const sTime = `${this.startHour()}:${this.startMinute()}`;
    const eTime = `${this.endHour()}:${this.endMinute()}`;

    const editCode = this.editingShiftCode();
    if (editCode) {
      // Edit existing shift type
      const targetShift = this.scaleService.shiftTypes().find(s => s.code === editCode);
      if (targetShift) {
        const updatedShift: ShiftType = {
          ...targetShift,
          label,
          hours: calculatedHours,
          color: this.newShiftColor(),
          startTime: sTime,
          endTime: eTime
        };
        this.scaleService.saveShiftType(updatedShift);
      }
      this.cancelEditingShift();
      this.showToast(`Turno "${code}" atualizado com sucesso.`);
      this.scaleService.addAuditHistory('EDITAR_TURNO', `Turno "${code}" editado pelo gestor.`);
    } else {
      // Create new shift type
      const exists = this.scaleService.shiftTypes().some(s => s.code === code);
      if (exists) {
        this.showToast('Erro: Código de turno já cadastrado.');
        return;
      }

      const newShift: ShiftType = {
        code,
        label,
        hours: calculatedHours,
        color: this.newShiftColor(),
        startTime: sTime,
        endTime: eTime
      };

      this.scaleService.saveShiftType(newShift);
      this.cancelEditingShift();
      this.showToast(`Novo turno "${code}" criado com sucesso.`);
      this.scaleService.addAuditHistory('CRIAR_TURNO', `Novo turno "${code}" criado pelo gestor.`);
    }
  }

  removeShiftType(code: string) {
    // Check if any collaborator is currently assigned to this shift as their primary default shift
    const assignedCollabCount = this.getCollaboratorCountForShift(code);
    if (assignedCollabCount > 0) {
      this.showToast(`Erro: Há ${assignedCollabCount} colaborador(es) alocado(s) neste turno. Realoque-os primeiro.`);
      return;
    }

    this.scaleService.removeShiftType(code);
    this.showToast(`Sigla "${code}" removida.`);
    this.scaleService.addAuditHistory('REMOCAO_TURNO', `Turno com código "${code}" removido.`);
  }

  // Get real-time statistics for shift types
  getCollaboratorCountForShift(shiftCode: string): number {
    return this.scaleService.collaborators().filter(c => c.shift === shiftCode).length;
  }

  getScheduledDaysCountForShift(shiftCode: string): number {
    let count = 0;
    this.scaleService.collaborators().forEach(c => {
      Object.values(c.scale).forEach(val => {
        if (val === shiftCode) count++;
      });
    });
    return count;
  }

  // Sigla management methods
  startEditingSigla(sigla: any) {
    this.editingSiglaCode.set(sigla.code);
    this.newSiglaCode.set(sigla.code);
    this.newSiglaLabel.set(sigla.label);
    this.newSiglaColor.set(sigla.color);
    this.newSiglaDescription.set(sigla.description || '');
    this.showToast(`Editando a sigla "${sigla.code}". Modifique os campos desejados.`);
  }

  cancelEditingSigla() {
    this.editingSiglaCode.set(null);
    this.newSiglaCode.set('');
    this.newSiglaLabel.set('');
    this.newSiglaColor.set('#64748b');
    this.newSiglaDescription.set('');
  }

  saveSiglaType() {
    const code = this.newSiglaCode().trim().toUpperCase();
    const label = this.newSiglaLabel().trim();
    const color = this.newSiglaColor();
    const desc = this.newSiglaDescription().trim();

    if (!code || !label) {
      this.showToast('Erro: Código e Nome da sigla são obrigatórios.');
      return;
    }

    if (this.editingSiglaCode()) {
      // Edit existing
      const sigla = this.scaleService.siglaTypes().find(s => s.code === this.editingSiglaCode());
      if (sigla) {
        const updatedSigla = { ...sigla, label, color, description: desc };
        this.scaleService.saveSiglaType(updatedSigla);
      }
      this.cancelEditingSigla();
      this.showToast(`Sigla "${code}" atualizada com sucesso.`);
      this.scaleService.addAuditHistory('EDICAO_SIGLA', `Sigla "${code}" editada pelo gestor.`);
    } else {
      // Create new
      if (this.scaleService.siglaTypes().some(s => s.code === code) || this.scaleService.shiftTypes().some(sh => sh.code === code)) {
        this.showToast('Erro: Código de sigla já cadastrado ou em uso por um turno.');
        return;
      }
      this.scaleService.addSiglaType(code, label, color, desc);
      this.cancelEditingSigla();
      this.showToast(`Sigla "${code}" criada com sucesso.`);
    }
  }

  removeSiglaType(code: string) {
    // Check if any scheduled days contain this sigla
    let count = 0;
    this.scaleService.collaborators().forEach(c => {
      Object.values(c.scale).forEach(val => {
        if (val === code) count++;
      });
    });

    if (count > 0) {
      this.showToast(`Erro: Há ${count} dia(s) programado(s) com esta sigla. Substitua-os primeiro.`);
      return;
    }

    this.scaleService.removeSiglaType(code);
    this.showToast(`Sigla "${code}" removida.`);
  }

  // Dynamic colors for matrix rendering
  getShiftOrSiglaColor(code: string): string {
    const shift = this.scaleService.shiftTypes().find(s => s.code === code);
    if (shift) return shift.color;

    const sigla = this.scaleService.siglaTypes().find(s => s.code === code);
    if (sigla) return sigla.color;

    return '#1e293b'; // Default color
  }

  getShiftOrSiglaTextColor(code: string): string {
    if (code === 'F') return '#94a3b8'; // Slate-400
    return '#ffffff';
  }

  // Multi-employee Assignment & Movement logic
  assignEmployeeToShift() {
    const collabId = this.assignmentCollabId();
    const shiftCode = this.assignmentShiftCode();

    if (!collabId || !shiftCode) {
      this.showToast('Erro: Selecione um colaborador e o novo turno.');
      return;
    }

    const collab = this.scaleService.collaborators().find(c => c.id === collabId);
    const shiftType = this.scaleService.shiftTypes().find(s => s.code === shiftCode);

    if (!collab || !shiftType) {
      this.showToast('Erro: Seleção inválida.');
      return;
    }

    const oldShiftCode = collab.shift;

    const updatedScale = { ...collab.scale };
    for (let day = 1; day <= 30; day++) {
      if (updatedScale[day] === oldShiftCode) {
        updatedScale[day] = shiftCode;
      }
    }
    const updatedCollab = {
      ...collab,
      shift: shiftCode,
      hours: shiftType.hours,
      scale: updatedScale
    };

    this.scaleService.updateCollaborator(updatedCollab);
    this.showToast(`Colaborador ${collab.name} foi movido com sucesso para o turno "${shiftType.label}"!`);

    // Log this action to the official audit history
    this.scaleService.addAuditHistory(
      'ALOCACAO_TURNO',
      `Colaborador ${collab.name} movido do turno "${oldShiftCode}" para o turno "${shiftCode}" (${shiftType.hours}).`
    );

    // Reset fields
    this.assignmentCollabId.set('');
    this.assignmentShiftCode.set('');
  }

  // Auth Portal Simulation
  openAuthModal(mode: 'LOGIN' | 'SIGNUP') {
    this.authMode.set(mode);
    this.isAuthModalOpen.set(true);
  }

  submitAuth(nameInput: string, emailInput: string) {
    this.isAuthModalOpen.set(false);
    this.scaleService.selectedCollabName.set(nameInput || 'Anderson Pires');
    this.showToast(`Bem-vindo, ${nameInput || 'Anderson Pires'}! Autenticado com sucesso.`);
  }

  logout() {
    this.scaleService.selectedCollabName.set(null);
    this.selectedSimulatedCollabId.set(null);
    this.showToast('Sessão encerrada.');
  }

  // Simulated Portal Collaborator Info
  getLoggedCollab(): Collaborator | null {
    const id = this.selectedSimulatedCollabId();
    if (!id) return null;
    return this.scaleService.collaborators().find(c => c.id === id) || null;
  }

  // Shift swaps / Permutas logic
  openPermutaModal(day: number) {
    this.permutaSelectedDay.set(day);
    this.permutaTargetCollabId.set('');
    this.permutaStatusMessage.set('');
    this.isPermutaModalOpen.set(true);
  }

  // Colleagues matching same day sector but maybe different shift
  getPermutaCandidates(): Collaborator[] {
    const current = this.getLoggedCollab();
    if (!current) return [];
    return this.scaleService.collaborators().filter(c => c.id !== current.id && c.sector === current.sector);
  }

  requestPermuta() {
    const current = this.getLoggedCollab();
    const targetId = this.permutaTargetCollabId();
    const day = this.permutaSelectedDay();

    if (!current || !targetId) {
      this.permutaStatusMessage.set('Selecione um colega para permuta.');
      return;
    }

    const target = this.scaleService.collaborators().find(c => c.id === targetId);
    if (!target) return;

    const currentShift = current.scale[day] || 'F';
    const targetShift = target.scale[day] || 'F';

    if (currentShift === targetShift) {
      this.permutaStatusMessage.set('Erro: Vocês já possuem a mesma escala neste dia.');
      return;
    }

    const updatedCurrent = { ...current, scale: { ...current.scale, [day]: targetShift } };
    const updatedTarget = { ...target, scale: { ...target.scale, [day]: currentShift } };

    this.scaleService.updateCollaborator(updatedCurrent);
    this.scaleService.updateCollaborator(updatedTarget);
    this.isPermutaModalOpen.set(false);
    this.showToast(`Permuta realizada! Você assumiu o turno "${targetShift}" e ${target.name} assumiu "${currentShift}".`);

    // Add audit logs & notification
    this.scaleService.addAuditHistory(
      'PERMUTA_TURNO',
      `Permuta de escala no dia ${day}/06: ${current.name} (${currentShift} ⇄ ${targetShift}) com ${target.name}.`
    );

    const newNotif: AppNotification = {
      id: 'n_permuta_' + Math.random().toString(36).substring(2, 6),
      type: 'trade',
      message: `Permuta concluída: ${current.name} trocou o dia ${day} com ${target.name}.`,
      timestamp: 'Agora mesmo',
      read: false
    };
    this.notifications.set([newNotif, ...this.notifications()]);
  }

  // Simulated peer workers on same shift & day
  getConcomitantColegues(day: number): Collaborator[] {
    const current = this.getLoggedCollab();
    if (!current) return [];
    const currentShift = current.scale[day] || 'F';
    if (currentShift === 'F') return []; // Off duty

    return this.scaleService.collaborators().filter(c => c.id !== current.id && c.scale[day] === currentShift && c.sector === current.sector);
  }

  openDbConfigModal() {
    this.isDbModalOpen.set(true);
  }

  // Gemini IA Image Scaling Import Simulation
  openImportModal() {
    this.isImportModalOpen.set(true);
    this.importingState.set('idle');
    this.scannedTextResult.set('');
    this.scannedDataParsed.set([]);
  }

  async triggerAIScan(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    this.importingState.set('processing');
    this.showToast('IA lendo imagem da escala. Processando OCR e estruturação...');

    // Simulate standard prompt to Gemini and process OCR parsing
    setTimeout(() => {
      // Create interesting mocked parsed result from the scales image upload
      const parsed = [
        { name: 'Gabriel Alencar', role: 'OPERADOR', shift: 'TARDE', group: 'Tarde', sector: 'AERÓDROMO' },
        { name: 'Hugo Mascarenhas', role: 'LIDER', shift: 'MANHÃ', group: 'Líderes', sector: 'AERÓDROMO' },
        { name: 'Igor Silveira', role: 'OPERADOR', shift: 'MADRUGADA', group: 'Madrugada', sector: 'AERÓDROMO' }
      ];

      this.scannedTextResult.set(
        `[OCR RAW LOGS]:\nESCALA DIÁRIA DE TRABALHO - VIBRA JETFUEL\nData Extraída: Junho 2026\nHugo Mascarenhas - LT - MANHÃ - PÁTIO\nGabriel Alencar - OP - TARDE - VIP\nIgor Silveira - OP - MADRUGADA - PÁTIO`
      );
      this.scannedDataParsed.set(parsed);
      this.importingState.set('done');
      this.showToast('Escala importada e analisada com sucesso!');
    }, 2500);
  }

  commitAIScannedUsers() {
    const users = this.scannedDataParsed();
    if (users.length === 0) return;

    users.forEach(u => {
      this.scaleService.addCollaborator(
        u.name,
        u.role,
        '7h20',
        u.group,
        u.shift,
        u.sector,
        0,
        100
      );
    });

    this.isImportModalOpen.set(false);
    this.showToast(`${users.length} novos colaboradores da escala importada foram integrados!`);
  }
}
