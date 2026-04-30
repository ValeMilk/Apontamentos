import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Employee, DayInfo, AttendanceRecord, AttendanceCode } from '@/types/attendance';
import { AttendanceCell } from './AttendanceCell';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AttendanceTableProps {
  employees: Employee[];
  daysInMonth: DayInfo[];
  getRecord: (employeeId: string, day: string) => AttendanceRecord;
  updateRecord: (employeeId: string, day: string, field: 'apontador' | 'supervisor', value: AttendanceCode) => void;
  updateRecordsBatch?: (updates: Array<{ employeeId: string; day: string; field: 'apontador' | 'supervisor'; value: AttendanceCode }>) => void;
  addJustification?: (employeeId: string, day: string, text: string, applyToSupervisor?: boolean, supervisorCode?: AttendanceCode) => void;
  getTotals: (day: string) => number;
  currentUserRole: 'admin' | 'gerente' | 'supervisor' | 'expectador';
  supervisorName?: string;
  storeName?: string;
  periodLabel: string;
  onSave?: () => Promise<boolean>;
  isMonthLocked?: boolean;
  pendingAtKeys?: Set<string>;
}

interface JustificationModal {
  employeeId: string;
  day: string;
  code: AttendanceCode;
  employeeName: string;
}

interface AtestadoModal {
  employeeId: string;
  day: string;
  endDay: string;
  employeeName: string;
  /** Quando true, modal abre apenas para anexar arquivo (AT já existente). */
  attachOnly?: boolean;
}

function SaveButton({ onSave }: { onSave: () => Promise<boolean> }) {
  const [saving, setSaving] = useState(false);
  return (
    <button
      onClick={async () => {
        if (saving) return;
        setSaving(true);
        try {
          const ok = await onSave();
          if (ok) toast.success('Registros salvos com sucesso');
          else toast.error('Falha ao salvar registros');
        } catch (e) {
          console.error(e);
          toast.error('Erro ao salvar registros');
        } finally {
          setSaving(false);
        }
      }}
      disabled={saving}
      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {saving ? 'Salvando...' : 'Salvar'}
    </button>
  );
}

export function AttendanceTable({
  employees,
  daysInMonth,
  getRecord,
  updateRecord,
  updateRecordsBatch,
  addJustification,
  getTotals,
  currentUserRole,
  supervisorName,
  storeName,
  periodLabel,
  onSave,
  isMonthLocked = false,
  pendingAtKeys,
}: AttendanceTableProps) {
  const { accessToken } = useAuth();
  const [bulkCodeByDay, setBulkCodeByDay] = useState<Record<string, string>>({});
  const [justModal, setJustModal] = useState<JustificationModal | null>(null);
  const [justText, setJustText] = useState('');
  const justTextRef = useRef<HTMLTextAreaElement>(null);
  // Atestado (AT) modal state
  const [atModal, setAtModal] = useState<AtestadoModal | null>(null);
  const [atFile, setAtFile] = useState<File | null>(null);
  const [atText, setAtText] = useState('');
  const [atUploading, setAtUploading] = useState(false);
  const [atError, setAtError] = useState('');
  const atFileRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUserRole === 'admin';
  const isSupervisor = currentUserRole === 'supervisor' || currentUserRole === 'gerente';
  const isEditDisabled = isSupervisor && isMonthLocked;

  const ABONO_CODES: AttendanceCode[] = ['ABF', 'ABT'];

  function handleSupervisorChange(employeeId: string, day: string, value: AttendanceCode, employeeName: string) {
    if (value === 'AT') {
      // AT abre modal de atestado (arquivo opcional, período selecionável)
      setAtFile(null);
      setAtText('');
      setAtError('');
      setAtModal({ employeeId, day, endDay: day, employeeName });
    } else if (ABONO_CODES.includes(value) && addJustification) {
      // Abrir modal de justificativa
      setJustText('');
      setJustModal({ employeeId, day, code: value, employeeName });
      setTimeout(() => justTextRef.current?.focus(), 100);
    } else {
      updateRecord(employeeId, day, 'supervisor', value);
    }
  }

  function handleJustModalConfirm() {
    if (!justModal) return;
    updateRecord(justModal.employeeId, justModal.day, 'supervisor', justModal.code);
    if (addJustification && justText.trim()) {
      addJustification(justModal.employeeId, justModal.day, justText.trim(), false, justModal.code);
    }
    setJustModal(null);
    setJustText('');
  }

  function handleJustModalSkip() {
    if (!justModal) return;
    updateRecord(justModal.employeeId, justModal.day, 'supervisor', justModal.code);
    setJustModal(null);
    setJustText('');
  }

  function handleJustModalCancel() {
    setJustModal(null);
    setJustText('');
  }

  // Reabrir modal apenas para anexar arquivo em um AT já existente (sem alterar células)
  const handleRequestAtUpload = useCallback((employeeId: string, day: string, employeeName: string) => {
    setAtFile(null);
    setAtText('');
    setAtError('');
    setAtModal({ employeeId, day, endDay: day, employeeName, attachOnly: true });
    setTimeout(() => atFileRef.current?.click(), 150);
  }, []);

  async function handleAtModalConfirm() {
    if (!atModal) return;
    // attachOnly exige arquivo (única razão do modal); fluxo normal aceita lançar pendente
    if (atModal.attachOnly && !atFile) {
      setAtError('Selecione um arquivo para anexar.');
      return;
    }
    setAtUploading(true);
    setAtError('');
    try {
      const formData = new FormData();
      if (atFile) formData.append('atestado', atFile);
      formData.append('employeeId', atModal.employeeId);
      formData.append('day', atModal.day);
      if (atModal.endDay && atModal.endDay !== atModal.day) {
        formData.append('endDay', atModal.endDay);
      }
      if (atText.trim()) formData.append('text', atText.trim());

      const res = await fetch('/api/attendance/upload-atestado', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Falha ao salvar atestado');
      }
      const data = await res.json().catch(() => ({}));
      const days: string[] = Array.isArray(data.days) && data.days.length
        ? data.days
        : [atModal.day];

      // Marca AT na coluna supervisor para todos os dias do período (exceto attachOnly)
      if (!atModal.attachOnly) {
        for (const d of days) {
          updateRecord(atModal.employeeId, d, 'supervisor', 'AT');
        }
        toast.success(
          atFile
            ? `Atestado anexado em ${days.length} dia(s)`
            : `Atestado lançado como pendente em ${days.length} dia(s)`
        );
      } else {
        toast.success('Arquivo anexado ao atestado');
      }

      setAtModal(null);
      setAtFile(null);
      setAtText('');
    } catch (e: any) {
      setAtError(e.message || 'Erro ao salvar atestado');
    } finally {
      setAtUploading(false);
    }
  }

  function handleAtModalCancel() {
    setAtModal(null);
    setAtFile(null);
    setAtText('');
    setAtError('');
  }
  // calcular largura mínima da tabela dinamicamente: larguras fixas das colunas iniciais + colunas de dias
  const fixedColsWidth = 220 + 100 + 40; // largura aproximada das 3 colunas fixas (FUNC, FUNÇÃO, APT/SUP)
  const dayColWidth = 36; // largura por dia (inclui padding/margem)
  const tableMinWidth = Math.max(1400, fixedColsWidth + (daysInMonth.length * dayColWidth));
  function setAllPresentForDay(day: string) {
    if (!isAdmin) return; // proteger ação para admins apenas
    const dayInfo = daysInMonth.find(d => d.day === day);
    if (!dayInfo) return;
    // Não marcar domingos
    if (dayInfo.isSunday) return;
    const batch = updateRecordsBatch || ((updates: any[]) => updates.forEach(u => updateRecord(u.employeeId, u.day, u.field, u.value)));
    batch(employees.map(emp => ({ employeeId: emp.id, day, field: 'apontador' as const, value: 'P' as AttendanceCode })));
  }

  function applyCodeToAll(day: string, code: string) {
    if (!isAdmin) return;
    const dayInfo = daysInMonth.find(d => d.day === day);
    if (!dayInfo) return;
    if (dayInfo.isSunday) return;

    const batch = updateRecordsBatch || ((updates: any[]) => updates.forEach(u => updateRecord(u.employeeId, u.day, u.field, u.value)));
    const updates: Array<{ employeeId: string; day: string; field: 'apontador' | 'supervisor'; value: AttendanceCode }> = [];
    for (const emp of employees) {
      if (!code) {
        updates.push({ employeeId: emp.id, day, field: 'apontador', value: '' });
        updates.push({ employeeId: emp.id, day, field: 'supervisor', value: '' });
      } else if (code === 'FER') {
        updates.push({ employeeId: emp.id, day, field: 'apontador', value: 'FER' });
        updates.push({ employeeId: emp.id, day, field: 'supervisor', value: 'FER' });
      } else if (code === 'FOLGA') {
        updates.push({ employeeId: emp.id, day, field: 'apontador', value: 'FOLGA' });
        updates.push({ employeeId: emp.id, day, field: 'supervisor', value: 'FOLGA' });
      } else {
        updates.push({ employeeId: emp.id, day, field: 'apontador', value: code as AttendanceCode });
      }
    }
    batch(updates);
  }
  function setAllHolidayForDay(day: string) {
    if (!isAdmin) return; // somente admin
    const dayInfo = daysInMonth.find(d => d.day === day);
    if (!dayInfo) return;
    // não aplicamos feriado automático em domingos
    if (dayInfo.isSunday) return;
    const batch = updateRecordsBatch || ((updates: any[]) => updates.forEach(u => updateRecord(u.employeeId, u.day, u.field, u.value)));
    const updates: Array<{ employeeId: string; day: string; field: 'apontador' | 'supervisor'; value: AttendanceCode }> = [];
    for (const emp of employees) {
      updates.push({ employeeId: emp.id, day, field: 'apontador', value: 'FER' });
      updates.push({ employeeId: emp.id, day, field: 'supervisor', value: 'FER' });
    }
    batch(updates);
  }

  // Stable callback creators to avoid inline arrow re-creations
  const handleApontadorChangeCell = useCallback((employeeId: string, day: string, value: AttendanceCode) => {
    updateRecord(employeeId, day, 'apontador', value);
  }, [updateRecord]);

  const handleSupervisorChangeCell = useCallback((employeeId: string, day: string, value: AttendanceCode, employeeName: string) => {
    handleSupervisorChange(employeeId, day, value, employeeName);
  }, []);

  return (
    <div style={{ overflow: 'auto', width: '100%', maxHeight: 'calc(100vh - 280px)' }}>
      {/* Modal de justificativa para ABF/ABT */}
      {justModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-[#0059A0] px-6 py-4 flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-base">Justificativa de Abono</h2>
                <p className="text-white/70 text-xs mt-0.5">
                  {justModal.code} — {justModal.employeeName.toUpperCase()} — {format(new Date(justModal.day + 'T12:00:00'), 'dd/MM/yyyy')}
                </p>
              </div>
              <button
                onClick={handleJustModalCancel}
                className="text-white/70 hover:text-white transition-colors ml-4 mt-0.5"
                title="Cancelar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Justificativa *</label>
                <textarea
                  ref={justTextRef}
                  value={justText}
                  onChange={e => setJustText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { handleJustModalCancel(); } else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (justText.trim()) handleJustModalConfirm(); } }}
                  placeholder="Digite a justificativa..."
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm resize-none transition-all focus:outline-none focus:border-[#0059A0] focus:bg-white focus:ring-4 focus:ring-[#0059A0]/10"
                />
                <p className="text-[11px] text-gray-400 mt-1">Enter para confirmar • Shift+Enter para nova linha</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleJustModalConfirm}
                  disabled={!justText.trim()}
                  className="flex-1 h-10 bg-[#0059A0] hover:bg-[#004A85] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
                <button
                  onClick={handleJustModalSkip}
                  className="flex-1 h-10 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold rounded-xl text-sm transition-all"
                >
                  Aplicar sem justificativa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de upload de Atestado (AT) */}
      {atModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-emerald-700 px-6 py-4 flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-base">
                  {atModal.attachOnly ? 'Anexar Atestado' : 'Atestado Médico'}
                </h2>
                <p className="text-white/70 text-xs mt-0.5">
                  AT — {atModal.employeeName.toUpperCase()}
                </p>
              </div>
              <button
                onClick={handleAtModalCancel}
                className="text-white/70 hover:text-white transition-colors ml-4 mt-0.5"
                title="Cancelar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Hidden file input */}
              <input
                ref={atFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setAtFile(f);
                  setAtError('');
                }}
              />
              {/* Período (apenas no fluxo normal) */}
              {!atModal.attachOnly && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Período do Atestado</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-gray-400 mb-0.5">Início</span>
                      <input
                        type="date"
                        value={atModal.day}
                        readOnly
                        disabled
                        className="w-full rounded-xl border-2 border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 mb-0.5">Fim</span>
                      <input
                        type="date"
                        min={atModal.day}
                        max={daysInMonth.length ? daysInMonth[daysInMonth.length - 1].day : undefined}
                        value={atModal.endDay}
                        onChange={e => {
                          const v = e.target.value;
                          if (atModal && v >= atModal.day) {
                            setAtModal({ ...atModal, endDay: v });
                          }
                        }}
                        className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-all focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    AT será aplicado em {Math.max(1, Math.round((new Date(atModal.endDay + 'T12:00:00').getTime() - new Date(atModal.day + 'T12:00:00').getTime()) / 86400000) + 1)} dia(s) corridos.
                  </p>
                </div>
              )}
              {/* File upload area */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Foto / Arquivo do Atestado{' '}
                  {atModal.attachOnly
                    ? <span className="text-red-500">*</span>
                    : <span className="text-gray-400 normal-case font-normal">(opcional — pode anexar depois)</span>}
                </label>
                <button
                  type="button"
                  onClick={() => atFileRef.current?.click()}
                  className={cn(
                    "mt-1.5 w-full rounded-xl border-2 border-dashed px-4 py-6 text-sm transition-all focus:outline-none text-center",
                    atFile
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-50 text-gray-500 hover:border-emerald-400 hover:bg-emerald-50"
                  )}
                >
                  {atFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{atFile.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                      <span className="font-medium">{atFile.name}</span>
                      <span className="text-xs text-gray-400">{(atFile.size / 1024).toFixed(0)} KB — clique para trocar</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">📷</span>
                      <span className="font-medium">Tirar foto ou selecionar arquivo</span>
                      <span className="text-xs text-gray-400">JPG, PNG, PDF • máx. 5MB</span>
                    </div>
                  )}
                </button>
              </div>
              {/* Optional notes */}
              {!atModal.attachOnly && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observação (opcional)</label>
                  <input
                    type="text"
                    value={atText}
                    onChange={e => setAtText(e.target.value)}
                    placeholder="Ex: Atestado de 2 dias, Dr. João..."
                    className="mt-1.5 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                  />
                </div>
              )}
              {atError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{atError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleAtModalConfirm}
                  disabled={atUploading || (atModal.attachOnly && !atFile)}
                  className="flex-1 h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {atUploading ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Enviando...</>
                  ) : atModal.attachOnly
                    ? 'Anexar arquivo'
                    : atFile
                      ? 'Confirmar AT'
                      : 'Lançar como pendente'}
                </button>
                <button
                  onClick={handleAtModalCancel}
                  disabled={atUploading}
                  className="flex-1 h-10 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold rounded-xl text-sm transition-all disabled:opacity-40"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ minWidth: `${tableMinWidth}px` }}>
        {/* Month Lock Warning */}
        {isEditDisabled && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <span className="font-semibold">🔒 Mês Bloqueado</span> - Este mês foi bloqueado pelo administrador. Você pode apenas visualizar os dados. Para fazer alterações, aguarde a liberação do administrador.
          </div>
        )}

        {/* Header with store and period info */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <h2 className="text-lg font-bold text-primary">{storeName || 'TODOS FUNCIONÁRIOS'}</h2>
            {supervisorName && (
              <p className="text-sm text-muted-foreground">SUPERVISOR: {supervisorName}</p>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-base font-semibold text-foreground">PLANILHA DE APONTAMENTO DE PRESENÇA</h3>
            <p className="text-sm text-primary font-medium">{periodLabel}</p>
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="table-header-cell border-r border-border/30 px-2 py-2 text-left w-[220px] sticky left-0 z-10">
                  FUNCIONÁRIOS
                </th>
                <th className="table-header-cell border-r border-border/30 px-2 py-2 text-left w-[100px]">
                  FUNÇÃO
                </th>
                <th className="table-header-cell border-r border-border/30 px-1 py-1 w-[40px] text-center text-[9px]">
                  <div>APT</div>
                  <div>SUP</div>
                </th>
                {daysInMonth.map((dayInfo) => (
                  <th
                    key={dayInfo.day}
                    className={cn(
                      "border-r border-border/30 px-0.5 py-1 w-[28px] text-center text-[10px]",
                      dayInfo.isSunday ? "cell-sunday" : dayInfo.isHoliday ? "cell-holiday" : "table-header-cell"
                    )}
                  >
                      <div className="flex flex-col items-center gap-1">
                      <div className="text-sm font-semibold">{format(dayInfo.date, 'd')}</div>
                      <div className="mt-1">
                        <select
                          value={bulkCodeByDay[dayInfo.day] ?? ''}
                          onChange={(e) => {
                            const code = (e.target.value as AttendanceCode) || '';
                            setBulkCodeByDay((s) => ({ ...s, [dayInfo.day]: code }));
                            // aplicar automaticamente ao selecionar
                            applyCodeToAll(dayInfo.day, code);
                          }}
                          className="h-7 text-[10px] rounded border px-1 text-foreground bg-background"
                          disabled={dayInfo.isSunday || !isAdmin}
                          title={dayInfo.isSunday ? 'Operação não disponível em domingos' : isAdmin ? 'Selecione o código para aplicar a todos' : 'Apenas o Apontador pode selecionar'}
                        >
                          <option value="">— (limpar)</option>
                          <option value="P">P</option>
                          <option value="F">F</option>
                          <option value="FT">FT</option>
                          <option value="FM">FM</option>
                          <option value="FER">FER</option>
                          <option value="FOLGA">FOLGA</option>
                        </select>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => {
                return (
                  <tr 
                    key={employee.id}
                    className={cn(
                      "border-t border-border/50",
                      index % 2 === 1 && "bg-table-row-alt"
                    )}
                  >
                    <td className="border-r border-border/30 px-2 py-1 font-medium text-[10px] text-foreground sticky left-0 bg-card z-10 uppercase">
                      {employee.name}
                    </td>
                    <td className="border-r border-border/30 px-2 py-1 text-[10px] text-muted-foreground">
                      {employee.role}
                    </td>
                    <td className="border-r border-border/30 px-0.5 py-0.5 w-[40px]">
                      <div className="flex flex-col text-[8px] text-center text-muted-foreground">
                        <span className="border-b border-border/30 py-0.5">APT</span>
                        <span className="py-0.5">SUP</span>
                      </div>
                    </td>
                    {daysInMonth.map((dayInfo) => {
                      const record = getRecord(employee.id, dayInfo.day);
                      return (
                        <td key={dayInfo.day} className="border-r border-border/30 p-0 w-[28px] h-[44px]">
                          <AttendanceCell
                            dayInfo={dayInfo}
                            employeeId={employee.id}
                            employeeName={employee.name}
                            apontadorValue={record.apontador}
                            supervisorValue={record.supervisor}
                            onApontadorChange={handleApontadorChangeCell}
                            onSupervisorChange={handleSupervisorChangeCell}
                            currentUserRole={currentUserRole}
                            isDisabled={isEditDisabled}
                            isAtPending={pendingAtKeys?.has(`${employee.id}|${dayInfo.day}`) ?? false}
                            onRequestAtUpload={handleRequestAtUpload}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-primary">
                <td colSpan={2} className="px-2 py-2 font-bold text-[11px] text-foreground">
                  TOTAL DE FUNCIONÁRIOS
                </td>
                <td className="text-center font-bold text-[11px]">{employees.length}</td>
                <td colSpan={daysInMonth.length} />
              </tr>
              <tr className="border-t border-border">
                <td colSpan={2} className="px-2 py-2 font-bold text-[11px] text-destructive">
                  TOTAL OCORRÊNCIAS
                </td>
                <td className="text-center text-[11px] font-bold text-destructive">
                  {daysInMonth.reduce((sum, d) => sum + (d.isSunday || d.isHoliday ? 0 : getTotals(d.day)), 0)}
                </td>
                {daysInMonth.map((dayInfo) => (
                  <td 
                    key={dayInfo.day} 
                    className={cn(
                      "text-center text-[10px] font-semibold",
                      dayInfo.isSunday || dayInfo.isHoliday ? "text-muted-foreground" : "text-destructive"
                    )}
                  >
                    {dayInfo.isSunday || dayInfo.isHoliday ? '-' : getTotals(dayInfo.day)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
