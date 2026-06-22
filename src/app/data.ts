export interface Collaborator {
  id: string;
  name: string;
  role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR';
  schedule: string; // e.g. '21:12 - 06:00'
  group: 'Madrugada' | 'Manhã' | 'Tarde' | 'Líderes' | 'VIP' | 'Treinamento';
  bhBalance: number; // in hours
  score: number; // 0-100 base gamification
  importantDates: { label: string; date: string; priority: number }[]; // 5 vital dates
}

export interface ShiftCell {
  collaboratorId: string;
  day: number;
  month: number;
  year: number;
  value: string; // '' for work, 'X', 'F', 'BH', 'AT', 'FO', 'CP', 'TA', 'LI', 'W', 'CV', 'EX', or numbers like '5', '7', '21'
}

export interface TradeRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requestedDay: number;
  targetId: string;
  targetName: string;
  targetDay: number;
  status: 'SOLICITADO' | 'COLEGA_ACEITOU' | 'LT_VALIDOU' | 'SUPERVISOR_HOMOLOGADO' | 'REJEITADO';
  timestamp: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface JetFuelOperation {
  flight: string;
  aircraftModel: 'Boeing 737-7' | 'Boeing 737-8';
  aircraftPrefix: string;
  stand: string;
  truckId: string;
  truckType: 'SERVIDORES' | 'CTAs';
  truckBrand: string;
  operatorName: string;
  status: 'ABASTECENDO' | 'CONCLUÍDO' | 'AGUARDANDO';
  progress: number; // percentage
  fuelVolume: number; // liters
}

export const GOL_AIRCRAFT_737_7 = [
  'PR-GEA', 'PR-GEC', 'PR-GED', 'PR-GEH', 'PR-GEI', 'PR-GEJ', 'PR-GEK', 'PR-GEQ', 'PR-GIH', 'PR-GOQ', 'PR-GOR', 'PR-VBQ'
];

export const GOL_AIRCRAFT_737_8 = [
  'PR-GGE', 'PR-GGF', 'PR-GGH', 'PR-GGL', 'PR-GGM', 'PR-GGP', 'PR-GGQ', 'PR-GGR', 'PR-GGX', 'PR-GKA',
  'PR-XMA', 'PR-XMB', 'PR-XMC', 'PR-XMD', 'PR-XME', 'PR-XMF', 'PR-XMG', 'PR-XMH', 'PS-GOL', 'PS-GPA',
  'PS-GPB', 'PS-GPC', 'PS-GPD', 'PS-GPE', 'PS-GPF', 'PS-GPG', 'PS-GPH', 'PS-GPI', 'PS-GPJ'
];

export const FLEET_SERVIDORES = [
  { id: '2104', brand: 'FORD' },
  { id: '2108', brand: 'FORD' },
  { id: '2111', brand: 'FORD' },
  { id: '2113', brand: 'FORD' },
  { id: '2122', brand: 'MERCEDES-BENZ' },
  { id: '2123', brand: 'MERCEDES-BENZ' },
  { id: '2124', brand: 'MERCEDES-BENZ' },
  { id: '2125', brand: 'MERCEDES-BENZ' },
  { id: '2126', brand: 'MERCEDES-BENZ' },
  { id: '2127', brand: 'MERCEDES-BENZ' },
  { id: '2128', brand: 'MERCEDES-BENZ' },
  { id: '2129', brand: 'MERCEDES-BENZ' },
  { id: '2130', brand: 'MERCEDES-BENZ' },
  { id: '2135', brand: 'MERCEDES-BENZ' },
  { id: '2140', brand: 'VOLKSWAGEN' },
  { id: '2145', brand: 'VOLKSWAGEN' },
  { id: '2160', brand: 'VOLKSWAGEN' },
  { id: '2165', brand: 'VOLKSWAGEN' }
];

export const FLEET_CTAS = [
  { id: '1405', capacity: '15.000L' },
  { id: '1425', capacity: '20.000L' },
  { id: '1426', capacity: '20.000L' },
  { id: '1428', capacity: '20.000L' },
  { id: '1435', capacity: '20.000L' },
  { id: '1437', capacity: '20.000L' },
  { id: '1439', capacity: '20.000L' },
  { id: '1499', capacity: '20.000L' },
  { id: '1517', capacity: '20.000L' }
];

// Seed initial collaborators
export const INITIAL_COLLABORATORS: Collaborator[] = [
  // Madrugada Pilot operators (9 operators)
  { id: 'op1', name: 'MILTON', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', bhBalance: 12, score: 98, importantDates: [{ label: 'Meu Aniversário', date: '2026-03-05', priority: 1 }, { label: 'Aniversário do Cônjuge', date: '2026-03-18', priority: 2 }] },
  { id: 'op2', name: 'NORMAN', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', bhBalance: -4, score: 92, importantDates: [{ label: 'Aniversário do Filho', date: '2026-03-12', priority: 1 }] },
  { id: 'op3', name: 'RAFAEL', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', bhBalance: 6, score: 95, importantDates: [] },
  { id: 'op4', name: 'DOURADO', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', bhBalance: 0, score: 89, importantDates: [] },
  { id: 'op5', name: 'VENANCIO', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', bhBalance: -8, score: 90, importantDates: [] },
  { id: 'op6', name: 'DIOGO', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', bhBalance: 16, score: 97, importantDates: [{ label: 'Casamento', date: '2026-03-24', priority: 1 }] },
  { id: 'op7', name: 'WILLIAN', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', bhBalance: 2, score: 91, importantDates: [] },
  { id: 'op8', name: 'SILVERIO', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', bhBalance: 4, score: 93, importantDates: [] },
  { id: 'op9', name: 'REGIS', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', bhBalance: -2, score: 87, importantDates: [] },

  // Leaders
  { id: 'lt1', name: 'PEREIRA', role: 'LIDER', schedule: '21:12 - 06:00', group: 'Líderes', bhBalance: 0, score: 99, importantDates: [] },
  { id: 'lt2', name: 'GUSTAVO', role: 'LIDER', schedule: '21:12 - 06:00', group: 'Líderes', bhBalance: 2, score: 96, importantDates: [] },
  { id: 'lt3', name: 'CESARIO', role: 'LIDER', schedule: '06:00 - 15:00', group: 'Líderes', bhBalance: 8, score: 94, importantDates: [] },
  { id: 'lt4', name: 'MARTINEZ', role: 'LIDER', schedule: '06:00 - 15:00', group: 'Líderes', bhBalance: 0, score: 95, importantDates: [] },

  // 05:00 - 14:00 (TOTAL 05)
  { id: 'g05_1', name: 'MICHEL', role: 'OPERADOR', schedule: '05:00 - 14:00', group: 'Manhã', bhBalance: 0, score: 90, importantDates: [] },
  { id: 'g05_2', name: 'JOAO', role: 'OPERADOR', schedule: '05:00 - 14:00', group: 'Manhã', bhBalance: 4, score: 88, importantDates: [] },
  { id: 'g05_3', name: 'ADAUTO', role: 'OPERADOR', schedule: '05:00 - 14:00', group: 'Manhã', bhBalance: -2, score: 92, importantDates: [] },
  { id: 'g05_4', name: 'EWERTON', role: 'OPERADOR', schedule: '05:00 - 14:00', group: 'Manhã', bhBalance: 0, score: 85, importantDates: [] },

  // Patio VIP
  { id: 'vip1', name: 'FERNANDO', role: 'OPERADOR', schedule: 'PATIO VIP', group: 'VIP', bhBalance: 0, score: 91, importantDates: [] },
  { id: 'vip2', name: 'VALDINA', role: 'OPERADOR', schedule: 'PATIO VIP', group: 'VIP', bhBalance: 2, score: 94, importantDates: [] },
  { id: 'vip3', name: 'RENATA', role: 'OPERADOR', schedule: 'PATIO VIP', group: 'VIP', bhBalance: -4, score: 93, importantDates: [] },

  // Treinamento
  { id: 'tre1', name: 'SALES', role: 'OPERADOR', schedule: '07:00 - 16:00', group: 'Treinamento', bhBalance: 0, score: 90, importantDates: [] },
  { id: 'tre2', name: 'BARBOSA', role: 'OPERADOR', schedule: '07:00 - 16:00', group: 'Treinamento', bhBalance: 0, score: 93, importantDates: [] }
];

export interface ShiftType {
  code: string;
  label: string;
  color: string;
  discounts: boolean;
  category?: 'FOLGAS' | 'FERIAS' | 'CURSOS_TREINAMENTO' | 'REUNIOES' | 'AFASTAMENTO_SAUDE' | 'AUSENCIA_INJUSTIFICADA' | 'TURNO';
  cannotDelete?: boolean;
  colorName?: string;
}

export const SHIFT_COLORS: Record<string, { label: string; classes: string }> = {
  'branco': { label: 'Branco', classes: 'bg-white text-slate-800 border-slate-300 font-bold hover:bg-slate-50' },
  'verde': { label: 'Verde', classes: 'bg-green-600 text-white border-green-700 font-bold hover:bg-green-700' },
  'cinza-escuro': { label: 'Cinza Escuro', classes: 'bg-slate-700 text-white border-slate-800 font-bold hover:bg-slate-800' },
  'azul': { label: 'Azul', classes: 'bg-blue-600 text-white border-blue-700 font-bold hover:bg-blue-700' },
  'amarelo': { label: 'Amarelo', classes: 'bg-yellow-500 text-slate-900 border-yellow-650 font-bold hover:bg-yellow-600' },
  'vermelho': { label: 'Vermelho', classes: 'bg-red-600 text-white border-red-700 font-bold hover:bg-red-700' },
  'lilaz': { label: 'Liláz', classes: 'bg-purple-600 text-white border-purple-700 font-bold hover:bg-purple-700' },
  'rosa': { label: 'Rosa', classes: 'bg-rose-500 text-white border-rose-600 font-bold hover:bg-rose-600' },
  'marrom': { label: 'Marrom', classes: 'bg-amber-800 text-white border-amber-900 font-bold hover:bg-amber-900' },
  'laranja': { label: 'Laranja', classes: 'bg-orange-500 text-white border-orange-600 font-bold hover:bg-orange-600' },
  'esmeralda': { label: 'Esmeralda', classes: 'bg-emerald-600 text-white border-emerald-700 font-bold hover:bg-emerald-700' }
};

export const SIGLAS: ShiftType[] = [
  { code: 'T', label: 'Turno Regular (Trabalho Ativo)', color: 'bg-white text-slate-800 border-slate-300 font-bold hover:bg-slate-50', discounts: false, category: 'TURNO', cannotDelete: true, colorName: 'branco' },
  { code: 'X', label: 'Folga Regular', color: 'bg-green-600 text-white border-green-700 font-bold hover:bg-green-700', discounts: true, category: 'FOLGAS', cannotDelete: true, colorName: 'verde' },
  { code: 'F', label: 'Férias', color: 'bg-white text-slate-400 border-slate-300 font-bold hover:bg-slate-50', discounts: true, category: 'FERIAS', cannotDelete: true, colorName: 'branco' },
  { code: 'BH', label: 'Banco de Horas', color: 'bg-green-600 text-white border-green-700 font-bold hover:bg-green-700', discounts: true, category: 'FOLGAS', cannotDelete: true, colorName: 'verde' },
  { code: 'AT', label: 'Atestado Médico', color: 'bg-slate-700 text-white border-slate-800 font-bold hover:bg-slate-800', discounts: true, category: 'AFASTAMENTO_SAUDE', cannotDelete: true, colorName: 'cinza-escuro' },
  { code: 'FO', label: 'Folga Operacional', color: 'bg-green-600 text-white border-green-700 font-bold hover:bg-green-700', discounts: true, category: 'FOLGAS', cannotDelete: true, colorName: 'verde' },
  { code: 'CP', label: 'CIPA (Obrigatório)', color: 'bg-yellow-500 text-slate-900 border-yellow-655 font-bold hover:bg-yellow-600', discounts: true, category: 'REUNIOES', cannotDelete: true, colorName: 'amarelo' },
  { code: 'TA', label: 'Trabalho em Altura', color: 'bg-blue-600 text-white border-blue-700 font-bold hover:bg-blue-700', discounts: true, category: 'CURSOS_TREINAMENTO', cannotDelete: true, colorName: 'azul' },
  { code: 'LI', label: 'Líquido Inflamável', color: 'bg-blue-600 text-white border-blue-700 font-bold hover:bg-blue-700', discounts: true, category: 'CURSOS_TREINAMENTO', cannotDelete: true, colorName: 'azul' },
  { code: 'W', label: 'Workshop', color: 'bg-blue-600 text-white border-blue-700 font-bold hover:bg-blue-700', discounts: true, category: 'CURSOS_TREINAMENTO', cannotDelete: true, colorName: 'azul' },
  { code: 'CV', label: 'Circulação Veículos', color: 'bg-blue-600 text-white border-blue-700 font-bold hover:bg-blue-700', discounts: true, category: 'CURSOS_TREINAMENTO', cannotDelete: true, colorName: 'azul' },
  {
    code: 'EX',
    label: 'Exame Periódico Obrigatório',
    color: 'bg-orange-500 text-white border-orange-600 font-bold hover:bg-orange-600',
    discounts: true,
    category: 'AFASTAMENTO_SAUDE',
    cannotDelete: true,
    colorName: 'laranja'
  }
];

export function getSiglaColor(code: string): string {
  // If it's empty, it means "Trabalho" (Active Duty / Turno-T)
  if (!code) return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/50';
  
  // Custom double markings (e.g. 'LI TA' or 'BH X')
  if (code.includes(' ')) {
    return 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 border-blue-300 font-bold';
  }

  const found = SIGLAS.find(s => s.code === code);
  if (found) return found.color;

  // If it's a number (temporary shift hours, e.g. 5, 7, 21)
  if (!isNaN(Number(code))) {
    return 'bg-violet-100 text-violet-800 border-violet-300 font-semibold';
  }

  return 'bg-slate-100 text-slate-700 border-slate-300';
}

export function getSiglaLabel(code: string): string {
  if (!code) return 'Trabalho Normal';
  if (code.includes(' ')) return `Histórico Duplo: ${code}`;
  const found = SIGLAS.find(s => s.code === code);
  if (found) return found.label;
  if (!isNaN(Number(code))) return `Troca de horário: Turno ${code}h`;
  return code;
}

// Generate complete empty shift table for a specific month/year
export function generateInitialGrid(collaborators: Collaborator[], year = 2026, month = 3): ShiftCell[] {
  const g: ShiftCell[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  collaborators.forEach(col => {
    for (let day = 1; day <= daysInMonth; day++) {
      g.push({
        collaboratorId: col.id,
        day,
        month,
        year,
        value: ''
      });
    }
  });

  return g;
}

export function isWeekday(day: number, month = 3, year = 2026): boolean {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // true if Monday to Friday
}

export function isHoliday(day: number, month = 3, year = 2026): boolean {
  if (month === 3 && year === 2026) {
    const holidays = [6, 25]; // March 6 (Data Magna PE) & March 25 (Data Magna CE)
    return holidays.includes(day);
  }
  // Simplified holidays for other months (just returning false or basic mapping could be added)
  return false;
}

export function getHolidayName(day: number, month = 3, year = 2026): string | null {
  if (month === 3 && year === 2026) {
    if (day === 6) return 'Feriado: Data Magna (PE)';
    if (day === 25) return 'Feriado: Data Magna (CE)';
  }
  return null;
}

export function normalizeCellValue(value: string | null | undefined): string {
  return (value || '').trim().toUpperCase();
}

export function isAlternativeWorkHour(value: string | null | undefined): boolean {
  const val = normalizeCellValue(value);
  return ['5', '7', '21'].includes(val);
}

export function isRegularWork(value: string | null | undefined): boolean {
  const val = normalizeCellValue(value);
  return val === '' || val === 'T';
}

export function isActiveCellValue(value: string | null | undefined): boolean {
  const val = normalizeCellValue(value);

  // Na planilha VIBRA, célula vazia significa TRABALHO REGULAR.
  if (val === '' || val === 'T') return true;

  // Códigos numéricos indicam entrada em horário alternativo.
  // O colaborador trabalha normalmente e conta como presente.
  if (['5', '7', '21'].includes(val)) return true;

  // Qualquer outra sigla significa ausência física do pátio
  // ou atividade fora da cobertura operacional direta.
  return false;
}

export function isFixedAbsenceValue(value: string | null | undefined): boolean {
  const val = normalizeCellValue(value);

  // Valores que o gerador automático não deve sobrescrever.
  // X é folga gerada/regular e pode ser recalculada pelo gerador.
  const fixed = ['F', 'AT', 'EX', 'FO', 'CP', 'TA', 'LI', 'W', 'CV'];

  if (fixed.includes(val)) return true;

  // Combinações como "BH X", "X BH", "CP EX", "LI TA"
  // devem ser preservadas se já existirem manualmente.
  if (val.includes(' ')) return true;

  // Códigos de horário alternativo também devem ser preservados.
  if (['5', '7', '21'].includes(val)) return true;

  return false;
}

export function isRestDayForTarget(value: string | null | undefined): boolean {
  const val = normalizeCellValue(value);
  // Conta como folga usufruída todas essas siglas:
  if (['X', 'F', 'AT', 'FO', 'BH', 'EX'].includes(val)) return true;
  // Combinações que indicam ausência no pátio como folga
  if (val.includes('X') || val.includes('FO') || val.includes('BH') || val.includes('AT') || val.includes('F')) return true;
  return false;
}

export function isWorkDayForFatigue(value: string | null | undefined): boolean {
  return isActiveCellValue(value);
}

export function checkContingentViolation(
  day: number,
  month: number,
  year: number,
  grid: ShiftCell[],
  collaborators: Collaborator[]
): { activeCount: number; required: number; isViolated: boolean } {

  const pilotOps = collaborators.filter(c => c.group === 'Madrugada');
  const pilotOpsIds = new Set(pilotOps.map(c => c.id));

  let activeCount = 0;

  grid.forEach(cell => {
    if (cell.day === day && cell.month === month && cell.year === year && pilotOpsIds.has(cell.collaboratorId)) {
      if (isActiveCellValue(cell.value)) {
        activeCount++;
      }
    }
  });

  const weekday = isWeekday(day, month, year) && !isHoliday(day, month, year);
  const required = weekday ? 6 : 5;
  const isViolated = activeCount < required;

  return { activeCount, required, isViolated };
}
