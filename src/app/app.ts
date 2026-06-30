import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScaleService, Collaborator, ShiftType, SpecialDate, FolgaRequest } from './scale.service';

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

  // Sub tab navigation: 'matrix' | 'ger.turnos' | 'siglas' | 'team' | 'team-mgmt' | 'portal'
  public activeSubTab = signal<'matrix' | 'ger.turnos' | 'siglas' | 'team' | 'team-mgmt' | 'portal'>('matrix');
  
  public teamViewMode = signal<'gallery' | 'mgmt'>('gallery');
  public editingCollab = signal<Collaborator | null>(null);
  public isPortalCollabListOpen = signal<boolean>(false);

  // Simulated Day of Month (1 to 30) for Folga request window check
  simulatedDayOfMonth = signal<number>(5);

  // New Collaborator Registration Fields
  newCollabBirthday = signal<string>('');
  newCollabSpecialDates = signal<SpecialDate[]>([
    { description: '', date: '', priority: 1 },
    { description: '', date: '', priority: 2 },
    { description: '', date: '', priority: 3 },
    { description: '', date: '', priority: 4 },
    { description: '', date: '', priority: 5 }
  ]);

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
      fatigueDescription = 'Risco elevado de fadiga acumulada. Sequência contínua de ' + maxWorkStreak + ' dias no pátio. Recomenda-se escala de folga imediata para evitar incidentes operacionais.';
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
    // Forçar temporariamente o ícone clássico do MSN Messenger para todos os colaboradores, conforme solicitação do usuário
    /*
    if (collab && collab.photo) {
      return collab.photo;
    }
    */
    
    const msnAvatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="50" fill="#0b1a30" stroke="#10213b" stroke-width="1.5" />
  <g transform="translate(0, 4)">
    <circle cx="40" cy="38" r="12" fill="#0080C0" />
    <path d="M 40 38 A 12 12 0 0 1 52 38 A 9 9 0 0 0 40 38 Z" fill="#3399FF" opacity="0.5"/>
    <path d="M 40 52 C 22 52, 16 78, 16 84 L 64 84 C 64 78, 58 52, 40 52 Z" fill="#0080C0" />
    <path d="M 40 52 C 27 52, 20 68, 18 78 C 25 65, 36 56, 40 56 C 44 56, 55 65, 62 78 C 60 68, 53 52, 40 52 Z" fill="#3399FF" opacity="0.5"/>
    <circle cx="62" cy="44" r="12" fill="#74C322" />
    <path d="M 62 44 A 12 12 0 0 1 74 44 A 9 9 0 0 0 62 44 Z" fill="#9CE146" opacity="0.6"/>
    <path d="M 62 58 C 44 58, 38 84, 38 90 L 86 90 C 86 84, 80 58, 62 58 Z" fill="#74C322" stroke="#0b1a30" stroke-width="2" />
    <path d="M 62 58 C 49 58, 42 74, 40 84 C 47 71, 58 62, 62 62 C 66 62, 77 71, 84 84 C 82 74, 75 58, 62 58 Z" fill="#9CE146" opacity="0.5"/>
  </g>
</svg>`;

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(msnAvatarSvg);
  }

  // Real-time aviation clock
  currentTimeString = signal<string>('');

  // Dropdowns & Modals states
  public isDropdownOpen = signal<boolean>(false);
  public isMatrixOptionsOpen = signal<boolean>(false);
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

  // Row-level inline editing signals
  editingRowCollabId = signal<string | null>(null);
  editingRowScaleDraft = signal<{ [day: number]: string }>({});

  // Filter systems
  collabSearchQuery = signal<string>('');
  selectedFilterRole = signal<string>('TODOS');
  selectedFilterSector = signal<string>('TODOS');
  selectedFilterShift = signal<string>('TODOS');

  // Days list for July 2026 (July has 31 days. July 1st, 2026 is a Wednesday)
  daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  // Notifications State
  notifications = signal<AppNotification[]>([
    {
      id: 'n_1',
      type: 'publish',
      message: 'Escala oficial de trabalho publicada para Junho de 2026.',
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

  // New collaborator photo upload state
  newCollabPhotoData = signal<string | null>(null);

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
    // July 1st 2026 is a Wednesday (Index 3)
    // Formula: (day - 1 + 3) % 7 = (day + 2) % 7
    const index = (day + 2) % 7; 
    return weekDays[index];
  }

  isDayWeekend(day: number): boolean {
    // July 1st 2026 is a Wednesday
    const index = (day + 2) % 7;
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

  // Row-level inline scale editing methods
  startRowScaleEdit(collab: Collaborator) {
    if (this.scaleService.currentRole() === 'OPERADOR') {
      this.showToast('Acesso negado: Apenas Líder ou Supervisor pode alterar escalas.');
      return;
    }
    // Automatically open the paintbrush panel so the user has the acronyms toolbar visible at the top
    this.showPaintbrushPanel.set(true);

    this.editingRowCollabId.set(collab.id);
    this.editingRowScaleDraft.set({ ...collab.scale });
    this.showToast(`Edição da linha de ${collab.name}. Selecione uma sigla no painel do topo e clique nos dias correspondentes.`);
  }

  cancelRowScale() {
    this.editingRowCollabId.set(null);
    this.editingRowScaleDraft.set({});
    this.showToast('Edição de linha cancelada.');
  }

  updateDraftCell(day: number, value: string) {
    this.editingRowScaleDraft.update(draft => ({ ...draft, [day]: value }));
  }

  paintDraftCell(day: number) {
    const active = this.activePaintbrush();
    if (!active) {
      this.showToast('Selecione um turno ou sigla no painel do topo para pintar.');
      return;
    }
    this.updateDraftCell(day, active);
  }

  saveRowScale(collab: Collaborator) {
    if (this.scaleService.currentRole() === 'OPERADOR') {
      this.showToast('Acesso negado.');
      return;
    }

    const draft = this.editingRowScaleDraft();
    const updatedCollab = {
      ...collab,
      scale: draft
    };

    this.scaleService.updateCollaborator(updatedCollab);
    this.editingRowCollabId.set(null);
    this.editingRowScaleDraft.set({});
    this.showToast(`Escala da linha de ${collab.name} salva com sucesso!`);

    this.scaleService.addAuditHistory(
      'EDITAR_ESCALA_LINHA',
      `Escala mensal do colaborador ${collab.name} editada via controle de linha direta.`
    );
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
    if (code === '-') return '#091524'; // Very deep dark background for sem definição
    const shift = this.scaleService.shiftTypes().find(s => s.code === code);
    if (shift) return shift.color;

    const sigla = this.scaleService.siglaTypes().find(s => s.code === code);
    if (sigla) return sigla.color;

    return '#1e293b'; // Default color
  }

  getShiftOrSiglaTextColor(code: string): string {
    if (code === '-') return '#475569'; // Slate-600 for the dash
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

  loginAsCollab(id: string) {
    this.selectedSimulatedCollabId.set(id);
    const collab = this.scaleService.collaborators().find(c => c.id === id);
    if (collab) {
      this.scaleService.selectedCollabName.set(collab.name);
      this.scaleService.currentRole.set(collab.role);
      this.showToast(`Sessão simulada como ${collab.name}!`);
    } else {
      this.selectedSimulatedCollabId.set(null);
      this.scaleService.selectedCollabName.set('');
      this.scaleService.currentRole.set('SUPERVISOR');
    }
  }

  registerCollaborator(
    name: string,
    role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR',
    group: string,
    shift: string,
    sector: 'AERÓDROMO' | 'VIP' | 'TREINAMENTO',
    bh: number,
    score: number,
    photo?: string,
    birthday?: string,
    sd1Desc?: string, sd1Date?: string,
    sd2Desc?: string, sd2Date?: string,
    sd3Desc?: string, sd3Date?: string,
    sd4Desc?: string, sd4Date?: string,
    sd5Desc?: string, sd5Date?: string
  ) {
    const specialDates: SpecialDate[] = [];
    if (sd1Desc && sd1Date) specialDates.push({ description: sd1Desc, date: sd1Date, priority: 1 });
    if (sd2Desc && sd2Date) specialDates.push({ description: sd2Desc, date: sd2Date, priority: 2 });
    if (sd3Desc && sd3Date) specialDates.push({ description: sd3Desc, date: sd3Date, priority: 3 });
    if (sd4Desc && sd4Date) specialDates.push({ description: sd4Desc, date: sd4Date, priority: 4 });
    if (sd5Desc && sd5Date) specialDates.push({ description: sd5Desc, date: sd5Date, priority: 5 });

    this.scaleService.addCollaborator(
      name,
      role,
      '7h20',
      group,
      shift,
      sector,
      bh,
      score,
      photo,
      birthday,
      specialDates
    );
  }

  savePortalSpecialDates(birthday: string, specialDates: SpecialDate[]) {
    const collab = this.getLoggedCollab();
    if (!collab) {
      this.showToast('Selecione um colaborador na simulação primeiro.');
      return;
    }

    const validDates = specialDates.filter(d => d.date && d.description.trim());

    const updatedCollab: Collaborator = {
      ...collab,
      birthday: birthday || '',
      specialDates: validDates
    };

    this.scaleService.updateCollaborator(updatedCollab);
    this.showToast('Datas especiais atualizadas com sucesso!');
  }

  requestPortalFolga(date: string) {
    const collab = this.getLoggedCollab();
    if (!collab) {
      this.showToast('Selecione um colaborador na simulação primeiro.');
      return;
    }
    const result = this.scaleService.requestFolga(collab.id, date, this.simulatedDayOfMonth());
    this.showToast(result.message);
  }

  removePortalFolga(date: string) {
    const collab = this.getLoggedCollab();
    if (!collab) {
      this.showToast('Selecione um colaborador na simulação primeiro.');
      return;
    }
    const result = this.scaleService.removeFolga(collab.id, date, this.simulatedDayOfMonth());
    this.showToast(result.message);
  }

  getFolgaRequestCount(day: number): number {
    const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
    let count = 0;
    for (const collab of this.scaleService.collaborators()) {
      if (collab.folgaRequests) {
        if (collab.folgaRequests.some(r => r.date === dateStr)) {
          count++;
        }
      }
    }
    return count;
  }

  getCollaboratorsForFolga(day: number): string[] {
    const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
    const names: string[] = [];
    for (const collab of this.scaleService.collaborators()) {
      if (collab.folgaRequests && collab.folgaRequests.some(r => r.date === dateStr)) {
        names.push(collab.name);
      }
    }
    return names;
  }

  isChosenByLogged(day: number): boolean {
    const collab = this.getLoggedCollab();
    if (!collab || !collab.folgaRequests) return false;
    const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
    return collab.folgaRequests.some(r => r.date === dateStr);
  }

  isPreSelectedByLogged(day: number): boolean {
    const collab = this.getLoggedCollab();
    if (!collab || !collab.folgaRequests) return false;
    const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
    return collab.folgaRequests.some(r => r.date === dateStr && r.isPreSelected);
  }

  getCalendarDayClass(isChosenByMe: boolean, count: number): string {
    const base = 'p-2 border rounded-lg flex flex-col justify-between gap-1 transition-all cursor-pointer h-16 min-w-0 outline-none text-left';
    if (isChosenByMe) {
      return `${base} bg-emerald-950/40 border-emerald-500`;
    } else if (count >= 2) {
      return `${base} bg-red-950/20 border-red-950`;
    } else {
      return `${base} bg-[#071426] border-[#10213b] hover:border-slate-400`;
    }
  }

  requestPortalFolgaDay(day: number) {
    const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
    this.requestPortalFolga(dateStr);
  }

  removePortalFolgaDay(day: number) {
    const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
    this.removePortalFolga(dateStr);
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
        `[OCR RAW LOGS]:\nESCALA DIÁRIA DE TRABALHO - ESCALA EASY VIBRA\nData Extraída: Junho 2026\nHugo Mascarenhas - LT - MANHÃ - OPERACIONAL\nGabriel Alencar - OP - TARDE - VIP\nIgor Silveira - OP - MADRUGADA - OPERACIONAL`
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

  startEditingCollab(collab: Collaborator) {
    this.editingCollab.set(collab);
    this.newCollabPhotoData.set(collab.photo || null);
    this.showToast(`Modo Edição: Editando ${collab.name}`);
  }

  cancelEditingCollab() {
    this.editingCollab.set(null);
    this.newCollabPhotoData.set(null);
  }

  saveEditedCollaborator(
    id: string,
    name: string,
    role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR',
    group: string,
    shift: string,
    sector: 'AERÓDROMO' | 'VIP' | 'TREINAMENTO',
    bh: number,
    score: number,
    photo?: string | null,
    birthday?: string,
    sd1Desc?: string, sd1Date?: string,
    sd2Desc?: string, sd2Date?: string,
    sd3Desc?: string, sd3Date?: string,
    sd4Desc?: string, sd4Date?: string,
    sd5Desc?: string, sd5Date?: string
  ) {
    if (!name.trim()) {
      this.showToast('O nome completo do colaborador é obrigatório.');
      return;
    }

    const specialDates: SpecialDate[] = [];
    if (sd1Desc && sd1Date) specialDates.push({ description: sd1Desc, date: sd1Date, priority: 1 });
    if (sd2Desc && sd2Date) specialDates.push({ description: sd2Desc, date: sd2Date, priority: 2 });
    if (sd3Desc && sd3Date) specialDates.push({ description: sd3Desc, date: sd3Date, priority: 3 });
    if (sd4Desc && sd4Date) specialDates.push({ description: sd4Desc, date: sd4Date, priority: 4 });
    if (sd5Desc && sd5Date) specialDates.push({ description: sd5Desc, date: sd5Date, priority: 5 });

    const target = this.scaleService.collaborators().find(c => c.id === id);
    if (!target) {
      this.showToast('Erro: Colaborador não encontrado.');
      return;
    }

    const updatedCollab: Collaborator = {
      ...target,
      name,
      role,
      group,
      shift,
      sector,
      bhBalance: bh,
      score,
      photo: photo || target.photo,
      birthday: birthday || '',
      specialDates
    };

    this.scaleService.updateCollaborator(updatedCollab);
    this.cancelEditingCollab();
    this.showToast('Colaborador atualizado com sucesso!');
  }

  onCollabPhotoSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          this.newCollabPhotoData.set(dataUrl);
        } else {
          this.newCollabPhotoData.set(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}
