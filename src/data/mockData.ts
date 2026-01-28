import { Employee, Supervisor } from '@/types/attendance';

export const supervisors: Supervisor[] = [
  { id: 'sup1', name: 'NAZARENO', store: 'LOJA 81 - LACTICINIO (CAPITAL)' },
  { id: 'sup2', name: 'CARLOS SILVA', store: 'LOJA 82 - FRIOS (NORTE)' },
  { id: 'sup3', name: 'MARIA SANTOS', store: 'LOJA 83 - PADARIA (SUL)' },
  { id: 'sup4', name: 'JOÃO OLIVEIRA', store: 'LOJA 84 - AÇOUGUE (LESTE)' },
];

export const employees: Employee[] = [
  // Supervisor 1 - NAZARENO
  { id: 'emp1', name: 'DALTON CRISTIANO BARROS MEDEIROS', role: 'VENDEDOR (A)', supervisorId: 'sup1' },
  { id: 'emp2', name: 'RICARDO DE SOUSA LIMA', role: 'VENDEDOR (A)', supervisorId: 'sup1' },
  { id: 'emp3', name: 'FABRICIO GALDENCIO BRAGA', role: 'VENDEDOR (A)', supervisorId: 'sup1' },
  { id: 'emp4', name: 'DENIS FERNANDES DA COSTA', role: 'VENDEDOR (A)', supervisorId: 'sup1' },
  { id: 'emp5', name: 'ROBSON DE AMORIM', role: 'VENDEDOR (A)', supervisorId: 'sup1' },
  { id: 'emp6', name: 'LUCAS RODRIGUES SATIRO DE OLIVEIRA', role: 'VENDEDOR (A)', supervisorId: 'sup1' },
  { id: 'emp7', name: 'CHANDLE VITAL DINIZ DA SILVA', role: 'PROMOTOR (A)', supervisorId: 'sup1' },
  { id: 'emp8', name: 'ANTONIO GEAM FERREIRA DO NASCIMENTO', role: 'PROMOTOR (A)', supervisorId: 'sup1' },
  { id: 'emp9', name: 'CAROLINE IRINEU BARBOSA', role: 'PROMOTOR (A)', supervisorId: 'sup1' },
  { id: 'emp10', name: 'LEILIANE TEIXEIRA DOS SANTOS', role: 'PROMOTOR (A)', supervisorId: 'sup1' },
  { id: 'emp11', name: 'RAFAEL GOMES FELIX', role: 'PROMOTOR (A)', supervisorId: 'sup1' },
  { id: 'emp12', name: 'SAMUEL FERREIRA', role: 'PROMOTOR (A)', supervisorId: 'sup1' },
  
  // Supervisor 2 - CARLOS SILVA
  { id: 'emp13', name: 'ANA PAULA FERREIRA', role: 'VENDEDOR (A)', supervisorId: 'sup2' },
  { id: 'emp14', name: 'BRUNO COSTA SANTOS', role: 'VENDEDOR (A)', supervisorId: 'sup2' },
  { id: 'emp15', name: 'CAMILA RODRIGUES', role: 'PROMOTOR (A)', supervisorId: 'sup2' },
  { id: 'emp16', name: 'DIEGO ALMEIDA LIMA', role: 'PROMOTOR (A)', supervisorId: 'sup2' },
  { id: 'emp17', name: 'EDUARDA SILVA SOUZA', role: 'VENDEDOR (A)', supervisorId: 'sup2' },
  { id: 'emp18', name: 'FERNANDO OLIVEIRA DIAS', role: 'PROMOTOR (A)', supervisorId: 'sup2' },
  
  // Supervisor 3 - MARIA SANTOS
  { id: 'emp19', name: 'GABRIELA MARTINS COSTA', role: 'VENDEDOR (A)', supervisorId: 'sup3' },
  { id: 'emp20', name: 'HENRIQUE BARBOSA LIMA', role: 'VENDEDOR (A)', supervisorId: 'sup3' },
  { id: 'emp21', name: 'ISABELA SOUZA SANTOS', role: 'PROMOTOR (A)', supervisorId: 'sup3' },
  { id: 'emp22', name: 'JULIANA FERREIRA DIAS', role: 'PROMOTOR (A)', supervisorId: 'sup3' },
  { id: 'emp23', name: 'KELVIN RODRIGUES ALVES', role: 'VENDEDOR (A)', supervisorId: 'sup3' },
  
  // Supervisor 4 - JOÃO OLIVEIRA
  { id: 'emp24', name: 'LARISSA COSTA PEREIRA', role: 'VENDEDOR (A)', supervisorId: 'sup4' },
  { id: 'emp25', name: 'MARCOS ANTONIO SILVA', role: 'VENDEDOR (A)', supervisorId: 'sup4' },
  { id: 'emp26', name: 'NATALIA SANTOS LIMA', role: 'PROMOTOR (A)', supervisorId: 'sup4' },
  { id: 'emp27', name: 'OTAVIO FERREIRA GOMES', role: 'PROMOTOR (A)', supervisorId: 'sup4' },
  { id: 'emp28', name: 'PATRICIA RODRIGUES DIAS', role: 'VENDEDOR (A)', supervisorId: 'sup4' },
  { id: 'emp29', name: 'RAFAEL ALMEIDA COSTA', role: 'PROMOTOR (A)', supervisorId: 'sup4' },
];

// Brazilian holidays for 2025/2026
export const holidays: Record<string, string> = {
  '2025-01-01': 'Ano Novo',
  '2025-04-21': 'Tiradentes',
  '2025-05-01': 'Dia do Trabalho',
  '2025-09-07': 'Independência',
  '2025-10-12': 'N.S. Aparecida',
  '2025-11-02': 'Finados',
  '2025-11-15': 'Proclamação da República',
  '2025-12-25': 'Natal',
  '2026-01-01': 'Ano Novo',
  '2026-04-21': 'Tiradentes',
  '2026-05-01': 'Dia do Trabalho',
  '2026-09-07': 'Independência',
  '2026-10-12': 'N.S. Aparecida',
  '2026-11-02': 'Finados',
  '2026-11-15': 'Proclamação da República',
  '2026-12-25': 'Natal',
};
