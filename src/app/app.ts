import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScaleService } from './scale.service';
import { checkContingentViolation, isWeekday, isHoliday, getHolidayName, Collaborator, SHIFT_COLORS } from './data';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Service Injection
  public scaleService = inject(ScaleService);

  // Track active sub-tab for granular workspace
  public activeSubTab = signal<'matrix' | 'backups' | 'shifts'>('matrix');

  // Track if option/tools dropdown menu is open
  public isDropdownOpen = signal<boolean>(false);

  // Track state of grid cell editor modal/popover
  activeEditor = signal<{ collaboratorId: string; day: number } | null>(null);

  // Group filter for Parent Grid spreadsheet view
  selectedGroupFilter = signal<'Madrugada' | 'Manhã' | 'Tarde' | 'VIP' | 'Treinamento' | 'Todos'>('Madrugada');

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
    }, 5000);
  }

  // Filtered list of collaborators for the grid spreadsheet
  filteredCollaborators = computed(() => {
    const list = this.scaleService.collaborators();
    const filter = this.selectedGroupFilter();
    if (filter === 'Todos') return list;
    return list.filter(c => c.group === filter);
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

  getMonthLabel(month: number): string {
    const m = this.availableMonths.find(x => x.value === month);
    return m ? m.label : '';
  }

  changeMonth(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.scaleService.currentMonth.set(parseInt(select.value, 10));
    this.showToast('Mês alterado com sucesso.');
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
    const check = checkContingentViolation(day, this.scaleService.currentMonth(), this.scaleService.currentYear(), this.scaleService.grid(), this.scaleService.collaborators());
    if (check.isViolated) {
      return 'bg-rose-100 text-rose-805 border-rose-300 font-bold';
    }
    return this.isColumnHighlighted(day)
      ? 'bg-amber-100/60 text-emerald-800 border-amber-300 font-bold'
      : 'bg-slate-50 text-emerald-700 border-slate-200 font-bold';
  }

  // Count active staff count for the specific pilot turn
  getActiveCount(day: number) {
    const check = checkContingentViolation(day, this.scaleService.currentMonth(), this.scaleService.currentYear(), this.scaleService.grid(), this.scaleService.collaborators());
    return check.activeCount;
  }

  // Required count for day
  getRequiredCount(day: number) {
    const weekday = isWeekday(day, this.scaleService.currentMonth(), this.scaleService.currentYear()) && !this.isHoliday(day);
    return weekday ? 6 : 5;
  }

  // Dynamic status check of contingent violation
  hasContingentViolation(day: number): boolean {
    const check = checkContingentViolation(day, this.scaleService.currentMonth(), this.scaleService.currentYear(), this.scaleService.grid(), this.scaleService.collaborators());
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
    return this.scaleService.grid().filter(c => 
      c.collaboratorId === collabId && 
      c.month === month &&
      c.year === year &&
      ['X', 'FO', 'BH'].includes(c.value)
    ).length;
  }

  getMaxFolgas(): number {
    return this.daysList.length <= 30 ? 8 : 9;
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
    
    if (!val) return 'Trabalho Ativo Regular' + suffix;
    if (val.includes(' ')) return `Histórico Duplo: ${val}` + suffix;
    
    const found = this.scaleService.shiftTypes().find(s => s.code === val);
    if (found) return found.label + suffix;

    if (!isNaN(Number(val))) return `Troca de horário: Turno ${val}h` + suffix;
    return val + suffix;
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
    const daysCount = this.daysList().length;
    for (let day = 1; day <= daysCount; day++) {
      this.scaleService.updateCell(col.id, day, '');
    }
    this.confirmingClearRow.set(false);
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
      this.scaleService.updateCell(collabId, day, finalCode);
      if (finalCode === '') {
        this.showToast(`Linha de ${editingCol.name}: Dia ${day} limpo (Trabalho Regular)`);
      } else {
        this.showToast(`Linha de ${editingCol.name}: Dia ${day} definido como "${code}"`);
      }
      return;
    }

    // 2nd Priority: Mass grid paintbrush panel
    const brush = this.selectedPaintbrush();
    if (this.showPaintbrushPanel() && brush !== null) {
      const currentVal = this.scaleService.grid().find((c) => c.collaboratorId === collabId && c.day === day)?.value || '';
      const finalCode = currentVal === brush ? '' : brush;
      this.scaleService.updateCell(collabId, day, finalCode);
      if (finalCode === '') {
        this.showToast(`Pincel: Dia ${day} limpo (Trabalho Regular)`);
      } else {
        this.showToast(`Pincel: Dia ${day} atualizado com "${brush}"`);
      }
      return;
    }

    this.activeEditor.set({ collaboratorId: collabId, day });
  }

  // Apply acronym value to cell from editor
  applyEditorValue(code: string) {
    const editor = this.activeEditor();
    if (!editor) return;

    this.scaleService.updateCell(editor.collaboratorId, editor.day, code);
    this.activeEditor.set(null);
    this.showToast(`Planilha Mãe Atualizada para o dia ${editor.day}.`);
  }

  // Submit hand-edited custom cell value
  applyCustomValue(val: string) {
    const editor = this.activeEditor();
    if (!editor) return;

    this.scaleService.updateCell(editor.collaboratorId, editor.day, val);
    this.activeEditor.set(null);
    this.showToast(`Fórmula manual aplicada na célula: "${val || 'Vazio/Trabalho'}"`);
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
    return this.scaleService.collaborators().filter(c => c.group === 'Madrugada');
  }

  // Toggle user permissions quickly for demonstration
  changeRole(role: 'SUPERVISOR' | 'LIDER' | 'OPERADOR') {
    this.scaleService.currentRole.set(role);
    this.showToast(`Perfil alterado para: ${role === 'SUPERVISOR' ? 'SUPERVISOR (Frente A)' : role === 'LIDER' ? 'LÍDER DE TURNO (Frente B)' : 'COLABORADOR (Frente C)'}`);
  }
}
