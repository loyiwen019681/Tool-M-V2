import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import {
  Package, Plus, Trash2, Edit2, Download, Search,
  Check, X, ChevronDown, FolderPlus, Copy, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useFacilityFilter } from '../lib/useFacilityFilter';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { cn } from '../lib/utils';

const DEFAULT_CATEGORIES = ['Pogo pin', 'Socket', 'Socket Parts', 'Change Kit', 'Test Board'];
const STATUS_OPTIONS = ['Wait', 'Confirming', 'Wait ETA', 'Done'] as const;
type Status = typeof STATUS_OPTIONS[number];

const STATUS_STYLE: Record<string, string> = {
  'Wait':       'bg-zinc-100 text-zinc-600',
  'Confirming': 'bg-amber-100 text-amber-700',
  'Wait ETA':   'bg-blue-100 text-blue-700',
  'Done':       'bg-emerald-100 text-emerald-700',
};

// xlsx-js-style color for each status
const STATUS_FILL: Record<string, string> = {
  'Wait':       'D4D4D8',
  'Confirming': 'FDE68A',
  'Wait ETA':   'BFDBFE',
  'Done':       'A7F3D0',
};

const thin = { style: 'thin', color: { rgb: 'D4D4D8' } };

interface SparePart {
  id: string;
  facility: string;
  category: string;
  productName: string;
  partsNo: string;
  qty: string;
  status: Status;
  eta: string;
  remark: string;
  createdAt?: any;
}

interface FormData {
  category: string;
  productName: string;
  partsNo: string;
  qty: string;
  status: Status;
  eta: string;
  remark: string;
}

const EMPTY_FORM: FormData = {
  category: '',
  productName: '',
  partsNo: '',
  qty: '',
  status: 'Wait',
  eta: '',
  remark: '',
};

interface SparePartTrackingProps {
  selectedFacility: string;
  isAdmin: boolean;
}

function styledCell(v: any, extra: any = {}) {
  return { v, t: typeof v === 'number' ? 'n' : 's', s: extra };
}

export default function SparePartTracking({ selectedFacility, isAdmin }: SparePartTrackingProps) {
  const { t } = useTranslation();
  const [allParts, setAllParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Modals / state
  const [addModal, setAddModal] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [addCategoryModal, setAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [statusDropdown, setStatusDropdown] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'spareParts'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SparePart[];
      setAllParts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const facilityParts = useFacilityFilter(allParts, selectedFacility);

  const allCategories = useMemo(() => {
    const fromData = facilityParts.map(p => p.category).filter(Boolean);
    return [...new Set([...DEFAULT_CATEGORIES, ...customCategories, ...fromData])];
  }, [facilityParts, customCategories]);

  useEffect(() => {
    if (!allCategories.includes(selectedCategory)) {
      setSelectedCategory(allCategories[0] || DEFAULT_CATEGORIES[0]);
    }
  }, [allCategories, selectedCategory]);

  const categoryParts = useMemo(() => {
    return facilityParts.filter(p => p.category === selectedCategory);
  }, [facilityParts, selectedCategory]);

  const filteredParts = useMemo(() => {
    return categoryParts.filter(p => {
      const searchStr = [
        p.facility, p.category, p.productName, p.partsNo, p.qty, p.status, p.eta, p.remark
      ].join(' ').toLowerCase();
      const matchSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus.length === 0 || filterStatus.includes(p.status);
      return matchSearch && matchStatus;
    });
  }, [categoryParts, searchTerm, filterStatus]);

  // ── Add / Edit ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ ...EMPTY_FORM, category: selectedCategory });
    setFormError('');
    setAddModal(true);
  };

  const openEdit = (part: SparePart) => {
    setForm({
      category: part.category,
      productName: part.productName,
      partsNo: part.partsNo,
      qty: part.qty,
      status: part.status,
      eta: part.eta,
      remark: part.remark,
    });
    setFormError('');
    setEditingPart(part);
  };

  const handleSave = useCallback(async () => {
    if (!form.productName.trim() && !form.partsNo.trim()) {
      setFormError(t('sparePartTracking.errorRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        facility: selectedFacility === 'ALL' ? 'ALL' : selectedFacility,
        category: form.category || selectedCategory,
        productName: form.productName.trim(),
        partsNo: form.partsNo.trim(),
        qty: form.qty,
        status: form.status,
        eta: form.eta,
        remark: form.remark.trim(),
      };
      if (editingPart) {
        await updateDoc(doc(db, 'spareParts', editingPart.id), payload);
        setEditingPart(null);
      } else {
        await addDoc(collection(db, 'spareParts'), { ...payload, createdAt: serverTimestamp() });
        setAddModal(false);
      }
      setForm(EMPTY_FORM);
    } catch {
      setFormError(t('sparePartTracking.errorSave'));
    } finally {
      setSaving(false);
    }
  }, [form, editingPart, selectedCategory, selectedFacility, t]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteModal.id) return;
    try { await deleteDoc(doc(db, 'spareParts', deleteModal.id)); } catch { /* ignore */ }
    setDeleteModal({ open: false, id: null });
  }, [deleteModal.id]);

  // ── Quick copy ───────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async (part: SparePart) => {
    await addDoc(collection(db, 'spareParts'), {
      facility: part.facility,
      category: part.category,
      productName: part.productName,
      partsNo: part.partsNo,
      qty: part.qty,
      status: part.status,
      eta: part.eta,
      remark: part.remark,
      createdAt: serverTimestamp(),
    });
  }, []);

  // ── Category ─────────────────────────────────────────────────────────────────
  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name || allCategories.includes(name)) return;
    setCustomCategories(prev => [...prev, name]);
    setSelectedCategory(name);
    setNewCategoryName('');
    setAddCategoryModal(false);
  };

  // ── Import ───────────────────────────────────────────────────────────────────
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      let currentCategory = '';
      const toImport: Omit<SparePart, 'id'>[] = [];

      for (const row of rows) {
        if (!row.length) continue;
        const first = String(row[0] ?? '').trim();
        if (!first) continue;

        // Category header: only first cell non-empty, rest blank, and not "Item"
        const restEmpty = row.slice(1).every(c => c === '' || c == null);
        if (restEmpty && isNaN(Number(first)) && first !== 'Item') {
          currentCategory = first;
          continue;
        }
        // Column header row
        if (first === 'Item') continue;
        // Data row: first cell is numeric and we have a category
        if (!isNaN(Number(first)) && currentCategory) {
          const etaRaw = row[5];
          let etaStr = '';
          if (etaRaw instanceof Date) {
            etaStr = etaRaw.toISOString().split('T')[0];
          } else if (typeof etaRaw === 'number' && etaRaw > 0) {
            // Excel serial date → JS Date
            const d = new Date(Math.round((etaRaw - 25569) * 86400 * 1000));
            etaStr = d.toISOString().split('T')[0];
          } else if (etaRaw) {
            etaStr = String(etaRaw);
          }

          const status = String(row[4] ?? '').trim() as Status;
          toImport.push({
            facility: selectedFacility === 'ALL' ? 'ALL' : selectedFacility,
            category: currentCategory,
            productName: String(row[1] ?? '').trim(),
            partsNo: String(row[2] ?? '').trim(),
            qty: String(row[3] ?? ''),
            status: STATUS_OPTIONS.includes(status as any) ? status : 'Wait',
            eta: etaStr,
            remark: String(row[6] ?? '').trim(),
          });
        }
      }

      for (const part of toImport) {
        await addDoc(collection(db, 'spareParts'), { ...part, createdAt: serverTimestamp() });
      }
      setImportResult(t('sparePartTracking.importSuccess', { count: toImport.length }));
    } catch {
      setImportResult(t('sparePartTracking.importError'));
    } finally {
      setImporting(false);
    }
  }, [selectedFacility, t]);

  // ── Export shared styles / builder ──────────────────────────────────────────
  const buildExportStyles = () => {
    const border = { top: thin, bottom: thin, left: thin, right: thin };
    const catRowStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
      fill: { patternType: 'solid', fgColor: { rgb: '4472C4' } },
      alignment: { vertical: 'center', horizontal: 'left' },
      border,
    };
    const headerStyle = {
      font: { bold: true, sz: 10 },
      fill: { patternType: 'solid', fgColor: { rgb: 'D9E1F2' } },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: false },
      border,
    };
    const headerRightStyle = { ...headerStyle, alignment: { ...headerStyle.alignment, horizontal: 'right' } };
    const dataStyle = {
      font: { sz: 10 },
      alignment: { vertical: 'center', horizontal: 'left' },
      border,
    };
    const dataRightStyle = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'right' } };
    return { catRowStyle, headerStyle, headerRightStyle, dataStyle, dataRightStyle };
  };

  const buildSheet = (parts: SparePart[]) => {
    const { catRowStyle, headerStyle, headerRightStyle, dataStyle, dataRightStyle } = buildExportStyles();
    const sheetData: any[][] = [];
    const merges: any[] = [];
    let rowIndex = 0;

    const colHeaders = [
      styledCell('Item', headerStyle),
      styledCell('Product Name', headerStyle),
      styledCell('Parts No.', headerStyle),
      styledCell("Q'ty", headerRightStyle),
      styledCell('Status', headerStyle),
      styledCell('ETA', headerStyle),
      styledCell('Remark', headerStyle),
    ];

    if (parts.length === 0) {
      sheetData.push(colHeaders);
    } else {
      const categories = [...new Set(parts.map(p => p.category))];
      categories.forEach(cat => {
        const rows = parts.filter(p => p.category === cat);

        sheetData.push(Array.from({ length: 7 }, (_, c) => styledCell(c === 0 ? cat : '', catRowStyle)));
        merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 6 } });
        rowIndex++;

        sheetData.push(colHeaders);
        rowIndex++;

        rows.forEach((p, i) => {
          const statusFill = STATUS_FILL[p.status] || 'FFFFFF';
          const statusCellStyle = {
            ...dataStyle,
            fill: { patternType: 'solid', fgColor: { rgb: statusFill } },
            alignment: { vertical: 'center', horizontal: 'center' },
          };
          const rowBg = i % 2 === 1 ? { patternType: 'solid', fgColor: { rgb: 'F4F4F5' } } : undefined;
          const rs = rowBg ? { ...dataStyle, fill: rowBg } : dataStyle;
          const rsr = rowBg ? { ...dataRightStyle, fill: rowBg } : dataRightStyle;
          sheetData.push([
            styledCell(i + 1, { ...rs, alignment: { vertical: 'center', horizontal: 'center' } }),
            styledCell(p.productName, rs),
            styledCell(p.partsNo, rs),
            styledCell(p.qty !== '' && p.qty !== null ? Number(p.qty) || p.qty : '', rsr),
            styledCell(p.status, statusCellStyle),
            styledCell(p.eta, { ...rs, alignment: { vertical: 'center', horizontal: 'center' } }),
            styledCell(p.remark, rs),
          ]);
          rowIndex++;
        });

        sheetData.push(Array(7).fill(styledCell('')));
        rowIndex++;
      });
    }

    const ws = XLSXStyle.utils.aoa_to_sheet(sheetData);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 6 }, { wch: 26 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 35 }];
    ws['!rows'] = sheetData.map((_, i) => merges.some(m => m.s.r === i) ? { hpt: 22 } : { hpt: 18 });
    return ws;
  };

  // ── Export current view ───────────────────────────────────────────────────────
  const handleExport = () => {
    if (filteredParts.length === 0) return;
    const facility = selectedFacility === 'ALL' ? 'All' : selectedFacility;
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, buildSheet(filteredParts), selectedCategory.substring(0, 31));
    XLSXStyle.writeFile(wb, `spare_part_tracking_${facility}_${selectedCategory}.xlsx`);
  };

  // ── Export all facilities (one sheet per facility) ────────────────────────────
  const handleExportAll = () => {
    const wb = XLSXStyle.utils.book_new();

    const cachedFacilities = sessionStorage.getItem('cachedFacilities');
    const knownFacilities: string[] = cachedFacilities ? JSON.parse(cachedFacilities) : [];
    const dataFacilities = [...new Set(allParts.map(p => p.facility || '').filter(Boolean))];
    const allFacilities = [...new Set([...knownFacilities, ...dataFacilities])].sort();

    allFacilities.forEach(facility => {
      const parts = allParts.filter(p => {
        if ((p.facility || '') !== facility) return false;
        const searchStr = [
          p.facility, p.category, p.productName, p.partsNo, p.qty, p.status, p.eta, p.remark
        ].join(' ').toLowerCase();
        const matchSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus.length === 0 || filterStatus.includes(p.status);
        return matchSearch && matchStatus;
      });

      const sheetName = facility.substring(0, 31) || 'Unknown';
      XLSXStyle.utils.book_append_sheet(wb, buildSheet(parts), sheetName);
    });

    if (wb.SheetNames.length === 0) return;
    XLSXStyle.writeFile(wb, `spare_part_tracking_all_facilities.xlsx`);
  };

  const toggleStatusFilter = (s: string) => {
    setFilterStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 border-2 border-zinc-200 border-t-zinc-800 rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-4xl italic text-zinc-900 tracking-tight">{t('sparePartTracking.title')}</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">{t('sparePartTracking.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder={t('sparePartTracking.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-52 rounded-xl border border-zinc-100 bg-zinc-50/50 pl-10 pr-4 py-2 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all shadow-sm"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdown(v => !v)}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors"
            >
              {t('sparePartTracking.status')}
              {filterStatus.length > 0 && (
                <span className="rounded-full bg-zinc-800 text-white text-[10px] px-1.5 py-0.5">{filterStatus.length}</span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {statusDropdown && (
              <div className="absolute right-0 top-full mt-1 z-30 rounded-xl border border-zinc-100 bg-white shadow-lg p-2 min-w-[140px]">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleStatusFilter(s)}
                    className="flex items-center gap-2 w-full rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors"
                  >
                    <span className={cn('h-4 w-4 rounded flex items-center justify-center border', filterStatus.includes(s) ? 'bg-zinc-800 border-zinc-800' : 'border-zinc-300')}>
                      {filterStatus.includes(s) && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    {s}
                  </button>
                ))}
                {filterStatus.length > 0 && (
                  <button onClick={() => setFilterStatus([])} className="w-full mt-1 text-xs text-zinc-400 hover:text-zinc-600 py-1">
                    {t('sparePartTracking.clearFilter')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Import */}
          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {importing ? t('sparePartTracking.importing') : t('sparePartTracking.importExcel')}
              </button>
            </>
          )}

          {/* Export current view */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            {t('sparePartTracking.exportExcel')}
          </button>

          {/* Export all facilities */}
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            {t('sparePartTracking.exportAll')}
          </button>
        </div>
      </div>

      {/* Import result banner */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium',
              importResult.includes('Error') || importResult.includes('失敗') || importResult.includes('エラー')
                ? 'bg-rose-50 text-rose-700'
                : 'bg-emerald-50 text-emerald-700'
            )}
          >
            {importResult}
            <button onClick={() => setImportResult(null)}><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Category Sidebar */}
        <div className="w-full md:w-48 md:shrink-0 flex flex-row overflow-x-auto md:flex-col md:overflow-visible gap-1 md:gap-0 md:space-y-1 pb-1 md:pb-0">
          {allCategories.map(cat => {
            const count = facilityParts.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setSearchTerm(''); setFilterStatus([]); }}
                className={cn(
                  'md:w-full shrink-0 text-left rounded-xl px-3 py-2.5 text-sm font-medium transition-all flex items-center justify-between gap-2',
                  selectedCategory === cat
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                <span className="truncate">{cat}</span>
                <span className={cn('text-[10px] rounded-full px-1.5 py-0.5 font-bold shrink-0',
                  selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
          {isAdmin && (
            <button
              onClick={() => { setNewCategoryName(''); setAddCategoryModal(true); }}
              className="md:w-full shrink-0 text-left rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2 border-2 border-dashed border-zinc-200 md:mt-2"
            >
              <FolderPlus className="h-4 w-4" />
              {t('sparePartTracking.addCategory')}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0 surface-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
            <div>
              <span className="font-semibold text-zinc-800 text-sm">{selectedCategory}</span>
              <span className="ml-2 text-xs text-zinc-400">
                {t('sparePartTracking.itemCount', { count: filteredParts.length })}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('sparePartTracking.addItem')}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 border-b border-zinc-100 w-10">{t('sparePartTracking.colItem')}</th>
                  <th className="px-4 py-3 border-b border-zinc-100">{t('sparePartTracking.colProductName')}</th>
                  <th className="px-4 py-3 border-b border-zinc-100">{t('sparePartTracking.colPartsNo')}</th>
                  <th className="px-4 py-3 border-b border-zinc-100 text-right">{t('sparePartTracking.colQty')}</th>
                  <th className="px-4 py-3 border-b border-zinc-100">{t('sparePartTracking.colStatus')}</th>
                  <th className="px-4 py-3 border-b border-zinc-100">{t('sparePartTracking.colEta')}</th>
                  <th className="px-4 py-3 border-b border-zinc-100">{t('sparePartTracking.colRemark')}</th>
                  {isAdmin && <th className="px-4 py-3 border-b border-zinc-100 w-24"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <AnimatePresence mode="popLayout">
                  {filteredParts.map((part, idx) => (
                    editingPart?.id === part.id ? (
                      <tr key={part.id} className="bg-blue-50/30">
                        <td className="px-4 py-2 text-zinc-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <input
                            className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                            value={form.productName}
                            onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                            value={form.partsNo}
                            onChange={e => setForm(f => ({ ...f, partsNo: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-sm text-right focus:outline-none focus:border-blue-400"
                            value={form.qty}
                            onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:border-blue-400 bg-white"
                            value={form.status}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                            value={form.eta}
                            onChange={e => setForm(f => ({ ...f, eta: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                            value={form.remark}
                            onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setEditingPart(null)} className="p-1.5 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <motion.tr
                        key={part.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-zinc-50/50 transition-colors group"
                      >
                        <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-zinc-900">{part.productName}</td>
                        <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{part.partsNo}</td>
                        <td className="px-4 py-3 text-right font-medium text-zinc-800">
                          {part.qty !== '' && part.qty !== null ? Number(part.qty).toLocaleString() : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold', STATUS_STYLE[part.status] || 'bg-zinc-100 text-zinc-600')}>
                            {part.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 text-xs font-mono whitespace-nowrap">{part.eta}</td>
                        <td className="px-4 py-3 text-zinc-500 text-sm max-w-xs truncate">{part.remark}</td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopy(part)}
                                title={t('sparePartTracking.copy')}
                                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => openEdit(part)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setDeleteModal({ open: true, id: part.id })} className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    )
                  ))}
                </AnimatePresence>
                {filteredParts.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <Package className="h-8 w-8 opacity-20" />
                        <p className="text-sm">{t('sparePartTracking.noItems')}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {addModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setAddModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-4">{t('sparePartTracking.addItemTitle')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{t('sparePartTracking.colCategory')}</label>
                  <select
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {allCategories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{t('sparePartTracking.colProductName')}</label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
                      value={form.productName}
                      onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                      placeholder="e.g. SC1701BH5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{t('sparePartTracking.colPartsNo')}</label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
                      value={form.partsNo}
                      onChange={e => setForm(f => ({ ...f, partsNo: e.target.value }))}
                      placeholder="e.g. AZT-400-25CP-A"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{t('sparePartTracking.colQty')}</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
                      value={form.qty}
                      onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                      placeholder="e.g. 1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{t('sparePartTracking.colStatus')}</label>
                    <select
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{t('sparePartTracking.colEta')}</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
                    value={form.eta}
                    onChange={e => setForm(f => ({ ...f, eta: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{t('sparePartTracking.colRemark')}</label>
                  <textarea
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 resize-none"
                    rows={2}
                    value={form.remark}
                    onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
                  />
                </div>
                {formError && <p className="text-sm text-rose-600">{formError}</p>}
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setAddModal(false)} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                  {t('sparePartTracking.cancel')}
                </button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50">
                  {saving ? t('sparePartTracking.saving') : t('sparePartTracking.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Category Modal */}
      <AnimatePresence>
        {addCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setAddCategoryModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-4">{t('sparePartTracking.addCategoryTitle')}</h3>
              <input
                autoFocus
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
                placeholder={t('sparePartTracking.categoryPlaceholder')}
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setAddCategoryModal(false)} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                  {t('sparePartTracking.cancel')}
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {t('sparePartTracking.addCategory')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-2">{t('sparePartTracking.deleteTitle')}</h3>
              <p className="text-sm text-zinc-500 mb-5">{t('sparePartTracking.deleteConfirm')}</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteModal({ open: false, id: null })} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                  {t('sparePartTracking.cancel')}
                </button>
                <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-rose-600 text-sm font-medium text-white hover:bg-rose-700 transition-colors">
                  {t('sparePartTracking.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {statusDropdown && (
        <div className="fixed inset-0 z-20" onClick={() => setStatusDropdown(false)} />
      )}
    </motion.div>
  );
}
