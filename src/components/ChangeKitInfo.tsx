import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollectionCRUD } from '../lib/useCollectionCRUD';
import { Plus, Trash2, Edit2, Search, BarChart2, List, Check, X, Filter, ArrowUpDown, Download, Copy, ChevronRight, Wrench } from 'lucide-react';
import { useExportExcel } from '../lib/useExportExcel';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { usePersistentState } from '../lib/usePersistentState';
import { useData } from '../contexts/DataContext';
import { useDebounce } from '../lib/useDebounce';
import { useBulkSelect } from '../lib/useBulkSelect';
import BulkActionBar from './ui/BulkActionBar';
import { validateForm } from '../lib/validate';
import { useToast } from '../contexts/ToastContext';
import { useSavedViews } from '../lib/useSavedViews';
import SavedViewsPanel from './ui/SavedViewsPanel';
import { useIsMobile } from '../lib/useIsMobile';

interface ChangeKit {
  id: string;
  facility: string;
  location: string;
  kind: string;
  toolsId: string;
  packageSize: string;
  changeKitGroup: string;
  status: string;
  idleTime: string;
}

const KitRow = React.memo(({
  kit,
  idx,
  columns,
  isAdmin,
  editingId,
  setEditingId,
  handleUpdate,
  setModal,
  setSaveModal,
  handleDuplicate,
  isSelected,
  onToggle
}: {
  kit: ChangeKit,
  idx: number,
  columns: any[],
  isAdmin: boolean,
  editingId: string | null,
  setEditingId: (id: string | null) => void,
  handleUpdate: (id: string, data: any) => void,
  setModal: (modal: any) => void,
  setSaveModal: (modal: any) => void,
  handleDuplicate: (item: ChangeKit) => void,
  isSelected: boolean,
  onToggle: () => void
}) => {
  const { t } = useTranslation();
  const [localData, setLocalData] = useState<Partial<ChangeKit>>(kit);
  
  useEffect(() => {
    if (editingId !== kit.id) {
      setLocalData(kit);
    }
  }, [kit, editingId]);

  const isEditing = editingId === kit.id;

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
      key={kit.id}
      className={cn("group hover:bg-zinc-50/80 transition-colors", isSelected && "bg-blue-50/60")}
    >
      {isAdmin && (
        <td className="px-4 py-4 w-10" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
            checked={isSelected}
            onChange={onToggle}
          />
        </td>
      )}
      {columns.map((col, i) => (
        <td key={col.key} className={cn("px-6 py-4 text-zinc-600 whitespace-nowrap", i === 0 && "sticky left-0 bg-white group-hover:bg-zinc-50/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors")}>
          {isEditing ? (
            <input
              type="text"
              value={localData[col.key as keyof ChangeKit] as string || ''}
              onChange={(e) => setLocalData({ ...localData, [col.key]: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              autoFocus={col.key === 'facility'}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const tr = (e.currentTarget as HTMLElement).closest('tr');
                  if (!tr) return;
                  const inputs = Array.from(tr.querySelectorAll<HTMLInputElement>('input'));
                  const idx = inputs.indexOf(e.currentTarget as HTMLInputElement);
                  const next = inputs[e.shiftKey ? idx - 1 : idx + 1];
                  next?.focus();
                } else if (e.key === 'Escape') {
                  setLocalData(kit);
                  setEditingId(null);
                }
              }}
            />
          ) : (
            <span className={cn(
              "font-medium",
              col.key === 'toolsId' ? "text-brand-primary font-bold" : "text-zinc-500"
            )}>
              {kit[col.key as keyof ChangeKit]}
            </span>
          )}
        </td>
      ))}
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <button onClick={() => setSaveModal({ isOpen: true, id: kit.id, data: localData })} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="h-4 w-4" /></button>
              <button onClick={() => { setLocalData(kit); setEditingId(null); }} className="p-2 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-zinc-200 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingId(kit.id)}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDuplicate(kit)}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-emerald-500 transition-all"
                title={t('common.duplicate')}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => setModal({ isOpen: true, id: kit.id })}
                className="p-2 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </td>
      )}
    </motion.tr>
  );
});

export default function ChangeKitInfo({ isAdmin, selectedFacility }: { isAdmin: boolean, selectedFacility: string }) {
  const { t } = useTranslation();
  const { add, update, remove } = useCollectionCRUD<ChangeKit>('changeKits');
  const { addToast } = useToast();
  const { exportToExcel } = useExportExcel();
  const { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected } = useBulkSelect();
  const { views: savedViews, saveView, deleteView } = useSavedViews('changeKitInfo_savedViews');
  const { changeKits: allKits } = useData();
  
  const kits = useMemo(() => {
    let data = [...allKits];
    if (selectedFacility !== 'ALL') {
      data = data.filter(k => (k.facility || '').trim().toUpperCase() === selectedFacility);
    }
    data.sort((a, b) => (a.toolsId || '').localeCompare(b.toolsId || ''));
    return data;
  }, [allKits, selectedFacility]);

  const isMobile = useIsMobile();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKit, setNewKit] = useState<Partial<ChangeKit>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const [saveModal, setSaveModal] = useState<{isOpen: boolean, id: string | null, data: any | null}>({ isOpen: false, id: null, data: null });

  const [filterToolsIds, setFilterToolsIds] = usePersistentState<string[]>('changeKitInfo_filterToolsIds', []);
  const [filterChangeKitGroups, setFilterChangeKitGroups] = usePersistentState<string[]>('changeKitInfo_filterChangeKitGroups', []);
  const [filterStatuses, setFilterStatuses] = usePersistentState<string[]>('changeKitInfo_filterStatuses', []);

  useEffect(() => { clearSelection(); }, [debouncedSearchTerm, filterToolsIds, filterChangeKitGroups, filterStatuses, selectedFacility]);
  const [visibleColumns, setVisibleColumns] = usePersistentState<string[]>('changeKitInfo_visibleColumns', [
    'facility', 'location', 'kind', 'toolsId', 'packageSize', 'changeKitGroup', 'status', 'idleTime'
  ]);
  const [displayCount, setDisplayCount] = useState(100);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAdd = async () => {
    const ok = validateForm<ChangeKit>(newKit, [
      { field: 'facility', label: 'Facility', required: true },
      { field: 'toolsId', label: 'Tools ID', required: true },
    ], addToast);
    if (!ok) return;
    const success = await add({ ...newKit, facility: selectedFacility === 'ALL' ? (newKit.facility || '') : selectedFacility });
    if (success) { setNewKit({}); setEditingId(null); }
  };

  const handleUpdate = async (id: string, data: Partial<ChangeKit>) => {
    const sanitized = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v != null ? String(v) : ''])
    ) as Partial<ChangeKit>;
    const ok = await update(id, sanitized);
    if (ok) setEditingId(null);
  };

  const handleDelete = async () => {
    if (!modal.id) return;
    const item = kits.find(k => k.id === modal.id);
    const { id: _id, ...undoData } = (item ?? {}) as any;
    const ok = await remove(modal.id, Object.keys(undoData).length ? undoData : undefined);
    if (ok) setModal({ isOpen: false, id: null });
  };

  const handleDuplicate = async (item: ChangeKit) => {
    const { id: _id, ...data } = item as any;
    const sanitized = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v != null ? String(v) : ''])
    ) as Partial<ChangeKit>;
    const ok = await add(sanitized);
    if (ok) addToast(t('info.recordCopied'), 'success');
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => remove(id)));
    clearSelection();
  };

  const getUniqueValues = (key: keyof ChangeKit, currentFilters: any) => {
    const filtered = kits.filter(k => {
      for (const [filterKey, filterValues] of Object.entries(currentFilters)) {
        if (filterKey === key) continue;
        const values = filterValues as string[];
        if (values.length > 0 && !values.includes(String(k[filterKey as keyof ChangeKit] || ''))) {
          return false;
        }
      }
      return true;
    });
    return Array.from(new Set(filtered.map(k => String(k[key] || '')).filter(Boolean))).sort();
  };

  const currentFilters = {
    toolsId: filterToolsIds,
    changeKitGroup: filterChangeKitGroups,
    status: filterStatuses
  };

  const uniqueToolsIds = React.useMemo(() => getUniqueValues('toolsId', currentFilters), [kits, filterChangeKitGroups, filterStatuses]);
  const uniqueChangeKitGroups = React.useMemo(() => getUniqueValues('changeKitGroup', currentFilters), [kits, filterToolsIds, filterStatuses]);
  const uniqueStatuses = React.useMemo(() => getUniqueValues('status', currentFilters), [kits, filterToolsIds, filterChangeKitGroups]);

  const stats = React.useMemo(() => {
    return kits.reduce((acc, kit) => {
      // Only count if Facility equals Location
      const facility = (kit.facility || '').trim().toUpperCase();
      const location = (kit.location || '').trim().toUpperCase();
      
      if (facility !== location || !location) return acc;

      const displayLocation = kit.location || 'Unknown';
      const group = kit.changeKitGroup || 'Unknown';
      
      if (!acc[displayLocation]) acc[displayLocation] = {};
      if (!acc[displayLocation][group]) acc[displayLocation][group] = 0;
      acc[displayLocation][group]++;
      
      return acc;
    }, {} as Record<string, Record<string, number>>);
  }, [kits]);

  const filteredKits = React.useMemo(() => {
    let result = kits.filter(k => {
      const matchSearch = (k.toolsId || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (k.kind || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchToolsId = filterToolsIds.length === 0 || filterToolsIds.includes(String(k.toolsId || ''));
      const matchChangeKitGroup = filterChangeKitGroups.length === 0 || filterChangeKitGroups.includes(String(k.changeKitGroup || ''));
      const matchStatus = filterStatuses.length === 0 || filterStatuses.includes(String(k.status || ''));

      return matchSearch && matchToolsId && matchChangeKitGroup && matchStatus;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key as keyof ChangeKit] || '');
        const bValue = String(b[sortConfig.key as keyof ChangeKit] || '');
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [kits, debouncedSearchTerm, filterToolsIds, filterChangeKitGroups, filterStatuses, sortConfig]);

  const allColumns = [
    { key: 'facility', label: t('changeKitInfo.columns.facility') },
    { key: 'location', label: t('changeKitInfo.columns.location') },
    { key: 'kind', label: t('changeKitInfo.columns.kind') },
    { key: 'toolsId', label: t('changeKitInfo.columns.toolsId') },
    { key: 'packageSize', label: t('changeKitInfo.columns.packageSize') },
    { key: 'changeKitGroup', label: t('changeKitInfo.columns.changeKitGroup') },
    { key: 'status', label: t('changeKitInfo.columns.status') },
    { key: 'idleTime', label: t('changeKitInfo.columns.idleTime') },
  ];

  const columns = allColumns.filter(col => visibleColumns.includes(col.key));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-4xl italic text-zinc-900 tracking-tight">{t('changeKitInfo.title')}</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">{t('changeKitInfo.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-zinc-200 bg-zinc-50/50 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <List className="h-3.5 w-3.5" />
              {t('sharedTable.list')}
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === 'stats' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              {t('sharedTable.stats')}
            </button>
          </div>
          <button
            onClick={() => exportToExcel(filteredKits, columns, 'change_kits')}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>{t('common.exportExcel')}</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setEditingId('new')}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-black/10 active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>{t('changeKitInfo.addKit')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between surface-card p-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 w-full lg:w-auto pb-2 lg:pb-0">
          <div className="flex items-center gap-1.5 px-2">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <button
              onClick={() => {
                setFilterToolsIds([]);
                setFilterChangeKitGroups([]);
                setFilterStatuses([]);
              }}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap"
            >
              {t('sharedTable.clearFilters')}
            </button>
            <SavedViewsPanel
              views={savedViews}
              onSave={(name) => saveView(name, { filterToolsIds, filterChangeKitGroups, filterStatuses })}
              onApply={(filters) => {
                const f = filters as any;
                setFilterToolsIds(f.filterToolsIds ?? []);
                setFilterChangeKitGroups(f.filterChangeKitGroups ?? []);
                setFilterStatuses(f.filterStatuses ?? []);
              }}
              onDelete={deleteView}
            />
          </div>
          <div className="w-px h-4 bg-zinc-200 shrink-0"></div>
          <div className="flex flex-wrap items-center gap-2 px-1">
            <MultiSelectDropdown
              values={filterToolsIds}
              onChange={setFilterToolsIds}
              options={uniqueToolsIds}
              placeholder={t('changeKitInfo.filters.toolsIds')}
            />
            <MultiSelectDropdown
              values={filterChangeKitGroups}
              onChange={setFilterChangeKitGroups}
              options={uniqueChangeKitGroups}
              placeholder={t('changeKitInfo.filters.kitGroups')}
            />
            <MultiSelectDropdown
              values={filterStatuses}
              onChange={setFilterStatuses}
              options={uniqueStatuses}
              placeholder={t('changeKitInfo.filters.statuses')}
            />
            <div className="w-px h-4 bg-zinc-200 shrink-0 mx-1"></div>
            <MultiSelectDropdown
              values={allColumns.filter(c => visibleColumns.includes(c.key)).map(c => c.label)}
              onChange={(labels) => {
                const newVisible = allColumns.filter(c => labels.includes(c.label)).map(c => c.key);
                setVisibleColumns(newVisible);
              }}
              options={allColumns.map(c => c.label)}
              placeholder={t('sharedTable.columns')}
            />
          </div>
        </div>
        
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={t('changeKitInfo.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-100 bg-zinc-50/50 pl-10 pr-4 py-2 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="relative overflow-hidden surface-card"
          >
            {isMobile ? (
              <div className="space-y-2.5 p-3">
                {filteredKits.map((kit) => {
                  const isExpanded = expandedCardId === kit.id;
                  return (
                    <div key={kit.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                      <button className="w-full text-left p-4" onClick={() => setExpandedCardId(isExpanded ? null : kit.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">{kit.facility}</span>
                              {kit.status && <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', kit.status === 'Active' || kit.status === 'In Use' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500')}>{kit.status}</span>}
                            </div>
                            <p className="font-bold text-zinc-900 text-base truncate">{kit.toolsId}</p>
                            <p className="text-sm text-zinc-500 truncate">{[kit.kind, kit.changeKitGroup].filter(Boolean).join(' · ')}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                              {kit.location && <span>Location: <span className="font-medium text-zinc-600">{kit.location}</span></span>}
                              {kit.idleTime && <span>Idle: <span className="font-medium text-zinc-600">{kit.idleTime}</span></span>}
                            </div>
                          </div>
                          <ChevronRight className={cn('h-4 w-4 text-zinc-300 shrink-0 mt-1 transition-transform', isExpanded && 'rotate-90')} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-zinc-50 pt-3 space-y-2">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            {[
                              { label: 'Package Size', value: kit.packageSize },
                              { label: 'Location', value: kit.location },
                              { label: 'CK Group', value: kit.changeKitGroup },
                              { label: 'Kind', value: kit.kind },
                              { label: 'Idle Time', value: kit.idleTime },
                              { label: 'Status', value: kit.status },
                            ].filter(f => f.value).map(f => (
                              <div key={f.label}>
                                <p className="text-zinc-400 text-[10px] uppercase tracking-wide">{f.label}</p>
                                <p className="font-medium text-zinc-700 truncate">{f.value}</p>
                              </div>
                            ))}
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2 pt-2 border-t border-zinc-50">
                              <button onClick={() => setEditingId(kit.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-bold hover:bg-zinc-200 transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />Edit
                              </button>
                              <button onClick={() => setModal({ isOpen: true, id: kit.id })} className="flex items-center justify-center p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredKits.length === 0 && (
                  <div className="text-center py-16 text-zinc-400">
                    <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No results found</p>
                  </div>
                )}
              </div>
            ) : (
              <DoubleScrollbar>
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      {isAdmin && (
                        <th className="px-4 py-4 border-b border-zinc-100 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                            checked={isAllSelected(filteredKits.slice(0, displayCount).map(x => x.id))}
                            onChange={() => toggleAll(filteredKits.slice(0, displayCount).map(x => x.id))}
                          />
                        </th>
                      )}
                      {columns.map((col, i) => (
                        <th
                          key={col.key}
                          className={cn("px-0 py-0 border-b border-zinc-100", i === 0 && "sticky left-0 bg-zinc-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]")}
                        >
                          <div className="px-6 py-4 flex items-center cursor-pointer hover:bg-zinc-100/50 transition-colors" onClick={() => handleSort(col.key)}>
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 font-sans whitespace-nowrap">
                              {col.label}
                            </span>
                            <ArrowUpDown className={cn("ml-2 h-3 w-3 shrink-0", sortConfig?.key === col.key ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                          </div>
                        </th>
                      ))}
                      {isAdmin && <th className="px-6 py-4 border-b border-zinc-100 text-right">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 font-sans">{t('sharedTable.actions')}</span>
                      </th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    <AnimatePresence mode="popLayout">
                      {editingId === 'new' && (
                        <motion.tr
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="bg-zinc-50/30"
                        >
                          {isAdmin && <td className="px-4 py-3 w-10" />}
                          {columns.map(col => (
                            <td key={col.key} className="px-6 py-3">
                              <input
                                type="text"
                                autoFocus={col.key === 'facility'}
                                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                                onChange={(e) => setNewKit({ ...newKit, [col.key]: e.target.value })}
                              />
                            </td>
                          ))}
                          <td className="px-6 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={handleAdd} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-zinc-200 transition-colors"><X className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                      {filteredKits.slice(0, displayCount).map((kit, idx) => (
                      <KitRow
                        key={kit.id}
                        kit={kit}
                        idx={idx}
                        columns={columns}
                        isAdmin={isAdmin}
                        editingId={editingId}
                        setEditingId={setEditingId}
                        handleUpdate={handleUpdate}
                        setModal={setModal}
                        setSaveModal={setSaveModal}
                        handleDuplicate={handleDuplicate}
                        isSelected={selectedIds.has(kit.id)}
                        onToggle={() => toggleOne(kit.id)}
                      />
                    ))}
                    </AnimatePresence>
                    {filteredKits.length > displayCount && (
                      <tr>
                        <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                          {t('sharedTable.showingSubset', { displayCount, total: filteredKits.length })}
                          <button onClick={() => setDisplayCount(prev => prev + 200)} className="text-brand-primary hover:underline font-medium not-italic">{t('changeKitInfo.load200More')}</button>.
                        </td>
                      </tr>
                    )}
                    {displayCount > 100 && filteredKits.length <= displayCount && (
                      <tr>
                        <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                          {t('sharedTable.showingAll', { total: filteredKits.length })}
                          <button onClick={() => setDisplayCount(100)} className="text-brand-primary hover:underline font-medium not-italic">{t('sharedTable.showLess')}</button>.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </DoubleScrollbar>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex flex-col gap-8">
              {Object.entries(stats).map(([location, groups], idx) => {
                const total = Object.values(groups).reduce((a, b) => a + b, 0);
                const max = Math.max(...Object.values(groups));
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    key={location} 
                    className="rounded-3xl border border-zinc-100 bg-white card-shadow overflow-hidden flex flex-col"
                  >
                    <div className="bg-zinc-50/50 px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
                      <h3 className="font-serif italic text-2xl text-zinc-900">{location}</h3>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('changeKitInfo.totalKits')}</span>
                        <span className="text-xl font-bold text-brand-primary">{total}</span>
                      </div>
                    </div>
                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6 flex-1">
                        {Object.entries(groups)
                          .sort((a, b) => b[1] - a[1])
                          .map(([group, count]) => (
                          <div key={group} className="space-y-2 group">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors break-words">{group}</span>
                              <span className="text-sm font-bold text-zinc-900 shrink-0 mt-0.5">{count}</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(count / max) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 + 0.2 }}
                                className="h-full bg-brand-primary rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {Object.keys(stats).length === 0 && (
              <div className="py-12 text-center text-zinc-500 bg-white rounded-3xl border border-zinc-100 border-dashed">
                {t('sharedTable.noStats')}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isMobile && isAdmin && viewMode === 'list' && (
        <button
          onClick={() => setEditingId('new')}
          className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-brand-primary text-white shadow-xl shadow-brand-primary/30 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <BulkActionBar count={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">{t('sharedTable.confirmDeletion')}</h3>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-zinc-600">
                {t('changeKitInfo.deleteWarning')}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModal({ isOpen: false, id: null })}
                  className="rounded-xl px-6 py-2.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100"
                >
                  {t('sharedTable.cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 shadow-lg shadow-red-600/20"
                >
                  {t('sharedTable.deleteRecord')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Confirmation Modal */}
      <AnimatePresence>
        {saveModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">{t('sharedTable.saveChanges')}</h3>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-zinc-600">
                {t('sharedTable.saveWarning')}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSaveModal({ isOpen: false, id: null, data: null })}
                  className="rounded-xl px-6 py-2.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100"
                >
                  {t('sharedTable.cancel')}
                </button>
                <button
                  onClick={() => {
                    if (saveModal.id && saveModal.data) {
                      handleUpdate(saveModal.id, saveModal.data);
                      setSaveModal({ isOpen: false, id: null, data: null });
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                >
                  {t('sharedTable.saveChanges')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
