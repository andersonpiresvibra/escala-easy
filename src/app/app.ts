import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScaleService } from './scale.service';
import { SupabaseService } from './supabase.service';
import { checkContingentViolation, isWeekday, isHoliday, getHolidayName, Collaborator, SHIFT_COLORS } from './data';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class App implements OnInit {
  // Service Injection
  public scaleService = inject(ScaleService);
  public supabaseService = inject(SupabaseService);

  public dbStatus = signal<'checking' | 'connected' | 'error'>('checking');

  // Auth State
  showAuthModal = signal(false);
  authMode = signal<'LOGIN' | 'REGISTER'>('LOGIN');
  authEmail = signal('');
  authPassword = signal('');
  authCollabId = signal('');
  authError = signal('');
  authSuccess = signal('');
  isAuthLoading = signal(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingUsers = signal<any[]>([]);
  showApprovalModal = signal(false);

  // Import Image State
  showImportModal = signal(false);
  importFile = signal<File | null>(null);
  importStatus = signal<'processing' | 'success' | 'error' | ''>('');
  importMessage = signal('');

  eligibleAuthCollaborators = computed(() => {
    return this.scaleService.collaborators().filter(c => c.role === 'LIDER' || c.role === 'SUPERVISOR');
  });

  async ngOnInit() {
    const isConnected = await this.supabaseService.testConnection();
    this.dbStatus.set(isConnected ? 'connected' : 'error');
  }

  // Import Escala Logics
  openImportModal() {
    if (this.scaleService.currentRole() !== 'SUPERVISOR' && this.scaleService.currentRole() !== 'LIDER') {
      this.showToast('Apenas LTs e o Administrador podem importar dados de escala.');
      return;
    }
    this.importFile.set(null);
    this.importStatus.set('');
    this.importMessage.set('');
    this.showImportModal.set(true);
  }

  onImportFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target && target.files && target.files.length > 0) {
      const file = target.files[0];
      this.importFile.set(file);
      this.importStatus.set('');
      this.importMessage.set('');
    }
  }

  async processImport() {
    const file = this.importFile();
    if (!file) return;

    this.importStatus.set('processing');
    this.importMessage.set('Enviando imagem e analisando escala com IA...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const response = await fetch('/api/parse-scale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type
          })
        });

        if (!response.ok) {
          let errorMsg = 'Falha na resposta da API de visão computacional.';
          try {
            const errBody = await response.json();
            if (errBody && errBody.error) errorMsg += ' Detalhes: ' + errBody.error;
          } catch {
            console.warn('Falha ao decodificar erro de resposta da API de visão.');
          }
          throw new Error(errorMsg);
        }

        const data: {name: string, days: number[]}[] = await response.json();
        
        // Atualiza a grid com os dados processados (só "X" por enquanto, como o usuário pediu)
        let updatedCells = 0;
        const currentMonth = this.scaleService.currentMonth();
        const currentYear = this.scaleService.currentYear();

        this.scaleService.grid.update(currentGrid => {
          let newGrid = [...currentGrid];
          
          data.forEach(item => {
            // Acha o colaborador pelo nome (pode ser parcial, ou case insensitive)
            const collab = this.scaleService.collaborators().find(c => 
              c.name.toUpperCase().includes(item.name.toUpperCase()) || 
              item.name.toUpperCase().includes(c.name.toUpperCase())
            );
            
            if (collab) {
              item.days.forEach(day => {
                let exists = false;
                newGrid = newGrid.map(cell => {
                  if (cell.collaboratorId === collab.id && cell.day === day && cell.month === currentMonth && cell.year === currentYear) {
                    exists = true;
                    return { ...cell, value: 'X' };
                  }
                  return cell;
                });
                if (!exists) {
                  newGrid.push({ collaboratorId: collab.id, day, month: currentMonth, year: currentYear, value: 'X' });
                }
                updatedCells++;
              });
            }
          });
          return newGrid;
        });

        this.scaleService.saveState();
        this.scaleService.saveGridToSupabase();

        this.importStatus.set('success');
        this.importMessage.set(`Sucesso! ${updatedCells} folgas (X) processadas e sincronizadas.`);
        this.showToast(`${updatedCells} folgas importadas com sucesso.`);
      };
      
      reader.readAsDataURL(file);

    } catch (e: unknown) {
      this.importStatus.set('error');
      if (e instanceof Error) {
        this.importMessage.set(e.message || 'Erro ao processar imagem.');
      } else {
        this.importMessage.set('Erro ao processar imagem.');
      }
    }
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.isDropdownOpen()) return;
    const target = event.target as HTMLElement;
    if (!target) return;
    const container = document.getElementById('options_dropdown_container');
    if (container && !container.contains(target)) {
      this.isDropdownOpen.set(false);
    }
  }

  // Track active sub-tab for granular workspace
  public activeSubTab = signal<'matrix' | 'backups' | 'shifts'>('matrix');

  // Track if option/tools dropdown menu is open
  public isDropdownOpen = signal<boolean>(false);

  // Track state of grid cell editor modal/popover
  activeEditor = signal<{ collaboratorId: string; day: number } | null>(null);

  // Shift filter for Parent Grid spreadsheet view
  selectedShiftFilter = signal<'MADRUGADA' | 'MANHÃ' | 'TARDE' | 'ADMINISTRATIVO' | 'TODOS'>('MADRUGADA');

  // New Backup Slot form signals
  newProfileName = signal<string>('');
  newProfileDescription = signal<string>('');

  // Custom Shift / Turn (SIGLAS) CRUD form signals
  newShiftCode = signal<string>('');
  newShiftLabel = signal<string>('');
  newShiftColor = signal<string>('bg-green-600 text-white border-green-700 font-bold hover:bg-green-700');
  newShiftColorName = signal<string>('verde');
  newShiftDiscounts = signal<boolean>(true);
  newShiftCategory = signal<'FOLGAS' | 'FERIAS' | 'CURSOS_TREINAMENTO' | 'REUNIOES' | 'AFASTAMENTO_SAUDE' | 'AUSENCIA_INJUSTIFICADA' | 'TURNO'>('FOLGAS');
  editingShiftCode = signal<string | null>(null);

  getAvailableColors() {
    return Object.entries(SHIFT_COLORS).map(([key, value]) => ({
      key,
      label: value.label,
      classes: value.classes
    }));
  }

  changeShiftColorName(colorName: string) {
    this.newShiftColorName.set(colorName);
    const found = SHIFT_COLORS[colorName];
    if (found) {
      this.newShiftColor.set(found.classes);
    }
  }

  changeShiftCategory(cat: 'FOLGAS' | 'FERIAS' | 'CURSOS_TREINAMENTO' | 'REUNIOES' | 'AFASTAMENTO_SAUDE' | 'AUSENCIA_INJUSTIFICADA' | 'TURNO') {
    this.newShiftCategory.set(cat);
    this.newShiftDiscounts.set(cat === 'FOLGAS' || cat === 'FERIAS' || cat === 'AFASTAMENTO_SAUDE' || cat === 'AUSENCIA_INJUSTIFICADA');
    
    let defaultColorName = 'branco';
    if (cat === 'FOLGAS') {
      defaultColorName = 'verde';
    } else if (cat === 'AFASTAMENTO_SAUDE') {
      defaultColorName = 'cinza-escuro';
    } else if (cat === 'CURSOS_TREINAMENTO') {
      defaultColorName = 'azul';
    } else if (cat === 'REUNIOES') {
      defaultColorName = 'amarelo';
    } else if (cat === 'AUSENCIA_INJUSTIFICADA') {
      defaultColorName = 'vermelho';
    } else if (cat === 'TURNO') {
      defaultColorName = 'branco';
    }

    this.changeShiftColorName(defaultColorName);
  }

  // New trade form signals
  tradeSourceDay = signal<number>(5);
  tradeTargetCollabId = signal<string>('op4');
  tradeTargetDay = signal<number>(6);

  // New Magna Date form signals
  magnaLabel = signal<string>('');
  magnaDate = signal<string>('2026-03-24');
  magnaPriority = signal<number>(1);

  // New Training form signals
  trainingTitle = signal<string>('');
  trainingCompletionDate = signal<string>('2026-06-24');
  trainingExpirationDate = signal<string>('');
  trainingStatus = signal<'CONCLUÍDO' | 'EXPIRADO' | 'EM_CURSO'>('CONCLUÍDO');

  // New Course/Cert form signals
  courseName = signal<string>('');
  courseInstitution = signal<string>('');
  courseIssueDate = signal<string>('2026-06-24');
  courseCertificateCode = signal<string>('');

  // Scale homologation status
  scaleHomologated = signal<boolean>(false);
  supervisorSignature = signal<string>('');

  // Active Toast notifications
  toastMessage = signal<string | null>(null);

  constructor() {
    this.showToast('Escala Easy VIBRA - Protótipo MVP Carregado');
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 7000);
  }

  // Filtered list of collaborators for the grid spreadsheet
  filteredCollaborators = computed(() => {
    const list = this.scaleService.collaborators();
    const filter = this.selectedShiftFilter();
    
    let filteredList = list;
    if (filter !== 'TODOS') {
      filteredList = list.filter(c => c.shift === filter);
    }
    
    // Sort: LIDER first, then by Sector (AERÓDROMO first, then VIP, then TREINAMENTO), then by Name
    return [...filteredList].sort((a, b) => {
      if (a.role === 'LIDER' && b.role !== 'LIDER') return -1;
      if (a.role !== 'LIDER' && b.role === 'LIDER') return 1;
      
      const sectorWeight = { 'AERÓDROMO': 1, 'VIP': 2, 'TREINAMENTO': 3 };
      if (sectorWeight[a.sector] < sectorWeight[b.sector]) return -1;
      if (sectorWeight[a.sector] > sectorWeight[b.sector]) return 1;
      
      return a.name.localeCompare(b.name);
    });
  });

  // Fetch the active operator info Reactively
  loggedOperator = computed(() => {
    return this.scaleService.collaborators().find(c => c.id === this.scaleService.selectedOperatorId());
  });

  // Dynamically find which shift types are actually used in the current grid cells for the staff
  activeShiftTypesUsed = computed(() => {
    const grid = this.scaleService.grid();
    const allShifts = this.scaleService.shiftTypes();
    
    // Find all unique codes present in the grid values (filtering out empty cells or space-separated logs)
    const usedCodes = new Set<string>();
    grid.forEach(cell => {
      if (cell.value) {
        if (cell.value.includes(' ')) {
          cell.value.split(/\s+/).forEach(part => {
            if (part.trim()) {
              usedCodes.add(part.trim());
            }
          });
        } else {
          usedCodes.add(cell.value.trim());
        }
      }
    });

    return allShifts.filter(s => usedCodes.has(s.code));
  });

  // Check if any regular work days (represented as empty value '') are in the active scale
  hasRegularWorkAssigned = computed(() => {
    return this.scaleService.grid().some(cell => !cell.value || !cell.value.trim());
  });

  availableMonths = [
    { value: 1, label: 'JANEIRO' },
    { value: 2, label: 'FEVEREIRO' },
    { value: 3, label: 'MARÇO' },
    { value: 4, label: 'ABRIL' },
    { value: 5, label: 'MAIO' },
    { value: 6, label: 'JUNHO' },
    { value: 7, label: 'JULHO' },
    { value: 8, label: 'AGOSTO' },
    { value: 9, label: 'SETEMBRO' },
    { value: 10, label: 'OUTUBRO' },
    { value: 11, label: 'NOVEMBRO' },
    { value: 12, label: 'DEZEMBRO' }
  ];

  availableYears = [2026, 2027, 2028, 2029, 2030];

  showMonthSelector = signal<boolean>(false);

  getMonthLabel(month: number): string {
    const m = this.availableMonths.find(x => x.value === month);
    return m ? m.label : '';
  }

  toggleMonthSelector() {
    this.showMonthSelector.update(v => !v);
  }

  selectMonth(month: number) {
    this.scaleService.currentMonth.set(month);
    this.showMonthSelector.set(false);
    this.showToast('Mês alterado com sucesso.');
  }

  getMonthSelectorClass(month: number): string {
    const currentActualMonth = new Date().getMonth() + 1;
    const isSelected = this.scaleService.currentMonth() === month;
    const isPast = month < currentActualMonth;
    
    if (isSelected) {
      return 'bg-blue-600 text-white shadow-sm hover:brightness-110';
    }
    
    if (isPast) {
      return 'text-slate-400 hover:bg-slate-50 opacity-60';
    }
    
    return 'text-slate-700 hover:bg-slate-100 hover:text-blue-600';
  }

  changeYear(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.scaleService.currentYear.set(parseInt(select.value, 10));
    this.showToast('Ano alterado com sucesso.');
  }

  previousMonth() {
    let m = this.scaleService.currentMonth();
    let y = this.scaleService.currentYear();
    if (m === 1) {
      m = 12;
      y--;
    } else {
      m--;
    }
    if (this.availableYears.includes(y)) {
      this.scaleService.currentMonth.set(m);
      this.scaleService.currentYear.set(y);
    }
  }

  nextMonth() {
    let m = this.scaleService.currentMonth();
    let y = this.scaleService.currentYear();
    if (m === 12) {
      m = 1;
      y++;
    } else {
      m++;
    }
    if (this.availableYears.includes(y)) {
      this.scaleService.currentMonth.set(m);
      this.scaleService.currentYear.set(y);
    }
  }

  // Days list: computed based on selected month/year
  daysList = computed(() => {
    const month = this.scaleService.currentMonth();
    const year = this.scaleService.currentYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  });

  // Convert day number to Portuguese abbreviation
  getDayOfWeekLabel(day: number): string {
    const month = this.scaleService.currentMonth();
    const year = this.scaleService.currentYear();
    const date = new Date(year, month - 1, day);
    const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    return days[date.getDay()];
  }

  getCollaboratorName(id: string): string {
    const collab = this.scaleService.collaborators().find(c => c.id === id);
    return collab ? collab.name : id;
  }

  isWeekendDay(day: number): boolean {
    return !isWeekday(day, this.scaleService.currentMonth(), this.scaleService.currentYear());
  }

  isHoliday(day: number): boolean {
    return isHoliday(day, this.scaleService.currentMonth(), this.scaleService.currentYear());
  }

  getHolidayName(day: number): string | null {
    return getHolidayName(day, this.scaleService.currentMonth(), this.scaleService.currentYear());
  }

  getDayTooltip(day: number): string {
    const month = this.scaleService.currentMonth();
    const year = this.scaleService.currentYear();
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const weekMap = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    let label = `${dayStr}/${monthStr}/${year} (${weekMap[dayOfWeek]})`;
    if (this.isHoliday(day)) {
      const hName = this.getHolidayName(day);
      if (hName) {
        label += ` — ${hName}`;
      }
    }
    return label;
  }

  isColumnHighlighted(day: number): boolean {
    return this.isWeekendDay(day) || this.isHoliday(day);
  }

  // Helper to get color of a day cell in the footer contingent
  getContingentFooterCellClass(day: number): string {
    const check = checkContingentViolation(day, this.scaleService.currentMonth(), this.scaleService.currentYear(), this.scaleService.grid(), this.scaleService.collaborators(), this.selectedShiftFilter());
    if (check.isViolated) {
      return 'bg-rose-100 text-rose-805 border-rose-300 font-bold';
    }
    return this.isColumnHighlighted(day)
      ? 'bg-amber-100/60 text-emerald-800 border-amber-300 font-bold'
      : 'bg-slate-50 text-emerald-700 border-slate-200 font-bold';
  }

  // Count active staff count for the specific pilot turn
  getActiveCount(day: number) {
    const check = checkContingentViolation(day, this.scaleService.currentMonth(), this.scaleService.currentYear(), this.scaleService.grid(), this.scaleService.collaborators(), this.selectedShiftFilter());
    return check.activeCount;
  }

  // Required count for day
  getRequiredCount(day: number) {
    const check = checkContingentViolation(day, this.scaleService.currentMonth(), this.scaleService.currentYear(), this.scaleService.grid(), this.scaleService.collaborators(), this.selectedShiftFilter());
    return check.required;
  }

  // Dynamic status check of contingent violation
  hasContingentViolation(day: number): boolean {
    const check = checkContingentViolation(day, this.scaleService.currentMonth(), this.scaleService.currentYear(), this.scaleService.grid(), this.scaleService.collaborators(), this.selectedShiftFilter());
    return check.isViolated;
  }

  // Helper to fetch cell value from state grid
  getCellValue(collabId: string, day: number): string {
    const month = this.scaleService.currentMonth();
    const year = this.scaleService.currentYear();
    const cell = this.scaleService.grid().find(c => c.collaboratorId === collabId && c.day === day && c.month === month && c.year === year);
    return cell ? cell.value : '';
  }

  getFolgasCount(collabId: string): number {
    const month = this.scaleService.currentMonth();
    const year = this.scaleService.currentYear();
    const folgaCodes = this.scaleService.shiftTypes().filter(s => s.category === 'FOLGAS').map(s => s.code);

    return this.scaleService.grid().filter(c => 
      c.collaboratorId === collabId && 
      c.month === month &&
      c.year === year &&
      folgaCodes.includes(c.value)
    ).length;
  }

  getDailyFolgasCount(day: number): number {
    const month = this.scaleService.currentMonth();
    const year = this.scaleService.currentYear();
    const filter = this.selectedShiftFilter();
    
    // Get visible/filtered collaborators for this shift
    const list = this.scaleService.collaborators();
    let targetCollabs = filter === 'TODOS'
      ? list
      : list.filter(c => c.shift === filter);
      
    // Exclude LTs and VIP collaborators from bottom calculations
    targetCollabs = targetCollabs.filter(c => c.role !== 'LIDER' && c.sector !== 'VIP');
      
    const targetCollabIds = new Set(targetCollabs.map(c => c.id));
    const folgaCodes = this.scaleService.shiftTypes().filter(s => s.category === 'FOLGAS').map(s => s.code);
    
    return this.scaleService.grid().filter(c => 
      c.day === day &&
      c.month === month &&
      c.year === year &&
      targetCollabIds.has(c.collaboratorId) &&
      folgaCodes.includes(c.value)
    ).length;
  }

  getMaxFolgas(): number {
    const daysCount = this.daysList().length;
    return daysCount <= 28 ? 7 : (daysCount <= 30 ? 8 : 9);
  }

  canAddFolga(collabId: string, day: number, code: string): boolean {
    const folgaCodes = this.scaleService.shiftTypes().filter(s => s.category === 'FOLGAS').map(s => s.code);
    if (!folgaCodes.includes(code)) return true;

    // Check LT (Lider de Turno) closing day rule
    const collab = this.scaleService.collaborators().find(c => c.id === collabId);
    if (collab?.role === 'LIDER') {
      const month = this.scaleService.currentMonth();
      const year = this.scaleService.currentYear();
      const lastDay = new Date(year, month, 0).getDate();
      if (day === lastDay) {
        this.showToast(`Trava de Segurança: LT (${collab.name}) não pode folgar no último dia do mês (Fechamento Mensal).`);
        return false;
      }
    }

    const currentVal = this.getCellValue(collabId, day);
    if (folgaCodes.includes(currentVal)) return true;

    // Apenas aplicamos o limite de folgas do mês para OPERADORES, já que LTs (Lideres) e Supervisores têm escalas especiais de gestão.
    if (collab?.role === 'OPERADOR') {
      const count = this.getFolgasCount(collabId);
      const max = this.getMaxFolgas();
      if (count >= max) {
        this.showToast(`Limite de folgas (${max}) já atingido para este mês.`);
        return false;
      }
    }
    return true;
  }

  getCellBgColor(collabId: string, day: number): string {
    const val = this.getCellValue(collabId, day);
    const isEmpty = !val;
    if (isEmpty) {
      return 'bg-white border-slate-200 text-transparent hover:bg-slate-50';
    }
    
    // Custom double markings
    if (val.includes(' ')) {
      return 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 border-blue-300 font-bold hover:brightness-95';
    }

    const found = this.scaleService.shiftTypes().find(s => s.code === val);
    if (found) {
      if (val === 'T' && this.isColumnHighlighted(day)) {
        return 'bg-yellow-100 text-amber-900 border-yellow-300 hover:bg-yellow-200/50 font-bold';
      }
      return found.color;
    }

    if (!isNaN(Number(val))) {
      return 'bg-violet-100 text-violet-800 border-violet-300 font-semibold hover:brightness-95';
    }

    return 'bg-slate-100 text-slate-700 border-slate-300 hover:brightness-95';
  }

  getToolTipLabel(collabId: string, day: number): string {
    const val = this.getCellValue(collabId, day);
    let suffix = '';
    if (this.isHoliday(day)) {
      const hName = this.getHolidayName(day);
      if (hName) {
        suffix = ` — ${hName}`;
      }
    }
    
    if (!val) return 'Turno' + suffix;
    if (val.includes(' ')) return `Histórico Duplo: ${val}` + suffix;
    
    const found = this.scaleService.shiftTypes().find(s => s.code === val);
    if (found) return found.label + suffix;

    if (!isNaN(Number(val))) return `Troca de horário: Turno ${val}h` + suffix;
    return val + suffix;
  }

  abbreviateLegend(label: string): string {
    if (!label) return '';
    const lower = label.toLowerCase();
    if (lower.includes('turno regular') || lower.includes('trabalho ativo') || lower.includes('turno')) return 'Turno';
    if (lower.includes('folga regular') || lower.includes('folga')) return 'Folga';
    if (lower.includes('férias')) return 'Férias';
    if (lower.includes('banco de horas')) return 'B. Horas';
    if (lower.includes('atestado médico') || lower.includes('atestado')) return 'Atestado';
    if (lower.includes('folga operacional')) return 'F. Oper.';
    if (lower.includes('cipa')) return 'CIPA';
    if (lower.includes('trabalho em altura')) return 'T. Altura';
    if (lower.includes('líquido inflamável')) return 'L. Inflam.';
    if (lower.includes('workshop') || lower.includes('wshop')) return 'WShop';
    if (lower.includes('circulação veículos') || lower.includes('circulação')) return 'C. Veíc.';
    if (lower.includes('exame periódico') || lower.includes('exame')) return 'Exame';
    if (lower.includes('regular (célula vazia)') || lower.includes('célula vazia')) return 'Trabalho';
    if (lower.includes('trabalho alternativo') || lower.includes('alternativo')) return 'Hr. Ent';
    
    if (label.length > 12) {
      return label.substring(0, 11) + '.';
    }
    return label;
  }

  editingCollaboratorRow = signal<Collaborator | null>(null);
  rowEditorSelectedSigla = signal<string>('');
  confirmingClearRow = signal<boolean>(false);

  openRowEditor(col: Collaborator) {
    if (this.scaleHomologated()) {
      this.showToast('Impossível editar. Escala homologada e assinada.');
      return;
    }
    if (this.scaleService.currentRole() === 'OPERADOR') {
      this.showToast('Operadores de pátio não possuem permissão para reescrever a escala.');
      return;
    }
    this.showPaintbrushPanel.set(false); // turn off mass edit to focus on single row
    this.selectedPaintbrush.set(null);
    this.editingCollaboratorRow.set(col);
    this.rowEditorSelectedSigla.set(''); // default to empty (Trabalho Regular)
    this.confirmingClearRow.set(false);
    this.showToast(`Modo Linha Ativo: ${col.name}. Selecione uma sigla no painel e clique nos dias da linha dele para pintar.`);
  }

  closeRowEditor() {
    this.editingCollaboratorRow.set(null);
    this.confirmingClearRow.set(false);
    this.showToast('Edição de linha concluída e salva com sucesso.');
  }

  clearSelectedRow() {
    const col = this.editingCollaboratorRow();
    if (!col) return;
    this.clearRowForCollaborator(col);
    this.confirmingClearRow.set(false);
  }

  clearRowForCollaborator(col: Collaborator) {
    if (this.scaleHomologated()) {
      this.showToast('Impossível editar. Escala homologada e assinada.');
      return;
    }
    if (this.scaleService.currentRole() === 'OPERADOR') {
      this.showToast('Operadores de pátio não possuem permissão para reescrever a escala.');
      return;
    }
    const daysCount = this.daysList().length;
    for (let day = 1; day <= daysCount; day++) {
      this.scaleService.updateCell(col.id, day, '');
    }
    this.showToast(`Toda a linha de escala de ${col.name} foi limpa com sucesso.`);
  }

  showPaintbrushPanel = signal<boolean>(false);

  togglePaintbrushPanel() {
    if (this.scaleHomologated()) {
      this.showToast('Impossível editar. Escala homologada e assinada.');
      return;
    }
    if (this.scaleService.currentRole() === 'OPERADOR') {
      this.showToast('Operadores de pátio não possuem permissão para reescrever a escala.');
      return;
    }
    this.editingCollaboratorRow.set(null); // turn off individual row edit

    const nextVal = !this.showPaintbrushPanel();
    this.showPaintbrushPanel.set(nextVal);
    if (!nextVal) {
      this.selectedPaintbrush.set(null);
      this.showToast('Edição em massa concluída.');
    } else {
      this.selectedPaintbrush.set('');
      this.showToast('Modo Edição em Massa ativo. Selecione uma sigla acima e clique na grade para pintar.');
    }
  }

  selectedPaintbrush = signal<string | null>(null);

  selectPaintbrush(code: string) {
    if (this.selectedPaintbrush() === code) {
      this.selectedPaintbrush.set(null); // second click deselects
      this.showToast('Pincel desativado.');
    } else {
      this.selectedPaintbrush.set(code);
      this.showToast(`Pincel ativo no modo "${code || 'Apagar / Trabalho Ativo'}". Dê clique simples na grade para aplicar.`);
    }
  }

  cancelPaintbrush() {
    this.selectedPaintbrush.set(null);
    this.showToast('Pincel desativado.');
  }

  // Open the Cell Quick Editor
  clickCell(collabId: string, day: number) {
    if (this.scaleHomologated()) {
      this.showToast('Escala homologada pelo Supervisor de Plantão. Edições bloqueadas no momento.');
      return;
    }
    if (this.scaleService.currentRole() === 'OPERADOR') {
      this.showToast('Acesso de Operador. Permuta via menu "Frente C" habilitada abaixo.');
      return;
    }
    
    // 1st Priority: Selected Collaborator Row direct paintbrush
    const editingCol = this.editingCollaboratorRow();
    if (editingCol !== null) {
      if (collabId !== editingCol.id) {
        this.showToast(`Modo Linha ativo para ${editingCol.name}. Para outros, conclua este ou clique em "Editar Escala" na linha desejada.`);
        return;
      }
      const code = this.rowEditorSelectedSigla();
      const currentVal = this.scaleService.grid().find((c) => c.collaboratorId === collabId && c.day === day)?.value || '';
      const finalCode = currentVal === code ? '' : code;
      
      if (finalCode !== '' && !this.canAddFolga(collabId, day, finalCode)) {
        return;
      }
      
      this.scaleService.updateCell(collabId, day, finalCode);
      return;
    }

    // 2nd Priority: Mass grid paintbrush panel
    if (this.showPaintbrushPanel()) {
      const code = this.rowEditorSelectedSigla();
      const currentVal = this.scaleService.grid().find((c) => c.collaboratorId === collabId && c.day === day)?.value || '';
      const finalCode = currentVal === code ? '' : code;

      if (finalCode !== '' && !this.canAddFolga(collabId, day, finalCode)) {
        return;
      }

      this.scaleService.updateCell(collabId, day, finalCode);
      return;
    }

    this.activeEditor.set({ collaboratorId: collabId, day });
  }

  // Apply acronym value to cell from editor
  applyEditorValue(code: string) {
    const editor = this.activeEditor();
    if (!editor) return;

    if (code !== '' && !this.canAddFolga(editor.collaboratorId, editor.day, code)) {
      this.activeEditor.set(null);
      return;
    }

    this.scaleService.updateCell(editor.collaboratorId, editor.day, code);
    this.activeEditor.set(null);
    this.showToast(`Planilha Mãe Atualizada para o dia ${editor.day}.`);
  }

  // Submit hand-edited custom cell value
  applyCustomValue(val: string) {
    const editor = this.activeEditor();
    if (!editor) return;

    const cleanVal = val.trim().toUpperCase();
    if (cleanVal !== '' && !this.canAddFolga(editor.collaboratorId, editor.day, cleanVal)) {
      this.activeEditor.set(null);
      return;
    }

    this.scaleService.updateCell(editor.collaboratorId, editor.day, cleanVal);
    this.activeEditor.set(null);
    this.showToast(`Fórmula manual aplicada na célula: "${cleanVal || 'Vazio/Trabalho'}"`);
  }

  // High level actions
  triggerAutoGenerator() {
    if (this.scaleHomologated()) {
      this.showToast('Impossível re-gerar. Escala homologada e assinada.');
      return;
    }
    this.scaleService.generateAutoScale();
    this.showToast('Sucesso: Motor de IA estocástica preencheu a grade respeitando as travas operacionais.');
  }

  triggerReset() {
    if (this.scaleHomologated()) {
      this.scaleHomologated.set(false);
      this.supervisorSignature.set('');
    }
    this.scaleService.resetToDefaults();
    this.showToast('Escala restabelecida aos valores oficiais de Março/2026.');
  }

  // Native CSV Document Downloader
  exportToCSV() {
    this.showToast('Iniciando compilação do arquivo CSV de escala...');
    try {
      const collabs = this.scaleService.collaborators();
      const headers = ['Colaborador', 'Horario', 'Grupo', 'Role', 'Saldo BH', 'Score'];
      const daysCount = this.daysList().length;
      for (let day = 1; day <= daysCount; day++) {
        headers.push(`Dia ${day}`);
      }

      const csvRows = [headers.join(',')];

      collabs.forEach(col => {
        const row = [
          `"${col.name}"`,
          `"${col.schedule}"`,
          `"${col.group}"`,
          `"${col.role}"`,
          col.bhBalance,
          col.score
        ];

        for (let day = 1; day <= daysCount; day++) {
          const val = this.getCellValue(col.id, day);
          row.push(`"${val || 'Trabalho'}"`);
        }
        csvRows.push(row.join(','));
      });

      const csvContent = '\ufeff' + csvRows.join('\n'); // Add UTF-8 BOM
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `escala_vibra_aerodromo_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast('Sucesso: Planilha oficial baixada em formato CSV!');
    } catch (e) {
      console.error('Erro na exportação para CSV', e);
      this.showToast('Erro ao compilar documento CSV.');
    }
  }

  // Native PDF triggering via printer prompt
  exportToPDF() {
    this.showToast('Gerando guia de impressão da escala. Selecione "Salvar como PDF"...');
    setTimeout(() => {
      window.print();
    }, 300);
  }

  // Backup file serialization
  exportBackupJSON() {
    try {
      const jsonStr = this.scaleService.exportToJSONString();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `escala_backup_completo_${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast('Backup digital compactado (.json) baixado com sucesso!');
    } catch (e) {
      console.error('Falha no download do backup', e);
      this.showToast('Não foi possível gerar o arquivo de backup.');
    }
  }

  onJsonUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target || !target.files || target.files.length === 0) return;

    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = this.scaleService.importFromJSONString(content);
        if (success) {
          this.showToast('Sucesso: Sistema restaurou a escala completa pelo backup JSON!');
        } else {
          this.showToast('Erro de Validação: Arquivo JSON corrompido ou incompatível.');
        }
      } catch {
        this.showToast('Erro ao decodificar arquivo JSON.');
      }
    };
    reader.readAsText(file);
    target.value = ''; // Reset input selection
  }

  // Slot Backup Actions
  saveActiveBackupSlot() {
    const name = this.newProfileName().trim();
    const desc = this.newProfileDescription().trim();
    this.scaleService.saveScaleBackupProfile(name, desc);
    this.newProfileName.set('');
    this.newProfileDescription.set('');
    this.showToast('Escala salva com sucesso em slot na memória do navegador!');
  }

  loadActiveBackupSlot(id: string) {
    if (this.scaleHomologated()) {
      this.showToast('Escala homologada ativa. Deshomologue para carregar outros backups.');
      return;
    }
    const succ = this.scaleService.loadScaleBackupProfile(id);
    if (succ) {
      this.showToast('Backup de escala carregado com sucesso para a grade!');
    } else {
      this.showToast('Erro ao carregar o backup selecionado.');
    }
  }

  deleteBackupSlot(id: string) {
    this.scaleService.deleteScaleBackupProfile(id);
    this.showToast('Slot de backup excluído permanentemente.');
  }

  // Turn Definition (Siglas) CRUD Logic
  addNewShiftType() {
    const code = this.newShiftCode().trim().toUpperCase();
    const label = this.newShiftLabel().trim();
    if (!code || !label) {
      this.showToast('Insira o código da sigla e a descrição do turno.');
      return;
    }

    const cat = this.newShiftCategory();
    this.scaleService.addShiftType(code, label, this.newShiftColor(), this.newShiftDiscounts(), cat);
    // update state with explicit colorName metadata
    this.scaleService.shiftTypes.update(current => {
      return current.map(s => s.code === code ? { ...s, colorName: this.newShiftColorName() } : s);
    });
    this.scaleService.saveState();

    this.newShiftCode.set('');
    this.newShiftLabel.set('');
    this.showToast(`Turno [${code}] cadastrado com sucesso.`);
  }

  editShiftType(code: string) {
    const found = this.scaleService.shiftTypes().find(s => s.code === code);
    if (!found) return;
    this.editingShiftCode.set(code);
    this.newShiftCode.set(found.code);
    this.newShiftLabel.set(found.label);
    this.newShiftColor.set(found.color);
    this.newShiftDiscounts.set(found.discounts);
    this.newShiftCategory.set(found.category || 'FOLGAS');

    let colorName = found.colorName;
    if (!colorName) {
      const entry = Object.entries(SHIFT_COLORS).find(([, v]) => v.classes === found.color);
      colorName = entry ? entry[0] : 'branco';
    }
    this.newShiftColorName.set(colorName);
  }

  saveShiftTypeEdit() {
    const code = this.newShiftCode().trim().toUpperCase();
    const label = this.newShiftLabel().trim();
    if (!code || !label) {
      this.showToast('Insira o código da sigla e a descrição.');
      return;
    }

    const editCode = this.editingShiftCode();
    if (!editCode) return;

    this.scaleService.shiftTypes.update(current => {
      return current.map(s => {
        if (s.code === editCode) {
          return {
            ...s,
            code,
            label,
            color: this.newShiftColor(),
            discounts: this.newShiftDiscounts(),
            category: this.newShiftCategory(),
            colorName: this.newShiftColorName()
          };
        }
        return s;
      });
    });

    this.scaleService.saveState();
    this.editingShiftCode.set(null);
    this.newShiftCode.set('');
    this.newShiftLabel.set('');
    this.showToast(`Sigla [${code}] atualizada com sucesso.`);
  }

  cancelShiftTypeEdit() {
    this.editingShiftCode.set(null);
    this.newShiftCode.set('');
    this.newShiftLabel.set('');
  }

  removeShiftType(code: string) {
    this.scaleService.removeShiftType(code);
    this.showToast(`Turno [${code}] removido com sucesso.`);
  }

  // Submits a swap trade proposal
  submitTradeRequest() {
    const loggedOpId = this.scaleService.selectedOperatorId();
    const sourceDay = this.tradeSourceDay();
    const targetId = this.tradeTargetCollabId();
    const targetDay = this.tradeTargetDay();

    if (loggedOpId === targetId) {
      this.showToast('Impossível realizar permuta consigo mesmo.');
      return;
    }

    this.scaleService.addTradeRequest(sourceDay, targetId, targetDay);
    this.showToast('Sua proposta de permuta foi enviada para validação e auditoria.');
  }

  // Register Magna Date
  submitMagnaDate() {
    const loggedOpId = this.scaleService.selectedOperatorId();
    const label = this.magnaLabel().trim();
    const date = this.magnaDate();
    const priority = this.magnaPriority();

    if (!label) {
      this.showToast('Descreva o motivo/nome da data festiva.');
      return;
    }

    this.scaleService.addMagnaDate(loggedOpId, label, date, priority);
    this.magnaLabel.set('');
    this.showToast('Reserva de Data Magna efetuada. Nova escala respeitará seu limite.');
  }

  // Submit Training to Supabase
  submitTraining() {
    const loggedOpId = this.scaleService.selectedOperatorId();
    const title = this.trainingTitle().trim();
    const completion = this.trainingCompletionDate();
    const expiration = this.trainingExpirationDate() || null;
    const status = this.trainingStatus();

    if (!title || !completion) {
      this.showToast('Preencha o título do treinamento e a data de conclusão.');
      return;
    }

    this.scaleService.addTrainingToSupabase(loggedOpId, title, completion, expiration, status);
    this.trainingTitle.set('');
    this.showToast('Histórico de Treinamento inserido e sincronizado com o Supabase!');
  }

  // Submit Course/Cert to Supabase
  submitCourse() {
    const loggedOpId = this.scaleService.selectedOperatorId();
    const name = this.courseName().trim();
    const institution = this.courseInstitution().trim() || 'GOL';
    const issueDate = this.courseIssueDate();
    const code = this.courseCertificateCode().trim() || null;

    if (!name || !issueDate) {
      this.showToast('Preencha o nome do curso/certificação e a data de emissão.');
      return;
    }

    this.scaleService.addCourseToSupabase(loggedOpId, name, institution, issueDate, code);
    this.courseName.set('');
    this.courseInstitution.set('');
    this.courseCertificateCode.set('');
    this.showToast('Certificação registrada e sincronizada com o Supabase!');
  }

  // Sign off scales officially
  homologateCurrentScale() {
    if (!this.supervisorSignature().trim()) {
      this.showToast('Assinatura eletrônica do supervisor é necessária para homologar.');
      return;
    }
    this.scaleHomologated.set(true);
    this.scaleService.addLog(
      'SUPERVISÃO',
      'HOMOLOGAÇÃO DEFINITIVA',
      `Escala homologada oficialmente para o RH com a assinatura digital: "${this.supervisorSignature()}"`
    );
    this.showToast('Escala homologada e enviada! Edições trancadas.');
  }

  // Check if operator selected is on duty today (just for operations feed visual)
  getOperatorDutyStatus(operatorName: string): string {
    const collab = this.scaleService.collaborators().find(c => c.name === operatorName);
    if (!collab) return 'ATIVO';

    const cellVal = this.getCellValue(collab.id, 21); // check day 21 (current simulation date)
    if (cellVal === 'X') return 'DE FOLGA';
    if (cellVal === 'F') return 'EM FÉRIAS';
    if (cellVal === 'AT') return 'LICENÇA MÉDICA';
    if (cellVal === 'BH') return 'F. COMPENSAÇÃO BH';
    return 'ATIVO';
  }

  getOnShiftOperators() {
    const logged = this.loggedOperator();
    if (!logged) return [];
    return this.scaleService.collaborators().filter(c => c.shift === logged.shift);
  }

  // Toggle user permissions quickly for demonstration
  changeRole(role: 'SUPERVISOR' | 'LIDER' | 'OPERADOR') {
    this.scaleService.currentRole.set(role);
    this.showToast(`Perfil alterado para: ${role === 'SUPERVISOR' ? 'SUPERVISOR (Frente A)' : role === 'LIDER' ? 'LÍDER DE TURNO (Frente B)' : 'COLABORADOR (Frente C)'}`);
  }

  // --- AUTHENTICATION & APPROVAL FLOW ---
  openAuthModal(mode: 'LOGIN' | 'REGISTER' = 'LOGIN') {
    this.authMode.set(mode);
    this.authCollabId.set('');
    this.authPassword.set('');
    this.authError.set('');
    this.authSuccess.set('');
    this.showAuthModal.set(true);
  }

  async submitAuth() {
    this.authError.set('');
    this.authSuccess.set('');
    this.isAuthLoading.set(true);
    try {
      const collabId = this.authCollabId();
      if (!collabId) throw new Error('Selecione seu nome na lista.');
      
      const pwd = this.authPassword();
      const client = this.supabaseService.client;
      if (!client) throw new Error('Supabase client não inicializado.');
      
      if (this.authMode() === 'LOGIN') {
        if (!pwd) throw new Error('Insira a senha fornecida pelo administrador.');
        
        const { data, error } = await client
          .from('usuarios_acesso')
          .select('*')
          .eq('collaborator_id', collabId)
          .eq('senha', pwd)
          .single();

        if (error || !data) {
          throw new Error('Nome ou senha inválidos, ou usuário não cadastrado.');
        }

        if (data.status === 'PENDENTE') {
          throw new Error('Seu cadastro ainda está PENDENTE de aprovação do Supervisor.');
        }

        // Success
        this.scaleService.currentRole.set(data.role as 'SUPERVISOR' | 'LIDER' | 'OPERADOR');
        this.scaleService.selectedOperatorId.set(data.collaborator_id);
        this.showToast(`Bem-vindo(a), ${data.nome} (${data.role})`);
        this.showAuthModal.set(false);
      } else {
        // Register (Request Access)
        const collab = this.scaleService.collaborators().find(c => c.id === collabId);
        if (!collab) throw new Error('Colaborador não encontrado.');
        
        // Verifica se já existe solicitação
        const { data: existing } = await client.from('usuarios_acesso').select('id, status').eq('collaborator_id', collab.id).maybeSingle();
        
        if (existing) {
           if (existing.status === 'PENDENTE') throw new Error('Você já possui uma solicitação pendente.');
           if (existing.status === 'APROVADO') throw new Error('Seu acesso já foi aprovado. Solicite a senha ao administrador.');
        }

        const { error } = await client.from('usuarios_acesso').insert({
          collaborator_id: collab.id,
          nome: collab.name,
          email: `${collab.id}@malha.local`, // Dummy email
          senha: 'PENDENTE_' + Math.random().toString(36).substring(7),
          role: collab.role,
          status: 'PENDENTE'
        });

        if (error) throw error;

        this.authSuccess.set('Solicitação enviada com sucesso! Aguarde o Supervisor enviar sua senha.');
        this.authPassword.set('');
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.authError.set(e.message || 'Erro ao processar autenticação.');
      } else {
        this.authError.set('Erro ao processar autenticação.');
      }
    } finally {
      this.isAuthLoading.set(false);
    }
  }

  async loadPendingUsers() {
    if (this.scaleService.currentRole() !== 'SUPERVISOR') return;
    this.showApprovalModal.set(true);
    const client = this.supabaseService.client;
    if (!client) return;
    const { data, error } = await client.from('usuarios_acesso').select('*').eq('status', 'PENDENTE');
    if (!error && data) {
      this.pendingUsers.set(data);
    }
  }

  generatedPasswords = signal<Record<string, string>>({});

  async approveUser(id: string) {
    const client = this.supabaseService.client;
    if (!client) return;
    const pwd = Math.random().toString(36).slice(-6).toUpperCase(); // Gera senha de 6 caracteres
    
    const { error } = await client.from('usuarios_acesso').update({ status: 'APROVADO', senha: pwd }).eq('id', id);
    if (!error) {
      this.showToast('Usuário aprovado. Senha gerada!');
      this.generatedPasswords.update(prev => ({ ...prev, [id]: pwd }));
      // Não damos reload automático para que o Admin possa copiar a senha gerada
      // Mas atualizamos o status local para mostrar que foi aprovado
      this.pendingUsers.update(users => users.map(u => u.id === id ? { ...u, status: 'APROVADO' } : u));
    } else {
      this.showToast('Erro ao aprovar usuário.');
    }
  }

  async rejectUser(id: string) {
    const client = this.supabaseService.client;
    if (!client) return;
    const { error } = await client.from('usuarios_acesso').delete().eq('id', id);
    if (!error) {
      this.showToast('Solicitação rejeitada e removida.');
      this.loadPendingUsers();
    } else {
      this.showToast('Erro ao rejeitar usuário.');
    }
  }
}
