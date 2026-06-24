export interface Training {
  id?: number;
  title: string;
  completion_date: string;
  expiration_date?: string | null;
  status: 'CONCLUÍDO' | 'EXPIRADO' | 'EM_CURSO';
}

export interface Course {
  id?: number;
  name: string;
  institution: string;
  issue_date: string;
  certificate_code?: string | null;
}

export interface Collaborator {
  id: string;
  name: string;
  role: 'OPERADOR' | 'LIDER' | 'SUPERVISOR';
  schedule: string; // e.g. '21:12 - 06:00'
  group: 'Manhã' | 'Tarde' | 'Madrugada' | 'Líderes' | 'Treinamento' | 'VIP'; // Keep for legacy compatibility during migration
  shift: 'MANHÃ' | 'TARDE' | 'MADRUGADA' | 'ADMINISTRATIVO' | 'NOITE' | 'TESTE'; // The primary shift block
  sector: 'AERÓDROMO' | 'VIP' | 'TREINAMENTO'; // The physical patio/sector
  bhBalance: number; // in hours
  score: number; // 0-100 base gamification
  importantDates: { label: string; date: string; priority: number }[]; // 5 vital dates
  trainings?: Training[];
  courses?: Course[];
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
  // 05:00 - 14:00 (Manhã / Aeródromo)
  { id: '001', name: 'MICHEL', role: 'OPERADOR', schedule: '05:00 - 14:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '002', name: 'JOAO', role: 'OPERADOR', schedule: '05:00 - 14:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '003', name: 'ADAUTO', role: 'OPERADOR', schedule: '05:00 - 14:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '004', name: 'PAULO', role: 'OPERADOR', schedule: '05:00 - 14:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '005', name: 'EWERTON', role: 'OPERADOR', schedule: '05:00 - 14:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },

  // 06:00 - 15:00 (Manhã / Aeródromo)
  { id: '006', name: 'ALEX BARBOSA', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '007', name: 'DOUGLAS', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '008', name: 'TAVARES', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '009', name: 'JULIO', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '010', name: 'SANDRO', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '011', name: 'CLEBER', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '012', name: 'JOSE', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '013', name: 'CALAZANS', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '014', name: 'SILVA', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '015', name: 'GUILHERME', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '016', name: 'ILDO', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '017', name: 'PETERSON', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '018', name: 'RENILSON', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '019', name: 'RAMOS', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '020', name: 'VAGNER', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '021', name: 'EVANDRO', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '022', name: 'BARBOSA', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '023', name: 'CESAR JC', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '024', name: 'FLAVIO', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '025', name: 'CARLOS', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '026', name: 'BELENTANI', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '027', name: 'EULES', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '028', name: 'SOUZA', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '029', name: 'LUNA', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '030', name: 'HUAN', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'Manhã', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },

  // 06:00 - 16:00 (Teste)
  { id: '031', name: 'LUIS', role: 'OPERADOR', schedule: '06:00 - 16:00', group: 'Manhã', shift: 'TESTE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '032', name: 'CAIO', role: 'OPERADOR', schedule: '06:00 - 16:00', group: 'Manhã', shift: 'TESTE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '033', name: 'IDENILSON', role: 'OPERADOR', schedule: '06:00 - 16:00', group: 'Manhã', shift: 'TESTE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },

  // 14:42 - 23:30 (Tarde / Aeródromo)
  { id: '034', name: 'RODOLFO', role: 'OPERADOR', schedule: '14:42 - 23:30', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '035', name: 'LEONARDO', role: 'OPERADOR', schedule: '14:42 - 23:30', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '036', name: 'GILVAN', role: 'OPERADOR', schedule: '14:42 - 23:30', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '037', name: 'VIEIRA', role: 'OPERADOR', schedule: '14:42 - 23:30', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '038', name: 'LUCAS', role: 'OPERADOR', schedule: '14:42 - 23:30', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '039', name: 'WESLEY', role: 'OPERADOR', schedule: '14:42 - 23:30', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '040', name: 'PETTINELLI', role: 'OPERADOR', schedule: '14:42 - 23:30', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },

  // 15:15 - 00:00 (Tarde / Aeródromo)
  { id: '041', name: 'FREDISON', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '042', name: 'ALVES', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '043', name: 'LEANDRO EUFRA', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '044', name: 'JOSE EDSON', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '045', name: 'FEITOSA', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '046', name: 'LOPES', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '047', name: 'GIVANI', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '048', name: 'RENATO', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '049', name: 'COSTA', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '050', name: 'MANOEL', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '051', name: 'RONALD', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '052', name: 'KLEYSSON', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '053', name: 'BASTOS', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '054', name: 'JUNIOR', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '055', name: 'MILTON', role: 'OPERADOR', schedule: '15:15 - 00:00', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },

  // 16:00 - 00:37 (Tarde / Aeródromo)
  { id: '056', name: 'MARQUES', role: 'OPERADOR', schedule: '16:00 - 00:37', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },
  { id: '057', name: 'LAERCIO', role: 'OPERADOR', schedule: '16:00 - 00:37', group: 'Tarde', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 90, importantDates: [] },

  // 21:12 - 06:00 (Noite / Aeródromo)
  { id: '058', name: 'HORACIO', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: 12, score: 98, importantDates: [{ label: 'Meu Aniversário', date: '2026-03-05', priority: 1 }] },
  { id: '059', name: 'NORMAN', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: -4, score: 92, importantDates: [] },
  { id: '060', name: 'RAFAEL', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: 6, score: 95, importantDates: [] },
  { id: '061', name: 'DOURADO', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: 0, score: 89, importantDates: [] },
  { id: '062', name: 'VENANCIO', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: -8, score: 90, importantDates: [] },
  { id: '063', name: 'DIOGO', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: 16, score: 97, importantDates: [] },
  { id: '064', name: 'WILLIAN', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: 2, score: 91, importantDates: [] },
  { id: '065', name: 'SILVERIO', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: 4, score: 93, importantDates: [] },
  { id: '066', name: 'REGIS', role: 'OPERADOR', schedule: '21:12 - 06:00', group: 'Madrugada', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: -2, score: 87, importantDates: [] },

  // LIDER DE TURNO
  { id: '067', name: 'CESARIO', role: 'LIDER', schedule: '06:00 - 15:00', group: 'Líderes', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 8, score: 94, importantDates: [] },
  { id: '068', name: 'MARTINEZ', role: 'LIDER', schedule: '06:00 - 15:00', group: 'Líderes', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 95, importantDates: [] },
  { id: '069', name: 'PASCHOAL', role: 'LIDER', schedule: '06:00 - 15:00', group: 'Líderes', shift: 'MANHÃ', sector: 'AERÓDROMO', bhBalance: 0, score: 95, importantDates: [] },
  
  { id: '070', name: 'SPEDINI', role: 'LIDER', schedule: '14:30 - 23:30', group: 'Líderes', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 95, importantDates: [] },
  { id: '071', name: 'MARCIO', role: 'LIDER', schedule: '14:30 - 23:30', group: 'Líderes', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 95, importantDates: [] },
  { id: '072', name: 'JONATAN', role: 'LIDER', schedule: '14:30 - 23:30', group: 'Líderes', shift: 'TARDE', sector: 'AERÓDROMO', bhBalance: 0, score: 95, importantDates: [] },

  { id: '073', name: 'PEREIRA', role: 'LIDER', schedule: '21:12 - 06:00', group: 'Líderes', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: 0, score: 99, importantDates: [] },
  { id: '074', name: 'GUSTAVO', role: 'LIDER', schedule: '21:12 - 06:00', group: 'Líderes', shift: 'NOITE', sector: 'AERÓDROMO', bhBalance: 2, score: 96, importantDates: [] },

  // PATIO VIP
  { id: '075', name: 'FERNANDO', role: 'OPERADOR', schedule: '07:00 - 16:00', group: 'VIP', shift: 'MANHÃ', sector: 'VIP', bhBalance: 0, score: 91, importantDates: [] },
  { id: '076', name: 'RENATA', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'VIP', shift: 'MANHÃ', sector: 'VIP', bhBalance: 0, score: 93, importantDates: [] },
  { id: '077', name: 'ZAGO', role: 'OPERADOR', schedule: '06:00 - 15:00', group: 'VIP', shift: 'MANHÃ', sector: 'VIP', bhBalance: 0, score: 93, importantDates: [] },
  { id: '078', name: 'TORRES', role: 'OPERADOR', schedule: '14:30 - 23:30', group: 'VIP', shift: 'TARDE', sector: 'VIP', bhBalance: 0, score: 93, importantDates: [] },
  { id: '079', name: 'SOLANGE', role: 'OPERADOR', schedule: '14:30 - 23:30', group: 'VIP', shift: 'TARDE', sector: 'VIP', bhBalance: 0, score: 93, importantDates: [] },
  { id: '080', name: 'LOYOLA', role: 'OPERADOR', schedule: '14:30 - 23:30', group: 'VIP', shift: 'TARDE', sector: 'VIP', bhBalance: 0, score: 93, importantDates: [] },
  { id: '081', name: 'NORIVAL', role: 'OPERADOR', schedule: '21:00 - 06:00', group: 'VIP', shift: 'NOITE', sector: 'VIP', bhBalance: 2, score: 94, importantDates: [] },
  { id: '082', name: 'PIRES', role: 'OPERADOR', schedule: '22:00 - 06:00', group: 'VIP', shift: 'NOITE', sector: 'VIP', bhBalance: 2, score: 94, importantDates: [] },
  { id: '999', name: 'HORÁCIO', role: 'SUPERVISOR', schedule: '08:00 - 17:00', group: 'VIP', shift: 'ADMINISTRATIVO', sector: 'VIP', bhBalance: 0, score: 100, importantDates: [] }
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
  { code: 'T', label: 'Turno', color: 'bg-white text-slate-800 border-slate-300 font-bold hover:bg-slate-50', discounts: false, category: 'TURNO', cannotDelete: true, colorName: 'branco' },
  { code: 'X', label: 'Folga', color: 'bg-green-600 text-white border-green-700 font-bold hover:bg-green-700', discounts: true, category: 'FOLGAS', cannotDelete: true, colorName: 'verde' },
  { code: 'F', label: 'Férias', color: 'bg-white text-slate-400 border-slate-300 font-bold hover:bg-slate-50', discounts: true, category: 'FERIAS', cannotDelete: true, colorName: 'branco' },
  { code: 'BH', label: 'Banco de Horas', color: 'bg-green-600 text-white border-green-700 font-bold hover:bg-green-700', discounts: true, category: 'FOLGAS', cannotDelete: true, colorName: 'verde' },
  { code: 'AT', label: 'Atestado Médico', color: 'bg-slate-700 text-white border-slate-800 font-bold hover:bg-slate-800', discounts: true, category: 'AFASTAMENTO_SAUDE', cannotDelete: true, colorName: 'cinza-escuro' },
  { code: 'FO', label: 'Folga Operacional', color: 'bg-green-600 text-white border-green-700 font-bold hover:bg-green-700', discounts: true, category: 'FOLGAS', cannotDelete: true, colorName: 'verde' },
  { code: 'CP', label: 'CIPA (Obrigatório)', color: 'bg-yellow-500 text-slate-900 border-yellow-655 font-bold hover:bg-yellow-600', discounts: true, category: 'REUNIOES', cannotDelete: true, colorName: 'amarelo' },
  { code: 'TA', label: 'Trabalho em Altura', color: 'bg-blue-600 text-white border-blue-700 font-bold hover:bg-blue-700', discounts: true, category: 'CURSOS_TREINAMENTO', cannotDelete: true, colorName: 'azul' },
  { code: 'LI', label: 'Líquido Inflamável', color: 'bg-blue-600 text-white border-blue-700 font-bold hover:bg-blue-700', discounts: true, category: 'CURSOS_TREINAMENTO', cannotDelete: true, colorName: 'azul' },
  { code: 'W', label: 'WShop', color: 'bg-blue-600 text-white border-blue-700 font-bold hover:bg-blue-700', discounts: true, category: 'CURSOS_TREINAMENTO', cannotDelete: true, colorName: 'azul' },
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
export function generateInitialGrid(collaborators: Collaborator[], year = new Date().getFullYear(), month = new Date().getMonth() + 1): ShiftCell[] {
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

export function isWeekday(day: number, month = new Date().getMonth() + 1, year = new Date().getFullYear()): boolean {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // true if Monday to Friday
}

export function isHoliday(day: number, month = new Date().getMonth() + 1, year = new Date().getFullYear()): boolean {
  if (month === 3 && year === 2026) {
    const holidays = [6, 25]; // March 6 (Data Magna PE) & March 25 (Data Magna CE)
    return holidays.includes(day);
  }
  // Simplified holidays for other months (just returning false or basic mapping could be added)
  return false;
}

export function getHolidayName(day: number, month = new Date().getMonth() + 1, year = new Date().getFullYear()): string | null {
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
  collaborators: Collaborator[],
  shiftFilter = 'MANHÃ'
): { activeCount: number; required: number; isViolated: boolean } {

  let normalizedFilter = (shiftFilter || 'MANHÃ').toUpperCase();
  if (normalizedFilter === 'MADRUGADA') normalizedFilter = 'NOITE';
  if (normalizedFilter === 'ADMINISTRATIVO') normalizedFilter = 'TESTE';
  
  // Filter collaborators based on shift filter
  let targetCollabs = normalizedFilter === 'TODOS'
    ? collaborators
    : collaborators.filter(c => {
        const cShift = c.shift === 'MADRUGADA' ? 'NOITE' : (c.shift === 'ADMINISTRATIVO' ? 'TESTE' : c.shift);
        return cShift === normalizedFilter;
      });
    
  // Exclude Leaders (LTs) and VIP collaborators from bottom calculations
  targetCollabs = targetCollabs.filter(c => c.role !== 'LIDER' && c.sector !== 'VIP');
    
  const targetCollabIds = new Set(targetCollabs.map(c => c.id));

  let activeCount = 0;

  grid.forEach(cell => {
    if (cell.day === day && cell.month === month && cell.year === year && targetCollabIds.has(cell.collaboratorId)) {
      if (isActiveCellValue(cell.value)) {
        activeCount++;
      }
    }
  });

  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let required = 0;
  if (normalizedFilter === 'NOITE' || normalizedFilter === 'MADRUGADA') {
    required = (dayOfWeek === 6) ? 5 : 6;
  } else if (normalizedFilter === 'MANHÃ') {
    required = isWeekend ? 18 : 22;
  } else if (normalizedFilter === 'TARDE') {
    required = isWeekend ? 12 : 15;
  } else if (normalizedFilter === 'TESTE' || normalizedFilter === 'ADMINISTRATIVO') {
    required = isWeekend ? 0 : 2;
  } else {
    // TODOS: sum of all requirements roughly
    required = isWeekend ? 35 : 43;
  }

  const isViolated = activeCount < required;

  return { activeCount, required, isViolated };
}
