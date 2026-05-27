import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollectionCRUD } from '../lib/useCollectionCRUD';
import { Plus, Trash2, Edit2, Check, X, Search, MoreHorizontal, Filter, ArrowUpDown, Download, Copy, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useExportExcel } from '../lib/useExportExcel';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { usePersistentState } from '../lib/usePersistentState';
import { useData } from '../contexts/DataContext';
import { useDebounce } from '../lib/useDebounce';
import { useIsMobile } from '../lib/useIsMobile';
import { BottomSheet } from './ui/BottomSheet';
import { useBulkSelect } from '../lib/useBulkSelect';
import BulkActionBar from './ui/BulkActionBar';
import { validateForm } from '../lib/validate';
import { useToast } from '../contexts/ToastContext';
import { useSavedViews } from '../lib/useSavedViews';
import SavedViewsPanel from './ui/SavedViewsPanel';

interface Product {
  id: string;
  facility: string;
  device: string;
  projectName: string;
  nickname: string;
  tester: string;
  handler: string;
  temperature: string;
  insertion: string;
  siteNumber: string;
  ballCountDevice: string;
  changeKitGroup: string;
  kitName1: string;
  kitName2: string;
  kitName3: string;
  kitName4: string;
  kitName5: string;
  kitName6: string;
  lbGroup: string;
  socketName1: string;
  socketName2: string;
}

const ProductRow = React.memo(({
  product,
  idx,
  columns,
  isAdmin,
  editingId,
  setEditingId,
  handleUpdate,
  setModal,
  setSelectedDevice,
  setSaveModal,
  handleDuplicate,
  isSelected,
  onToggle
}: {
  product: Product,
  idx: number,
  columns: any[],
  isAdmin: boolean,
  editingId: string | null,
  setEditingId: (id: string | null) => void,
  handleUpdate: (id: string, data: any) => void,
  setModal: (modal: any) => void,
  setSelectedDevice: (device: string) => void,
  setSaveModal: (modal: any) => void,
  handleDuplicate: (item: Product) => void,
  isSelected: boolean,
  onToggle: () => void
}) => {
  const { t } = useTranslation();
  const [localData, setLocalData] = useState<Partial<Product>>(product);
  
  useEffect(() => {
    if (editingId !== product.id) {
      setLocalData(product);
    }
  }, [product, editingId]);

  const isEditing = editingId === product.id;

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
      key={product.id} 
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
              value={localData[col.key as keyof Product] as string || ''}
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
                  setLocalData(product);
                  setEditingId(null);
                }
              }}
            />
          ) : col.key === 'device' ? (
            <button
              onClick={() => setSelectedDevice(product.device as string)}
              className="font-bold text-brand-primary hover:underline"
            >
              {product.device}
            </button>
          ) : (
            <span className="font-medium text-zinc-500">
              {product[col.key as keyof Product]}
            </span>
          )}
        </td>
      ))}
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <button onClick={() => setSaveModal({ isOpen: true, id: product.id, data: localData })} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="h-4 w-4" /></button>
              <button onClick={() => { setLocalData(product); setEditingId(null); }} className="p-2 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-zinc-200 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingId(product.id)}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDuplicate(product)}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-emerald-500 transition-all"
                title={t('common.duplicate')}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => setModal({ isOpen: true, id: product.id })}
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

export default function ProductInfo({ isAdmin, selectedFacility, onNavigate }: { isAdmin: boolean, selectedFacility: string, onNavigate?: (tab: string) => void }) {
  const { t } = useTranslation();
  const { add, update, remove } = useCollectionCRUD<Product>('products');
  const { addToast } = useToast();
  const isMobile = useIsMobile();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const { exportToExcel } = useExportExcel();
  const { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected } = useBulkSelect();
  const { views: savedViews, saveView, deleteView } = useSavedViews('productInfo_savedViews');
  const { products: allProducts, lifeTimes: lifeTimesData, loading } = useData();
  
  const [viewMode, setViewMode] = useState<'inventory' | 'missingLifeTime'>('inventory');

  const products = useMemo(() => {
    let data = [...allProducts];
    if (selectedFacility !== 'ALL') {
      data = data.filter(p => (p.facility || '').trim().toUpperCase() === selectedFacility);
    }
    data.sort((a, b) => (a.device || '').localeCompare(b.device || ''));
    return data;
  }, [allProducts, selectedFacility]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const [filterDevices, setFilterDevices] = usePersistentState<string[]>('productInfo_filterDevices', []);
  const [filterProjectNames, setFilterProjectNames] = usePersistentState<string[]>('productInfo_filterProjectNames', []);
  const [filterNicknames, setFilterNicknames] = usePersistentState<string[]>('productInfo_filterNicknames', []);
  const [filterChangeKitGroups, setFilterChangeKitGroups] = usePersistentState<string[]>('productInfo_filterChangeKitGroups', []);
  const [filterLBGroups, setFilterLBGroups] = usePersistentState<string[]>('productInfo_filterLBGroups', []);

  useEffect(() => { clearSelection(); }, [debouncedSearchTerm, filterDevices, filterProjectNames, filterNicknames, filterChangeKitGroups, filterLBGroups, selectedFacility]);
  const [displayCount, setDisplayCount] = useState(100);
  const [visibleColumns, setVisibleColumns] = usePersistentState<string[]>('productInfo_visibleColumns_v2', [
    'facility', 'device', 'projectName', 'nickname', 'tester', 'handler', 'temperature', 'insertion', 'siteNumber', 'ballCountDevice', 'changeKitGroup', 'kitName1', 'kitName2', 'kitName3', 'kitName4', 'kitName5', 'kitName6', 'lbGroup', 'socketName1', 'socketName2'
  ]);

  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const [saveModal, setSaveModal] = useState<{isOpen: boolean, id: string | null, data: any | null}>({ isOpen: false, id: null, data: null });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAdd = async () => {
    const ok = validateForm<Product>(newProduct, [
      { field: 'facility', label: 'Facility', required: true },
      { field: 'device', label: 'Device', required: true },
    ], addToast);
    if (!ok) return;
    const success = await add(newProduct);
    if (success) { setNewProduct({}); setEditingId(null); }
  };

  const handleUpdate = async (id: string, data: Partial<Product>) => {
    // Firestore security rules use checkStringLength which requires string types.
    // Old documents may have numeric fields — coerce everything to string before saving.
    const sanitized = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v != null ? String(v) : ''])
    ) as Partial<Product>;
    const ok = await update(id, sanitized);
    if (ok) setEditingId(null);
  };

  const handleDelete = async () => {
    if (modal.id) {
      const item = products.find(p => p.id === modal.id);
      const { id: _id, ...undoData } = (item ?? {}) as any;
      const ok = await remove(modal.id, Object.keys(undoData).length ? undoData : undefined);
      if (ok) setModal({ isOpen: false, id: null });
    }
  };

  const handleDuplicate = async (item: Product) => {
    const { id: _id, ...data } = item as any;
    const sanitized = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v != null ? String(v) : ''])
    ) as Partial<Product>;
    const ok = await add(sanitized);
    if (ok) addToast(t('info.recordCopied'), 'success');
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => remove(id)));
    clearSelection();
  };

  const getUniqueValues = (field: keyof Product, otherFilters: Record<string, string[]>) => {
    const filtered = products.filter(p => {
      return Object.entries(otherFilters).every(([f, vals]) => {
        if (vals.length === 0) return true;
        return vals.includes(String(p[f as keyof Product] || ''));
      });
    });
    return Array.from(new Set(filtered.map(p => String(p[field] || '')).filter(Boolean))).sort();
  };

  const uniqueDevices = React.useMemo(() => getUniqueValues('device', {
    projectName: filterProjectNames,
    nickname: filterNicknames,
    changeKitGroup: filterChangeKitGroups,
    lbGroup: filterLBGroups
  }), [products, filterProjectNames, filterNicknames, filterChangeKitGroups, filterLBGroups]);

  const uniqueProjectNames = React.useMemo(() => getUniqueValues('projectName', {
    device: filterDevices,
    nickname: filterNicknames,
    changeKitGroup: filterChangeKitGroups,
    lbGroup: filterLBGroups
  }), [products, filterDevices, filterNicknames, filterChangeKitGroups, filterLBGroups]);

  const uniqueNicknames = React.useMemo(() => getUniqueValues('nickname', {
    device: filterDevices,
    projectName: filterProjectNames,
    changeKitGroup: filterChangeKitGroups,
    lbGroup: filterLBGroups
  }), [products, filterDevices, filterProjectNames, filterChangeKitGroups, filterLBGroups]);

  const uniqueChangeKitGroups = React.useMemo(() => getUniqueValues('changeKitGroup', {
    device: filterDevices,
    projectName: filterProjectNames,
    nickname: filterNicknames,
    lbGroup: filterLBGroups
  }), [products, filterDevices, filterProjectNames, filterNicknames, filterLBGroups]);

  const uniqueLBGroups = React.useMemo(() => getUniqueValues('lbGroup', {
    device: filterDevices,
    projectName: filterProjectNames,
    nickname: filterNicknames,
    changeKitGroup: filterChangeKitGroups
  }), [products, filterDevices, filterProjectNames, filterNicknames, filterChangeKitGroups]);

  const filteredProducts = React.useMemo(() => {
    let result = products.filter(p => {
      const searchStr = [
        p.device, p.facility, p.projectName, p.nickname, p.tester, p.handler,
        p.temperature, p.insertion, p.siteNumber, p.ballCountDevice,
        p.changeKitGroup, p.kitName1, p.kitName2, p.kitName3, p.kitName4,
        p.lbGroup, p.socketName1, p.socketName2
      ].join(' ').toLowerCase();
      const matchSearch = !debouncedSearchTerm || searchStr.includes(debouncedSearchTerm.toLowerCase());
      
      const matchDevice = filterDevices.length === 0 || filterDevices.includes(String(p.device || ''));
      const matchProjectName = filterProjectNames.length === 0 || filterProjectNames.includes(String(p.projectName || ''));
      const matchNickname = filterNicknames.length === 0 || filterNicknames.includes(String(p.nickname || ''));
      const matchChangeKitGroup = filterChangeKitGroups.length === 0 || filterChangeKitGroups.includes(String(p.changeKitGroup || ''));
      const matchLBGroup = filterLBGroups.length === 0 || filterLBGroups.includes(String(p.lbGroup || ''));

      return matchSearch && matchDevice && matchProjectName && matchNickname && matchChangeKitGroup && matchLBGroup;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key as keyof Product] || '');
        const bValue = String(b[sortConfig.key as keyof Product] || '');
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, debouncedSearchTerm, filterDevices, filterProjectNames, filterNicknames, filterChangeKitGroups, filterLBGroups, sortConfig]);

  const allColumns = [
    { key: 'facility', label: t('productInfo.columns.facility') },
    { key: 'device', label: t('productInfo.columns.device') },
    { key: 'projectName', label: t('productInfo.columns.projectName') },
    { key: 'nickname', label: t('productInfo.columns.nickname') },
    { key: 'tester', label: t('productInfo.columns.tester') },
    { key: 'handler', label: t('productInfo.columns.handler') },
    { key: 'temperature', label: t('productInfo.columns.temperature') },
    { key: 'insertion', label: t('productInfo.columns.insertion') },
    { key: 'siteNumber', label: t('productInfo.columns.siteNumber') },
    { key: 'ballCountDevice', label: t('productInfo.columns.ballCountDevice') },
    { key: 'changeKitGroup', label: t('productInfo.columns.changeKitGroup') },
    { key: 'kitName1', label: t('productInfo.columns.kitName1') },
    { key: 'kitName2', label: t('productInfo.columns.kitName2') },
    { key: 'kitName3', label: t('productInfo.columns.kitName3') },
    { key: 'kitName4', label: t('productInfo.columns.kitName4') },
    { key: 'kitName5', label: t('productInfo.columns.kitName5') },
    { key: 'kitName6', label: t('productInfo.columns.kitName6') },
    { key: 'lbGroup', label: t('productInfo.columns.lbGroup') },
    { key: 'socketName1', label: t('productInfo.columns.socketName1') },
    { key: 'socketName2', label: t('productInfo.columns.socketName2') },
  ];

  const columns = allColumns.filter(col => visibleColumns.includes(col.key));

  const missingLifeTimeData = React.useMemo(() => {
    if (viewMode !== 'missingLifeTime') return [];
    
    const missing: {
      id: string;
      facility: string;
      device: string;
      insertion: string;
      socketName: string;
      socketType: 'Socket 1' | 'Socket 2';
    }[] = [];

    products.forEach(p => {
      // Check socketName1
      if (p.socketName1) {
        const names1 = p.socketName1.split(',').map(s => s.trim()).filter(Boolean);
        names1.forEach(name => {
          const related = lifeTimesData.filter(lt => {
            const ltGroups = (lt.socketGroup || '').split(',').map((s: string) => s.trim());
            return ltGroups.includes(name);
          });
          if (related.length === 0) {
            missing.push({
              id: `${p.id}-1-${name}`,
              facility: p.facility || '-',
              device: p.device || '-',
              insertion: p.insertion || '-',
              socketName: name,
              socketType: 'Socket 1'
            });
          }
        });
      }
      
      // Check socketName2
      if (p.socketName2) {
        const names2 = p.socketName2.split(',').map(s => s.trim()).filter(Boolean);
        names2.forEach(name => {
          const related = lifeTimesData.filter(lt => {
            const ltGroups = (lt.socketGroup || '').split(',').map((s: string) => s.trim());
            return ltGroups.includes(name);
          });
          if (related.length === 0) {
            missing.push({
              id: `${p.id}-2-${name}`,
              facility: p.facility || '-',
              device: p.device || '-',
              insertion: p.insertion || '-',
              socketName: name,
              socketType: 'Socket 2'
            });
          }
        });
      }
    });

    return missing;
  }, [products, lifeTimesData, viewMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-4xl italic text-zinc-900 tracking-tight">{t('productInfo.title')}</h2>
            <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">{t('productInfo.subtitle')}</p>
          </div>
          <div className="flex gap-2 bg-zinc-100/80 p-1.5 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('inventory')}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                viewMode === 'inventory' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
              )}
            >
              {t('productInfo.tabInventory')}
            </button>
            <button
              onClick={() => setViewMode('missingLifeTime')}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                viewMode === 'missingLifeTime' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
              )}
            >
              {t('productInfo.tabMissingLT')}
            </button>
          </div>
        </div>
        {viewMode === 'inventory' && (
          <div className="flex items-center gap-2 flex-wrap mb-2 sm:mb-0">
            <button
              onClick={() => exportToExcel(filteredProducts, columns, 'products')}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>{t('common.exportExcel')}</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setEditingId('new')}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>{t('productInfo.addProduct')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {viewMode === 'inventory' ? (
        <>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between surface-card p-2">
            <div className="flex flex-wrap items-center gap-2 flex-1 w-full lg:w-auto pb-2 lg:pb-0">
              <div className="flex items-center gap-1.5 px-2">
                <Filter className="h-3.5 w-3.5 text-zinc-400" />
                <button
                  onClick={() => {
                    setFilterDevices([]);
                    setFilterProjectNames([]);
                    setFilterNicknames([]);
                    setFilterChangeKitGroups([]);
                    setFilterLBGroups([]);
                  }}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap"
                >
                  {t('sharedTable.clearFilters')}
                </button>
                <SavedViewsPanel
                  views={savedViews}
                  onSave={(name) => saveView(name, { filterDevices, filterProjectNames, filterNicknames, filterChangeKitGroups, filterLBGroups })}
                  onApply={(filters) => {
                    const f = filters as { filterDevices?: string[]; filterProjectNames?: string[]; filterNicknames?: string[]; filterChangeKitGroups?: string[]; filterLBGroups?: string[] };
                    setFilterDevices(f.filterDevices ?? []);
                    setFilterProjectNames(f.filterProjectNames ?? []);
                    setFilterNicknames(f.filterNicknames ?? []);
                    setFilterChangeKitGroups(f.filterChangeKitGroups ?? []);
                    setFilterLBGroups(f.filterLBGroups ?? []);
                  }}
                  onDelete={deleteView}
                />
              </div>
              <div className="w-px h-4 bg-zinc-200 shrink-0"></div>
              <div className="flex flex-wrap items-center gap-2 px-1">
                <MultiSelectDropdown
                  values={filterDevices}
                  onChange={setFilterDevices}
                  options={uniqueDevices}
                  placeholder={t('productInfo.filters.devices')}
                />
                <MultiSelectDropdown
                  values={filterProjectNames}
                  onChange={setFilterProjectNames}
                  options={uniqueProjectNames}
                  placeholder={t('productInfo.filters.projects')}
                />
                <MultiSelectDropdown
                  values={filterNicknames}
                  onChange={setFilterNicknames}
                  options={uniqueNicknames}
                  placeholder={t('productInfo.filters.nicknames')}
                />
                <MultiSelectDropdown
                  values={filterChangeKitGroups}
                  onChange={setFilterChangeKitGroups}
                  options={uniqueChangeKitGroups}
                  placeholder={t('productInfo.filters.kitGroups')}
                />
                <MultiSelectDropdown
                  values={filterLBGroups}
                  onChange={setFilterLBGroups}
                  options={uniqueLBGroups}
                  placeholder={t('productInfo.filters.lbGroups')}
                />
                <div className="w-px h-4 bg-zinc-200 shrink-0 mx-1"></div>
                <MultiSelectDropdown
                  values={allColumns.filter(c => visibleColumns.includes(c.key)).map(c => c.label)}
                  onChange={(labels) => {
                    const keys = allColumns.filter(c => labels.includes(c.label)).map(c => c.key);
                    setVisibleColumns(keys);
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
                placeholder={t('productInfo.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-zinc-100 bg-zinc-50/50 pl-10 pr-4 py-2 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          {isMobile ? (
            <div className="space-y-2.5">
              {filteredProducts.map((product, idx) => {
                const isExpanded = expandedCardId === product.id;
                return (
                  <div key={product.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                    <div
                      className="w-full text-left p-4 cursor-pointer"
                      onClick={() => setExpandedCardId(isExpanded ? null : product.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">{product.facility}</span>
                            {product.temperature && <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">{product.temperature}</span>}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedDevice(product.device); }}
                            className="font-bold text-brand-primary text-base truncate max-w-full text-left hover:underline"
                          >
                            {product.device}
                          </button>
                          <p className="text-sm text-zinc-500 truncate">{product.projectName}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                            {product.tester && <span>Tester: <span className="font-medium text-zinc-600">{product.tester}</span></span>}
                            {product.handler && <span>Handler: <span className="font-medium text-zinc-600">{product.handler}</span></span>}
                          </div>
                        </div>
                        <ChevronRight className={cn('h-4 w-4 text-zinc-300 shrink-0 mt-1 transition-transform', isExpanded && 'rotate-90')} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-zinc-50 pt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          {[
                            { label: 'Insertion', value: product.insertion },
                            { label: 'Site No.', value: product.siteNumber },
                            { label: 'Ball Count', value: product.ballCountDevice },
                            { label: 'Nickname', value: product.nickname },
                            { label: 'CK Group', value: product.changeKitGroup },
                            { label: 'LB Group', value: product.lbGroup },
                            { label: 'Socket 1', value: product.socketName1 },
                            { label: 'Socket 2', value: product.socketName2 },
                            { label: 'Kit 1', value: product.kitName1 },
                            { label: 'Kit 2', value: product.kitName2 },
                          ].filter(f => f.value).map(f => (
                            <div key={f.label}>
                              <p className="text-zinc-400 text-[10px] uppercase tracking-wide">{f.label}</p>
                              <p className="font-medium text-zinc-700 truncate">{f.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-zinc-50 space-y-2">
                          <button
                            onClick={() => setSelectedDevice(product.device)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-primary/10 text-brand-primary text-xs font-bold hover:bg-brand-primary/20 transition-colors"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            {t('productInfo.viewToolingDetails') || 'Socket / Kit / Load Board 詳情'}
                          </button>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <button onClick={() => setEditingId(product.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-bold hover:bg-zinc-200 transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />{t('common.edit') || 'Edit'}
                              </button>
                              <button onClick={() => setModal({ isOpen: true, id: product.id })} className="flex items-center justify-center p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="text-center py-16 text-zinc-400">
                  <Download className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">{t('sharedTable.noResults')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="relative overflow-hidden surface-card">
              <DoubleScrollbar>
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      {isAdmin && (
                        <th className="px-4 py-4 border-b border-zinc-100 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                            checked={isAllSelected(filteredProducts.slice(0, displayCount).map(x => x.id))}
                            onChange={() => toggleAll(filteredProducts.slice(0, displayCount).map(x => x.id))}
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
                                onChange={(e) => setNewProduct({ ...newProduct, [col.key]: e.target.value })}
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
                      {filteredProducts.slice(0, displayCount).map((product, idx) => (
                        <ProductRow
                          key={product.id}
                          product={product}
                          idx={idx}
                          columns={columns}
                          isAdmin={isAdmin}
                          editingId={editingId}
                          setEditingId={setEditingId}
                          handleUpdate={handleUpdate}
                          setModal={setModal}
                          setSelectedDevice={setSelectedDevice}
                          setSaveModal={setSaveModal}
                          handleDuplicate={handleDuplicate}
                          isSelected={selectedIds.has(product.id)}
                          onToggle={() => toggleOne(product.id)}
                        />
                      ))}
                    </AnimatePresence>
                    {filteredProducts.length > displayCount && (
                      <tr>
                        <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                          {t('sharedTable.showingSubset', { displayCount, total: filteredProducts.length })}
                          <button onClick={() => setDisplayCount(prev => prev + 200)} className="text-brand-primary hover:underline font-medium not-italic">{t('productInfo.load200More')}</button>.
                        </td>
                      </tr>
                    )}
                    {displayCount > 100 && filteredProducts.length <= displayCount && (
                      <tr>
                        <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                          {t('sharedTable.showingAll', { total: filteredProducts.length })}
                          <button onClick={() => setDisplayCount(100)} className="text-brand-primary hover:underline font-medium not-italic">{t('sharedTable.showLess')}</button>.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </DoubleScrollbar>
            </div>
          )}
        </>
      ) : (
        <div className="surface-card p-6">
          <div className="mb-6 space-y-1">
            <h3 className="text-xl font-bold text-zinc-900">{t('productInfo.missingLTTitle')}</h3>
            <p className="text-sm text-zinc-500">{t('productInfo.missingLTDesc')}</p>
          </div>
          {missingLifeTimeData.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50">
              <Check className="mx-auto h-8 w-8 text-emerald-500 mb-3" />
              <div className="text-sm font-medium text-zinc-900">{t('productInfo.allGood')}</div>
              <div className="text-xs text-zinc-500 mt-1">{t('productInfo.noMissingLT')}</div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200">
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">{t('productInfo.columns.facility')}</th>
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">{t('productInfo.columns.device')}</th>
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">{t('productInfo.columns.insertion')}</th>
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">{t('productInfo.columns.socketName1').replace('1','')}</th>
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">{t('productInfo.columns.socketType')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {missingLifeTimeData.map((item, idx) => (
                    <tr key={item.id} className={cn("hover:bg-zinc-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-zinc-50/30")}>
                      <td className="px-6 py-3 text-zinc-900">{item.facility}</td>
                      <td className="px-6 py-3 font-bold text-brand-primary">
                        <button onClick={() => setSelectedDevice(item.device)} className="hover:underline">{item.device}</button>
                      </td>
                      <td className="px-6 py-3 text-zinc-600">{item.insertion}</td>
                      <td className="px-6 py-3 text-rose-600 font-medium">{item.socketName}</td>
                      <td className="px-6 py-3 text-zinc-500 text-xs">{item.socketType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                {t('productInfo.deleteWarning')}
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

      <BulkActionBar count={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} />

      {/* Mobile FAB */}
      {isMobile && isAdmin && viewMode === 'inventory' && (
        <button
          onClick={() => setEditingId('new')}
          className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-brand-primary text-white shadow-xl shadow-brand-primary/30 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Device Details Modal */}
      <AnimatePresence>
        {selectedDevice && (
          <DeviceDetailsModal
            device={selectedDevice}
            products={products.filter(p => p.device === selectedDevice)}
            onClose={() => setSelectedDevice(null)}
            onNavigate={onNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DeviceDetailsModal({ device, products, onClose, onNavigate }: { device: string, products: Product[], onClose: () => void, onNavigate?: (tab: string) => void }) {
  const { t } = useTranslation();
  const { sockets: socketsData, changeKits: kitsData, loadBoards: loadBoardsData, lifeTimes: lifeTimesData, loading } = useData();

  const insertions = Array.from(new Set(products.map(p => p.insertion).filter(Boolean)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-[2rem] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 p-6">
          <div className="space-y-1">
            <h3 className="text-2xl font-serif italic text-zinc-900">Device: {device}</h3>
            <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Insertion Details & Tooling Counts</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {insertions.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No insertions found for this device.</p>
              ) : (
                insertions.map(insertion => {
                  const insertionProducts = products.filter(p => p.insertion === insertion);
                  
                  const socket1Names = Array.from(new Set(
                    insertionProducts.flatMap(p => (p.socketName1 || '').split(',').map(s => s.trim()).filter(Boolean))
                  ));
                  const socket2Names = Array.from(new Set(
                    insertionProducts.flatMap(p => (p.socketName2 || '').split(',').map(s => s.trim()).filter(Boolean))
                  ));

                  const matchingSocket = socket1Names.length > 0
                    ? socketsData.find(s => {
                        const sGroups = (s.socketGroupPin1 || '').split(',').map((sg: string) => sg.trim());
                        return socket1Names.some(name => sGroups.includes(name));
                      })
                    : undefined;
                  const packageType = matchingSocket?.package;
                  const packageSize = matchingSocket?.packageSize;
                  const kitGroups = new Set(
                    insertionProducts.flatMap(p => (p.changeKitGroup || '').split(',').map(s => s.trim()).filter(Boolean))
                  );
                  const lbGroups = new Set(
                    insertionProducts.flatMap(p => (p.lbGroup || '').split(',').map(s => s.trim()).filter(Boolean))
                  );

                  return (
                    <div key={insertion} className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5">
                      <div className="flex items-center justify-between mb-4 gap-4">
                        <h4 className="text-lg font-bold text-zinc-900">{insertion}</h4>
                        <div className="flex items-center gap-3 shrink-0">
                          {packageType && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-zinc-400 font-medium uppercase tracking-wider">Package:</span>
                              <span className="font-semibold text-zinc-700">{packageType}</span>
                            </div>
                          )}
                          {packageSize && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-zinc-400 font-medium uppercase tracking-wider">Size:</span>
                              <span className="font-semibold text-zinc-700">{packageSize}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Sockets</div>
                          <div className="space-y-3">
                            {socket1Names.map(name => {
                              const count = socketsData.filter(s => {
                                const fac = (s.facility || '').trim().toUpperCase();
                                const loc = (s.location || '').trim().toUpperCase();
                                const sGroups = (s.socketGroupPin1 || '').split(',').map((s: string) => s.trim());
                                return fac === loc && loc && sGroups.includes(name);
                              }).length;
                              const relatedLifeTimes = lifeTimesData.filter(lt => {
                                const ltGroups = (lt.socketGroup || '').split(',').map((s: string) => s.trim());
                                return ltGroups.includes(name);
                              });
                              return (
                                <div key={`s1-${name}`} className="flex flex-col gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <button 
                                      onClick={() => {
                                        window.localStorage.setItem('socketInfo_filterSocketGroups', JSON.stringify([name]));
                                        onClose();
                                        onNavigate?.('socket');
                                      }}
                                      className="text-sm font-medium text-zinc-700 hover:text-brand-primary hover:underline break-words text-left" 
                                      title={name}
                                    >
                                      {name} <span className="text-xs text-zinc-400 font-normal whitespace-nowrap">(Name1)</span>
                                    </button>
                                    <span className="text-lg font-light text-brand-primary shrink-0 mt-0.5">{count}</span>
                                  </div>
                                  {relatedLifeTimes.length > 0 && (
                                    <div className="space-y-2 mt-1">
                                      {relatedLifeTimes.map((lt, idx) => (
                                        <div key={idx} className="bg-zinc-50/80 rounded p-2 text-[11px] space-y-1 border border-zinc-100">
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Pogo Pin:</span>
                                            {lt.pogoPin1Pn ? (
                                              <button 
                                                onClick={() => {
                                                  window.localStorage.setItem('pogoPinInfo_filterPinPns', JSON.stringify([lt.pogoPin1Pn]));
                                                  onClose();
                                                  onNavigate?.('pogo-pin');
                                                }}
                                                className="font-medium text-zinc-900 hover:text-brand-primary hover:underline text-left text-right break-words max-w-[120px]"
                                              >
                                                {lt.pogoPin1Pn}
                                              </button>
                                            ) : (
                                              <span className="font-medium text-zinc-900">-</span>
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Req Q'ty:</span>
                                            <span className="font-medium text-zinc-900">{lt.pogoPinQty || '-'}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Life Time:</span>
                                            <span className="font-medium text-zinc-900">{lt.lifeTime || '-'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {socket2Names.map(name => {
                              const count = socketsData.filter(s => {
                                const fac = (s.facility || '').trim().toUpperCase();
                                const loc = (s.location || '').trim().toUpperCase();
                                const sGroups = (s.socketGroupPin1 || '').split(',').map((s: string) => s.trim());
                                return fac === loc && loc && sGroups.includes(name);
                              }).length;
                              const relatedLifeTimes = lifeTimesData.filter(lt => {
                                const ltGroups = (lt.socketGroup || '').split(',').map((s: string) => s.trim());
                                return ltGroups.includes(name);
                              });
                              return (
                                <div key={`s2-${name}`} className="flex flex-col gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <button 
                                      onClick={() => {
                                        window.localStorage.setItem('socketInfo_filterSocketGroups', JSON.stringify([name]));
                                        onClose();
                                        onNavigate?.('socket');
                                      }}
                                      className="text-sm font-medium text-zinc-700 hover:text-brand-primary hover:underline break-words text-left" 
                                      title={name}
                                    >
                                      {name} <span className="text-xs text-zinc-400 font-normal whitespace-nowrap">(Name2)</span>
                                    </button>
                                    <span className="text-lg font-light text-brand-primary shrink-0 mt-0.5">{count}</span>
                                  </div>
                                  {relatedLifeTimes.length > 0 && (
                                    <div className="space-y-2 mt-1">
                                      {relatedLifeTimes.map((lt, idx) => (
                                        <div key={idx} className="bg-zinc-50/80 rounded p-2 text-[11px] space-y-1 border border-zinc-100">
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Pogo Pin:</span>
                                            {lt.pogoPin1Pn ? (
                                              <button 
                                                onClick={() => {
                                                  window.localStorage.setItem('pogoPinInfo_filterPinPns', JSON.stringify([lt.pogoPin1Pn]));
                                                  onClose();
                                                  onNavigate?.('pogo-pin');
                                                }}
                                                className="font-medium text-zinc-900 hover:text-brand-primary hover:underline text-left text-right break-words max-w-[120px]"
                                              >
                                                {lt.pogoPin1Pn}
                                              </button>
                                            ) : (
                                              <span className="font-medium text-zinc-900">-</span>
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Req Q'ty:</span>
                                            <span className="font-medium text-zinc-900">{lt.pogoPinQty || '-'}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Life Time:</span>
                                            <span className="font-medium text-zinc-900">{lt.lifeTime || '-'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {socket1Names.length === 0 && socket2Names.length === 0 && (
                              <div className="text-2xl font-light text-brand-primary">0</div>
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Change Kits</div>
                          <div className="space-y-3">
                            {Array.from(kitGroups).map(name => {
                              const count = kitsData.filter(k => {
                                const fac = (k.facility || '').trim().toUpperCase();
                                const loc = (k.location || '').trim().toUpperCase();
                                const kGroups = (k.changeKitGroup || '').split(',').map((s: string) => s.trim());
                                return fac === loc && loc && kGroups.includes(name);
                              }).length;
                              return (
                                <div key={`kit-${name}`} className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <button 
                                    onClick={() => {
                                      window.localStorage.setItem('changeKitInfo_filterChangeKitGroups', JSON.stringify([name]));
                                      onClose();
                                      onNavigate?.('change-kit');
                                    }}
                                    className="text-sm font-medium text-zinc-700 hover:text-brand-primary hover:underline break-words text-left" 
                                    title={name}
                                  >
                                    {name}
                                  </button>
                                  <span className="text-lg font-light text-brand-primary shrink-0 mt-0.5">{count}</span>
                                </div>
                              );
                            })}
                            {kitGroups.size === 0 && (
                              <div className="text-2xl font-light text-brand-primary">0</div>
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Load Boards</div>
                          <div className="space-y-3">
                            {Array.from(lbGroups).map(name => {
                              const count = loadBoardsData.filter(lb => {
                                const fac = (lb.facility || '').trim().toUpperCase();
                                const loc = (lb.location || '').trim().toUpperCase();
                                const lGroups = (lb.lbGroup || '').split(',').map((s: string) => s.trim());
                                return fac === loc && loc && lGroups.includes(name);
                              }).length;
                              return (
                                <div key={`lb-${name}`} className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <button 
                                    onClick={() => {
                                      window.localStorage.setItem('lbInfo_filterLBGroups', JSON.stringify([name]));
                                      onClose();
                                      onNavigate?.('load-board');
                                    }}
                                    className="text-sm font-medium text-zinc-700 hover:text-brand-primary hover:underline break-words text-left" 
                                    title={name}
                                  >
                                    {name}
                                  </button>
                                  <span className="text-lg font-light text-brand-primary shrink-0 mt-0.5">{count}</span>
                                </div>
                              );
                            })}
                            {lbGroups.size === 0 && (
                              <div className="text-2xl font-light text-brand-primary">0</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
