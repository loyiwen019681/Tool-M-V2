import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Plus, Trash2, FileSpreadsheet, Calculator, List, Table2, Search, Filter, ChevronDown, ChevronRight, ChevronsUpDown, ChevronsDownUp, ArrowUpDown, BarChart2, Info, Clock, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { usePersistentState } from '../lib/usePersistentState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useData } from '../contexts/DataContext';
import { useDebounce } from '../lib/useDebounce';
import { useFacilityFilter } from '../lib/useFacilityFilter';

interface RowData {
  id: string;
  partNo: string;
  qty: number | '';
  remark: string;
  pogoPins: { name: string; need: number }[];
  facility?: string;
}

export default function RequiredPogoPin({ selectedFacility, isAdmin }: { selectedFacility: string; isAdmin?: boolean }) {
  const { t } = useTranslation();
  const { products: allProducts, lifeTimes: allLifeTimes, pogoPins: allPogoPinsData, requiredPogoPinRows: allRows } = useData();

  const products = useFacilityFilter(allProducts, selectedFacility);
  const lifeTimes = useFacilityFilter(allLifeTimes, selectedFacility);
  const pogoPinsData = useFacilityFilter(allPogoPinsData, selectedFacility);

  const [rows, setRows] = useState<RowData[]>([]);
  const [activeTab, setActiveTab] = useState<'input' | 'summary' | 'detailed'>('input');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [detailedSearchTerm, setDetailedSearchTerm] = useState('');
  const debouncedDetailedSearchTerm = useDebounce(detailedSearchTerm, 300);
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const debouncedSummarySearchTerm = useDebounce(summarySearchTerm, 300);
  const [filterPogoPins, setFilterPogoPins] = usePersistentState<string[]>('reqPogoPin_filterPogoPins', []);
  const [filterNicknames, setFilterNicknames] = usePersistentState<string[]>('reqPogoPin_filterNicknames', []);
  const [filterDevices, setFilterDevices] = usePersistentState<string[]>('reqPogoPin_filterDevices', []);
  const [filterInsertions, setFilterInsertions] = usePersistentState<string[]>('reqPogoPin_filterInsertions', []);
  const [filterRequiredQty, setFilterRequiredQty] = usePersistentState<'all' | 'gt0' | 'lte0'>('reqPogoPin_filterRequiredQty', 'all');
  const [visibleColumns, setVisibleColumns] = usePersistentState<string[]>('pogoPin_visibleColumns', [
    'pinName', 'final', 'required', 'onHand', 'nickName', 'device', 'insertion', 'site', 'fcst', 'lifetime', 'reqPinQtyInOneSocket'
  ]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [expandedPins, setExpandedPins] = useState<Record<string, boolean>>({});
  const [lastImportTime, setLastImportTime] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLastImportTime(localStorage.getItem(`fcst_import_timestamp_${selectedFacility}`) || null);
  }, [selectedFacility]);

  useEffect(() => {
    let data = [...allRows];
    if (selectedFacility !== 'ALL') {
      data = data.filter(r => (r.facility || '').trim().toUpperCase() === selectedFacility);
    }
    setRows(data.map(row => calculateRow(row, products, lifeTimes)));
  }, [allRows, selectedFacility, products, lifeTimes]);

  const calculateRow = (row: RowData, prods: any[], lts: any[]): RowData => {
    if (!row.partNo) return { ...row, remark: '', pogoPins: [] };
    
    const deviceProducts = prods.filter(p => (p.device || '').trim().toUpperCase() === row.partNo.trim().toUpperCase());
    
    if (deviceProducts.length === 0) {
      return {
        ...row,
        remark: 'can not find product info',
        pogoPins: []
      };
    }

    const qty = Number(row.qty) || 0;
    const pogoMap: Record<string, number> = {};

    deviceProducts.forEach(product => {
      const processSocket = (socketName: string) => {
        if (!socketName) return;
        const relatedLts = lts.filter(lt => (lt.socketGroup || '').trim().toUpperCase() === socketName.trim().toUpperCase());
        relatedLts.forEach(lt => {
          if (!lt || !lt.lifeTime) return;
          const lifeTime = Number(lt.lifeTime);
          if (lifeTime === 0) return;

          const processPin = (pinName: string, pinQtyStr: string) => {
            if (!pinName || !pinQtyStr) return;
            const pogoQty = Number(pinQtyStr);
            if (!pogoQty) return;
            const need = qty ? Math.ceil((qty / lifeTime) * 1.1 * 1.2 * pogoQty) : 0;
            pogoMap[pinName] = (pogoMap[pinName] || 0) + need;
          };

          processPin(lt.pogoPin1Pn, lt.pogoPinQty);
          processPin(lt.pogoPin2Pn, lt.pogoPin2Qty);
          processPin(lt.pogoPin3Pn, lt.pogoPin3Qty);
          processPin(lt.pogoPin4Pn, lt.pogoPin4Qty);
        });
      };
      processSocket(product.socketName1);
      processSocket(product.socketName2);
    });

    const pogoPins = Object.entries(pogoMap).map(([name, need]) => ({ name, need }));

    return {
      ...row,
      remark: '',
      pogoPins
    };
  };

  const handleAddRow = useCallback(async () => {
    try {
      await addDoc(collection(db, 'requiredPogoPinRows'), {
        partNo: '',
        qty: '',
        remark: '',
        pogoPins: [],
        facility: selectedFacility === 'ALL' ? '' : selectedFacility
      });
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  }, [selectedFacility]);

  const handleRowChange = useCallback(async (id: string, field: keyof RowData, value: string | number) => {
    const rowToUpdate = rows.find(r => r.id === id);
    if (!rowToUpdate) return;

    const newRow = { ...rowToUpdate, [field]: value };
    const calculatedRow = calculateRow(newRow, products, lifeTimes);

    try {
      const docRef = doc(db, 'requiredPogoPinRows', id);
      await updateDoc(docRef, {
        [field]: value,
        remark: calculatedRow.remark,
        pogoPins: calculatedRow.pogoPins
      });
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  }, [rows, products, lifeTimes]);

  const handleDeleteRow = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'requiredPogoPinRows', id));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      try {
        const batch = writeBatch(db);
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0]) {
            const partNo = String(row[0]).trim();
            let rawQty = row[1];
            if (typeof rawQty === 'string') {
              rawQty = rawQty.replace(/,/g, '').trim();
            }
            const qty = Number(rawQty) || '';
            const newRow: RowData = {
              id: '', // Not needed for addDoc
              partNo,
              qty,
              remark: '',
              pogoPins: [],
              facility: selectedFacility === 'ALL' ? '' : selectedFacility
            };
            const calculatedRow = calculateRow(newRow, products, lifeTimes);
            
            const newDocRef = doc(collection(db, 'requiredPogoPinRows'));
            batch.set(newDocRef, {
              partNo: calculatedRow.partNo,
              qty: calculatedRow.qty,
              remark: calculatedRow.remark,
              pogoPins: calculatedRow.pogoPins,
              facility: calculatedRow.facility
            });
          }
        }
        await batch.commit();
        const ts = new Date().toLocaleString();
        localStorage.setItem(`fcst_import_timestamp_${selectedFacility}`, ts);
        setLastImportTime(ts);
      } catch (error) {
        console.error("Error importing rows: ", error);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [selectedFacility, products, lifeTimes]);

  const getSummary = () => {
    const summary: Record<string, { required: number; onHand: number; final: number }> = {};
    
    // Calculate required
    rows.forEach(row => {
      row.pogoPins.forEach(pin => {
        if (!summary[pin.name]) {
          summary[pin.name] = { required: 0, onHand: 0, final: 0 };
        }
        summary[pin.name].required += pin.need;
      });
    });

    // Add on-hand and calculate final
    Object.keys(summary).forEach(pinName => {
      const onHandQty = pogoPinsData
        .filter(p => p.pinPn === pinName)
        .reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
      
      summary[pinName].onHand = onHandQty;
      summary[pinName].final = Math.max(0, summary[pinName].required - onHandQty);
    });

    return Object.entries(summary).sort((a, b) => b[1].required - a[1].required);
  };

  const summaryData = React.useMemo(() => getSummary(), [rows, pogoPinsData]);

  const filteredSummaryData = React.useMemo(() => {
    if (!debouncedSummarySearchTerm.trim()) return summaryData;
    const term = debouncedSummarySearchTerm.toLowerCase();
    return summaryData.filter(([name]) => name.toLowerCase().includes(term));
  }, [summaryData, debouncedSummarySearchTerm]);

  const topShortages = React.useMemo(() => {
    return summaryData
      .filter(([_, data]) => data.final > 0)
      .sort((a, b) => b[1].final - a[1].final)
      .slice(0, 5)
      .map(([name, data]) => ({ name, shortage: data.final }));
  }, [summaryData]);

  const overallStats = React.useMemo(() => {
    const totalRequired = summaryData.reduce((sum, [_, data]) => sum + data.required, 0);
    const totalOnHand = summaryData.reduce((sum, [_, data]) => sum + data.onHand, 0);
    const totalShortage = summaryData.reduce((sum, [_, data]) => sum + data.final, 0);
    const shortageCount = summaryData.filter(([_, data]) => data.final > 0).length;
    
    return { totalRequired, totalOnHand, totalShortage, shortageCount };
  }, [summaryData]);

  const getDetailedSummary = React.useCallback(() => {
    const targetPins = summaryData.map(([pinName, data]) => ({ pinName, data }));
    
    return targetPins.map(({ pinName, data }) => {
      const details: any[] = [];
      const seen = new Set<string>();

      const relatedLts = lifeTimes.filter(lt => 
        lt.pogoPin1Pn === pinName || 
        lt.pogoPin2Pn === pinName || 
        lt.pogoPin3Pn === pinName || 
        lt.pogoPin4Pn === pinName
      );

      const insertionsUsingPin = products.filter(prod => {
        const s1 = (prod.socketName1 || '').trim().toUpperCase();
        const s2 = (prod.socketName2 || '').trim().toUpperCase();
        return relatedLts.some(lt => {
          const sg = (lt.socketGroup || '').trim().toUpperCase();
          return sg === s1 || sg === s2;
        });
      });

      insertionsUsingPin.forEach(insertionProd => {
        const device = insertionProd.device || '';
        const nickName = insertionProd.nickname || '(No Nickname)';
        const insertion = insertionProd.insertion || '';
        const site = insertionProd.siteNumber || '';
        const matchingRows = rows.filter(r => r.partNo && r.partNo.trim().toUpperCase() === device.trim().toUpperCase());
        const fcst = matchingRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
        const s1 = (insertionProd.socketName1 || '').trim().toUpperCase();
        const s2 = (insertionProd.socketName2 || '').trim().toUpperCase();
        const matchedLt1 = relatedLts.find(lt => (lt.socketGroup || '').trim().toUpperCase() === s1);
        const matchedLt2 = relatedLts.find(lt => (lt.socketGroup || '').trim().toUpperCase() === s2);
        const matchedLt = matchedLt1 || matchedLt2;
        
        let reqPinQty = '';
        let lifetimeVal = matchedLt?.lifeTime || '';
        
        if (matchedLt) {
          if (matchedLt.pogoPin1Pn === pinName) reqPinQty = matchedLt.pogoPinQty;
          else if (matchedLt.pogoPin2Pn === pinName) reqPinQty = matchedLt.pogoPin2Qty;
          else if (matchedLt.pogoPin3Pn === pinName) reqPinQty = matchedLt.pogoPin3Qty;
          else if (matchedLt.pogoPin4Pn === pinName) reqPinQty = matchedLt.pogoPin4Qty;
        }

        const key = `${device}-${insertion}-${site}-${nickName}`;
        if (!seen.has(key)) {
          seen.add(key);
          details.push({ nickName, device, insertion, site, fcst, lifetime: lifetimeVal, reqPinQtyInOneSocket: reqPinQty });
        }
      });

      details.sort((a, b) => {
        if (a.nickName !== b.nickName) return a.nickName.localeCompare(b.nickName);
        if (a.device !== b.device) return a.device.localeCompare(b.device);
        return a.insertion.localeCompare(b.insertion);
      });

      return { pinName, required: data.required, onHand: data.onHand, final: data.final, details };
    });
  }, [summaryData, rows, products, lifeTimes]);

  const detailedSummaryData = React.useMemo(() => getDetailedSummary(), [getDetailedSummary]);

  const getUniqueValues = (field: string, otherFilters: any) => {
    let filtered = detailedSummaryData;
    if (otherFilters.pogoPins?.length > 0) filtered = filtered.filter(g => otherFilters.pogoPins.includes(String(g.pinName || '')));
    if (otherFilters.nicknames?.length > 0) filtered = filtered.filter(g => g.details.some(d => otherFilters.nicknames.includes(String(d.nickName || ''))));
    if (otherFilters.devices?.length > 0) filtered = filtered.filter(g => g.details.some(d => otherFilters.devices.includes(String(d.device || ''))));
    if (otherFilters.insertions?.length > 0) filtered = filtered.filter(g => g.details.some(d => otherFilters.insertions.includes(String(d.insertion || ''))));
    if (field === 'pinName') return Array.from(new Set(filtered.map(g => String(g.pinName || '')))).filter(Boolean).sort();
    return Array.from(new Set(filtered.flatMap(g => g.details.map(d => {
        if (field === 'nickName') return String(d.nickName || '');
        if (field === 'device') return String(d.device || '');
        if (field === 'insertion') return String(d.insertion || '');
        return '';
      })))).filter(Boolean).sort();
  };

  const uniquePogoPins = React.useMemo(() => getUniqueValues('pinName', { nicknames: filterNicknames, devices: filterDevices, insertions: filterInsertions }), [detailedSummaryData, filterNicknames, filterDevices, filterInsertions]);
  const uniqueNicknames = React.useMemo(() => getUniqueValues('nickName', { pogoPins: filterPogoPins, devices: filterDevices, insertions: filterInsertions }), [detailedSummaryData, filterPogoPins, filterDevices, filterInsertions]);
  const uniqueDevices = React.useMemo(() => getUniqueValues('device', { pogoPins: filterPogoPins, nicknames: filterNicknames, insertions: filterInsertions }), [detailedSummaryData, filterPogoPins, filterNicknames, filterInsertions]);
  const uniqueInsertions = React.useMemo(() => getUniqueValues('insertion', { pogoPins: filterPogoPins, nicknames: filterNicknames, devices: filterDevices }), [detailedSummaryData, filterPogoPins, filterNicknames, filterDevices]);

  const allDetailedColumns = [
    { key: 'pinName', label: t('requiredPogoPin.columns.pinName') },
    { key: 'final', label: t('requiredPogoPin.columns.final') },
    { key: 'required', label: t('requiredPogoPin.columns.required') },
    { key: 'onHand', label: t('requiredPogoPin.columns.onHand') },
    { key: 'nickName', label: t('requiredPogoPin.columns.nickName') },
    { key: 'device', label: t('requiredPogoPin.columns.device') },
    { key: 'insertion', label: t('requiredPogoPin.columns.insertion') },
    { key: 'site', label: t('requiredPogoPin.columns.site') },
    { key: 'fcst', label: t('requiredPogoPin.columns.fcst') },
    { key: 'lifetime', label: t('requiredPogoPin.columns.lifetime') },
    { key: 'reqPinQtyInOneSocket', label: t('requiredPogoPin.columns.reqPinQtyInOneSocket') },
  ];

  const filteredDetailedSummaryData = React.useMemo(() => {
    let result = detailedSummaryData;
    if (debouncedDetailedSearchTerm.trim()) {
      const term = debouncedDetailedSearchTerm.toLowerCase();
      result = result.filter(group => String(group.pinName || '').toLowerCase().includes(term));
    }
    if (filterPogoPins.length > 0) result = result.filter(group => filterPogoPins.includes(String(group.pinName || '')));
    if (filterNicknames.length > 0 || filterDevices.length > 0 || filterInsertions.length > 0) {
      result = result.map(group => {
        const filteredDetails = group.details.filter(detail => {
          const matchNickname = filterNicknames.length === 0 || filterNicknames.includes(String(detail.nickName || ''));
          const matchDevice = filterDevices.length === 0 || filterDevices.includes(String(detail.device || ''));
          const matchInsertion = filterInsertions.length === 0 || filterInsertions.includes(String(detail.insertion || ''));
          return matchNickname && matchDevice && matchInsertion;
        });
        return { ...group, details: filteredDetails };
      }).filter(group => group.details.length > 0);
    }
    if (filterRequiredQty === 'gt0') result = result.filter(group => group.final > 0);
    else if (filterRequiredQty === 'lte0') result = result.filter(group => group.final <= 0);
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aValue: any;
        let bValue: any;
        if (['pinName', 'final', 'required', 'onHand'].includes(sortConfig.key)) {
          aValue = a[sortConfig.key as keyof typeof a];
          bValue = b[sortConfig.key as keyof typeof b];
        } else {
          aValue = a.details[0]?.[sortConfig.key as keyof typeof a.details[0]];
          bValue = b.details[0]?.[sortConfig.key as keyof typeof b.details[0]];
        }
        if (aValue === undefined) aValue = '';
        if (bValue === undefined) bValue = '';
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [detailedSummaryData, detailedSearchTerm, filterPogoPins, filterNicknames, filterDevices, filterInsertions, filterRequiredQty, sortConfig]);

  const handleExportDetailed = () => {
    const exportData: any[] = [];
    const merges: any[] = [];
    let currentRow = 1;
    filteredDetailedSummaryData.forEach(group => {
      const groupStartRow = currentRow;
      const detailsCount = group.details.length || 1;
      if (group.details.length === 0) {
        exportData.push({ 'Pogo Pin PN': group.pinName, 'Final Required': group.final, 'Total Required': group.required, 'On Hand': group.onHand, 'Nickname': 'No device details found', 'Device': '', 'Insertion': '', 'Site': '', 'FCST Qty': '', 'Lifetime': '', 'Required pin qty in one socket': '' });
        currentRow++;
      } else {
        let nicknameStartRow = currentRow;
        let deviceStartRow = currentRow;
        group.details.forEach((detail, detailIndex) => {
          const isFirstInGroup = detailIndex === 0;
          if (detailIndex > 0 && detail.nickName !== group.details[detailIndex - 1].nickName) {
            if (currentRow - 1 > nicknameStartRow) merges.push({ s: { r: nicknameStartRow, c: 4 }, e: { r: currentRow - 1, c: 4 } });
            nicknameStartRow = currentRow;
          }
          if (detailIndex > 0 && (detail.device !== group.details[detailIndex - 1].device || detail.nickName !== group.details[detailIndex - 1].nickName)) {
            if (currentRow - 1 > deviceStartRow) merges.push({ s: { r: deviceStartRow, c: 5 }, e: { r: currentRow - 1, c: 5 } });
            deviceStartRow = currentRow;
          }
          exportData.push({ 'Pogo Pin PN': isFirstInGroup ? group.pinName : '', 'Final Required': isFirstInGroup ? group.final : '', 'Total Required': isFirstInGroup ? group.required : '', 'On Hand': isFirstInGroup ? group.onHand : '', 'Nickname': detail.nickName, 'Device': detail.device, 'Insertion': detail.insertion, 'Site': detail.site, 'FCST Qty': detail.fcst, 'Lifetime': detail.lifetime, 'Required pin qty in one socket': detail.reqPinQtyInOneSocket });
          currentRow++;
          if (detailIndex === group.details.length - 1) {
            if (currentRow - 1 > nicknameStartRow) merges.push({ s: { r: nicknameStartRow, c: 4 }, e: { r: currentRow - 1, c: 4 } });
            if (currentRow - 1 > deviceStartRow) merges.push({ s: { r: deviceStartRow, c: 5 }, e: { r: currentRow - 1, c: 5 } });
          }
        });
        if (detailsCount > 1) {
          for (let col = 0; col <= 3; col++) merges.push({ s: { r: groupStartRow, c: col }, e: { r: currentRow - 1, c: col } });
        }
      }
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!merges'] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detailed Analysis');
    XLSX.writeFile(wb, `PogoPin_Detailed_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const applyDetailedFilters = (data: any[]) => {
    let result = data;
    const term = detailedSearchTerm.trim().toLowerCase();
    if (term) result = result.filter(g => String(g.pinName || '').toLowerCase().includes(term));
    if (filterPogoPins.length > 0) result = result.filter(g => filterPogoPins.includes(String(g.pinName || '')));
    if (filterNicknames.length > 0 || filterDevices.length > 0 || filterInsertions.length > 0) {
      result = result.map(g => ({
        ...g,
        details: g.details.filter((d: any) =>
          (filterNicknames.length === 0 || filterNicknames.includes(String(d.nickName || ''))) &&
          (filterDevices.length === 0 || filterDevices.includes(String(d.device || ''))) &&
          (filterInsertions.length === 0 || filterInsertions.includes(String(d.insertion || '')))
        ),
      })).filter(g => g.details.length > 0);
    }
    if (filterRequiredQty === 'gt0') result = result.filter(g => g.final > 0);
    else if (filterRequiredQty === 'lte0') result = result.filter(g => g.final <= 0);
    return result;
  };

  const buildDetailedSheet = (detailedData: any[]) => {
    const thinBorder = { style: 'thin' as const, color: { rgb: 'E4E4E7' } };
    const border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
    const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { patternType: 'solid' as const, fgColor: { rgb: '27272A' } }, alignment: { vertical: 'center', horizontal: 'center', wrapText: true }, border };
    const pinBg = { patternType: 'solid' as const, fgColor: { rgb: 'FEFCE8' } };
    const pinStyle = { font: { bold: true, sz: 10 }, fill: pinBg, alignment: { vertical: 'center', horizontal: 'left' }, border };
    const pinNumStyle = { font: { sz: 10 }, fill: pinBg, alignment: { vertical: 'center', horizontal: 'right' }, border };
    const pinRedStyle = { ...pinStyle, font: { bold: true, sz: 10, color: { rgb: 'DC2626' } } };
    const pinRedNumStyle = { ...pinNumStyle, font: { sz: 10, color: { rgb: 'DC2626' } } };
    const dataStyle = { font: { sz: 10 }, alignment: { vertical: 'center', horizontal: 'left' }, border };
    const numStyle = { font: { sz: 10 }, alignment: { vertical: 'center', horizontal: 'right' }, border };
    const cols = ['Pogo Pin PN','Final Required','Total Required','On Hand','Nickname','Device','Insertion','Site Number','FCST Qty','Lifetime','Required Pin Qty In One Socket'];
    const sheetData: any[][] = [cols.map(h => ({ v: h, t: 's', s: headerStyle }))];
    const merges: any[] = [];
    let ri = 1;

    detailedData.forEach(group => {
      const groupStart = ri;
      const isShort = group.final > 0;
      const pStyle = isShort ? pinRedStyle : pinStyle;
      const pNumStyle = isShort ? pinRedNumStyle : pinNumStyle;

      if (group.details.length === 0) {
        sheetData.push([
          { v: group.pinName, t: 's', s: pStyle },
          { v: group.final, t: 'n', s: pNumStyle },
          { v: group.required, t: 'n', s: pinNumStyle },
          { v: group.onHand, t: 'n', s: pinNumStyle },
          { v: 'No device details found', t: 's', s: { ...dataStyle, fill: pinBg } },
          ...Array(6).fill({ v: '', t: 's', s: { ...dataStyle, fill: pinBg } }),
        ]);
        ri++;
      } else {
        let nnStart = ri, devStart = ri;
        group.details.forEach((d: any, di: number) => {
          const prev = di > 0 ? group.details[di - 1] : null;
          if (di > 0 && d.nickName !== prev.nickName) {
            if (ri - 1 > nnStart) merges.push({ s: { r: nnStart, c: 4 }, e: { r: ri - 1, c: 4 } });
            nnStart = ri;
          }
          if (di > 0 && (d.device !== prev.device || d.nickName !== prev.nickName)) {
            if (ri - 1 > devStart) merges.push({ s: { r: devStart, c: 5 }, e: { r: ri - 1, c: 5 } });
            devStart = ri;
          }
          const first = di === 0;
          sheetData.push([
            { v: first ? group.pinName : '', t: 's', s: pStyle },
            { v: first ? group.final : '', t: first ? 'n' : 's', s: pNumStyle },
            { v: first ? group.required : '', t: first ? 'n' : 's', s: pinNumStyle },
            { v: first ? group.onHand : '', t: first ? 'n' : 's', s: pinNumStyle },
            { v: d.nickName, t: 's', s: dataStyle },
            { v: d.device, t: 's', s: dataStyle },
            { v: d.insertion, t: 's', s: dataStyle },
            { v: d.site, t: 's', s: numStyle },
            { v: d.fcst || 0, t: 'n', s: numStyle },
            { v: d.lifetime, t: 's', s: numStyle },
            { v: d.reqPinQtyInOneSocket, t: 's', s: numStyle },
          ]);
          ri++;
          if (di === group.details.length - 1) {
            if (ri - 1 > nnStart) merges.push({ s: { r: nnStart, c: 4 }, e: { r: ri - 1, c: 4 } });
            if (ri - 1 > devStart) merges.push({ s: { r: devStart, c: 5 }, e: { r: ri - 1, c: 5 } });
          }
        });
        if (group.details.length > 1) {
          for (let col = 0; col <= 3; col++) merges.push({ s: { r: groupStart, c: col }, e: { r: ri - 1, c: col } });
        }
      }
    });

    const ws = XLSXStyle.utils.aoa_to_sheet(sheetData);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 24 }];
    ws['!rows'] = sheetData.map(() => ({ hpt: 18 }));
    return ws;
  };

  const handleExportDetailedAll = () => {
    const cachedFacilities = sessionStorage.getItem('cachedFacilities');
    const allFacilities: string[] = cachedFacilities
      ? JSON.parse(cachedFacilities)
      : [...new Set(allRows.map((r: any) => r.facility || '').filter(Boolean))].sort() as string[];

    const wb = XLSXStyle.utils.book_new();

    allFacilities.forEach((facility: string) => {
      const fac = facility.trim().toUpperCase();
      const fRawRows = allRows.filter((r: any) => (r.facility || '').trim().toUpperCase() === fac);
      const fProducts = allProducts.filter((p: any) => (p.facility || '').trim().toUpperCase() === fac);
      const fLifeTimes = allLifeTimes.filter((lt: any) => (lt.facility || '').trim().toUpperCase() === fac);
      const fPogoPins = allPogoPinsData.filter((p: any) => (p.facility || '').trim().toUpperCase() === fac);
      const fRows = fRawRows.map((row: any) => calculateRow(row, fProducts, fLifeTimes));

      let detailedData: any[] = [];
      if (fRows.length > 0) {
        const summary: Record<string, { required: number; onHand: number; final: number }> = {};
        fRows.forEach(row => {
          row.pogoPins.forEach((pin: any) => {
            if (!summary[pin.name]) summary[pin.name] = { required: 0, onHand: 0, final: 0 };
            summary[pin.name].required += pin.need;
          });
        });
        fPogoPins.forEach((pin: any) => {
          const name = pin.pinPn;
          if (!summary[name]) summary[name] = { required: 0, onHand: 0, final: 0 };
          summary[name].onHand = Number(pin.qty) || 0;
        });
        Object.keys(summary).forEach(n => { summary[n].final = Math.max(0, summary[n].required - summary[n].onHand); });

        detailedData = Object.entries(summary).map(([pinName, data]) => {
          const details: any[] = [];
          const seen = new Set<string>();
          const relatedLts = fLifeTimes.filter((lt: any) => lt.pogoPin1Pn === pinName || lt.pogoPin2Pn === pinName || lt.pogoPin3Pn === pinName || lt.pogoPin4Pn === pinName);
          fProducts.filter((prod: any) => {
            const s1 = (prod.socketName1 || '').trim().toUpperCase();
            const s2 = (prod.socketName2 || '').trim().toUpperCase();
            return relatedLts.some((lt: any) => { const sg = (lt.socketGroup || '').trim().toUpperCase(); return sg === s1 || sg === s2; });
          }).forEach((prod: any) => {
            const device = prod.device || '', nickName = prod.nickname || '(No Nickname)';
            const insertion = prod.insertion || '', site = prod.siteNumber || '';
            const fcst = fRows.filter(r => r.partNo && r.partNo.trim().toUpperCase() === device.trim().toUpperCase()).reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
            const s1 = (prod.socketName1 || '').trim().toUpperCase(), s2 = (prod.socketName2 || '').trim().toUpperCase();
            const matchedLt = relatedLts.find((lt: any) => (lt.socketGroup || '').trim().toUpperCase() === s1) || relatedLts.find((lt: any) => (lt.socketGroup || '').trim().toUpperCase() === s2);
            let reqPinQty = '', lifetimeVal = matchedLt?.lifeTime || '';
            if (matchedLt) {
              if (matchedLt.pogoPin1Pn === pinName) reqPinQty = matchedLt.pogoPinQty;
              else if (matchedLt.pogoPin2Pn === pinName) reqPinQty = matchedLt.pogoPin2Qty;
              else if (matchedLt.pogoPin3Pn === pinName) reqPinQty = matchedLt.pogoPin3Qty;
              else if (matchedLt.pogoPin4Pn === pinName) reqPinQty = matchedLt.pogoPin4Qty;
            }
            const key = `${device}-${insertion}-${site}-${nickName}`;
            if (!seen.has(key)) { seen.add(key); details.push({ nickName, device, insertion, site, fcst, lifetime: lifetimeVal, reqPinQtyInOneSocket: reqPinQty }); }
          });
          details.sort((a, b) => a.nickName.localeCompare(b.nickName) || a.device.localeCompare(b.device) || a.insertion.localeCompare(b.insertion));
          return { pinName, required: data.required, onHand: data.onHand, final: data.final, details };
        });
      }

      XLSXStyle.utils.book_append_sheet(wb, buildDetailedSheet(applyDetailedFilters(detailedData)), facility.substring(0, 31));
    });

    if (wb.SheetNames.length > 0) {
      XLSXStyle.writeFile(wb, `PogoPin_Detailed_All_Facilities_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const togglePin = (pinName: string) => setExpandedPins(prev => ({ ...prev, [pinName]: !prev[pinName] }));
  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filteredDetailedSummaryData.forEach(g => { all[g.pinName] = true; });
    setExpandedPins(all);
  };
  const collapseAll = () => setExpandedPins({});
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) return current.direction === 'asc' ? { key, direction: 'desc' } : null;
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-4xl italic text-zinc-900 tracking-tight">{t('requiredPogoPin.title')}</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">{t('requiredPogoPin.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100/50 p-1 rounded-xl border border-zinc-200 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('input')}
            className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all", activeTab === 'input' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
          >
            <List className="h-3.5 w-3.5" />
            {t('requiredPogoPin.input')}
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all", activeTab === 'summary' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            {t('requiredPogoPin.summary')}
          </button>
          <button
            onClick={() => setActiveTab('detailed')}
            className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all", activeTab === 'detailed' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
          >
            <Table2 className="h-3.5 w-3.5" />
            {t('requiredPogoPin.detailed')}
          </button>
        </div>
      </div>

      {activeTab !== 'input' && summaryData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-50/50 px-6 py-4 flex items-center justify-between rounded-2xl border border-zinc-200">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('requiredPogoPin.totalRequired')}</span>
              <span className="text-xl font-bold text-brand-primary">{overallStats.totalRequired.toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-zinc-50/50 px-6 py-4 flex items-center justify-between rounded-2xl border border-zinc-200">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">{t('requiredPogoPin.totalOnHand')}</span>
              <span className="text-xl font-bold text-emerald-600">{overallStats.totalOnHand.toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-zinc-50/50 px-6 py-4 flex items-center justify-between rounded-2xl border border-zinc-200">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-rose-600/70 uppercase tracking-widest">{t('requiredPogoPin.totalShortage')}</span>
              <span className="text-xl font-bold text-rose-600">{overallStats.totalShortage.toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-zinc-50/50 px-6 py-4 flex items-center justify-between rounded-2xl border border-zinc-200">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-rose-600/70 uppercase tracking-widest">{t('requiredPogoPin.shortageItems')}</span>
              <span className="text-xl font-bold text-rose-600">{overallStats.shortageCount}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'input' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {isAdmin && (
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={handleAddRow} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-black/10 active:scale-95 text-sm font-bold">
                  <Plus className="h-4 w-4" />
                  <span>{t('requiredPogoPin.addRow')}</span>
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer text-sm font-bold">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{t('requiredPogoPin.importExcel')}</span>
                  <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                </label>
                <button onClick={() => setIsClearModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 text-sm font-bold" disabled={rows.length === 0}>
                  <Trash2 className="h-4 w-4" />
                  <span>{t('requiredPogoPin.clearAll')}</span>
                </button>
              </div>
              {lastImportTime && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t('requiredPogoPin.lastUpdated')}: {lastImportTime}</span>
                </div>
              )}
            </div>
          )}
          {isAdmin && (
            <div className="px-6 py-2 bg-blue-50/50 border-b border-zinc-100 flex items-center gap-2 text-xs text-blue-600">
              <Info className="h-4 w-4" />
              <span>{t('requiredPogoPin.excelFormat')}</span>
            </div>
          )}
          <DoubleScrollbar>
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 font-medium sticky left-0 bg-zinc-50 z-10">{t('requiredPogoPin.partNo')}</th>
                  <th className="px-4 py-3 font-medium w-32">{t('requiredPogoPin.qty')}</th>
                  <th className="px-4 py-3 font-medium">{t('requiredPogoPin.remark')}</th>
                  <th className="px-4 py-3 font-medium">{t('requiredPogoPin.pogoPin1Need')}</th>
                  <th className="px-4 py-3 font-medium">{t('requiredPogoPin.pogoPin2Need')}</th>
                  <th className="px-4 py-3 font-medium">{t('requiredPogoPin.pogoPin3Need')}</th>
                  <th className="px-4 py-3 font-medium">{t('requiredPogoPin.pogoPin4Need')}</th>
                  {isAdmin && <th className="px-4 py-3 font-medium w-16"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-zinc-500">
                      {isAdmin ? t('requiredPogoPin.noDataAdmin') : t('requiredPogoPin.noData')}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-zinc-50/50 z-10 transition-colors">
                        {isAdmin ? (
                          <input type="text" value={row.partNo} onChange={(e) => handleRowChange(row.id, 'partNo', e.target.value)} className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white" placeholder={t('requiredPogoPin.enterPartNo')} />
                        ) : (
                          <span className="font-medium text-zinc-900">{row.partNo}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isAdmin ? (
                          <input type="number" value={row.qty} onChange={(e) => handleRowChange(row.id, 'qty', e.target.value ? Number(e.target.value) : '')} className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white" placeholder={t('requiredPogoPin.qty')} />
                        ) : (
                          <span className="font-medium text-zinc-900">{row.qty}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={cn("text-xs", row.remark ? "text-red-500 font-medium" : "text-zinc-400")}>{row.remark || '-'}</span>
                      </td>
                      {[0, 1, 2, 3].map(index => {
                        const pin = row.pogoPins[index];
                        return (
                          <td key={index} className="px-4 py-2">
                            {pin ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{pin.name}</span>
                                <span className="font-medium text-brand-primary">{pin.need}</span>
                              </div>
                            ) : '-'}
                          </td>
                        );
                      })}
                      {isAdmin && (
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DoubleScrollbar>
        </motion.div>
      )}

      {activeTab === 'summary' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          {topShortages.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-6">{t('requiredPogoPin.top5Shortages')}</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topShortages} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="shortage" radius={[0, 4, 4, 0]} barSize={24}>
                      {topShortages.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#e11d48' : '#f43f5e'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">{t('requiredPogoPin.totalRequiredPins')}</h3>
                <p className="text-xs text-zinc-500">{t('requiredPogoPin.aggregatedQty')}</p>
              </div>
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input type="text" placeholder={t('requiredPogoPin.searchPogoPin')} value={summarySearchTerm} onChange={(e) => setSummarySearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm" />
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSummaryData.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-zinc-500">
                    <Search className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                    <p>{summarySearchTerm ? t('requiredPogoPin.noMatchingPins') : t('requiredPogoPin.noDataToSummarize')}</p>
                  </div>
                ) : (
                  filteredSummaryData.map(([name, data]) => {
                    const stockLevel = data.required > 0 ? Math.min(100, (data.onHand / data.required) * 100) : 100;
                    const isShortage = data.final > 0;
                    return (
                      <div key={name} className="flex flex-col p-5 rounded-xl border border-zinc-100 bg-zinc-50 gap-4 hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                          <div className="font-bold text-zinc-800 text-lg truncate pr-2" title={name}>{name}</div>
                          {isShortage && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Shortage</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col"><span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Required</span><span className="text-lg font-bold text-zinc-700">{data.required.toLocaleString()}</span></div>
                          <div className="flex flex-col"><span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">On Hand</span><span className="text-lg font-bold text-emerald-600">{data.onHand.toLocaleString()}</span></div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider"><span className="text-zinc-400">{t('requiredPogoPin.stockLevel')}</span><span className={isShortage ? "text-rose-500" : "text-emerald-500"}>{Math.round(stockLevel)}%</span></div>
                          <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${stockLevel}%` }} className={cn("h-full rounded-full", isShortage ? "bg-rose-500" : "bg-emerald-500")} /></div>
                        </div>
                        <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
                          <div className="flex flex-col"><span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">{t('requiredPogoPin.finalRequired')}</span><span className={cn("text-xl font-bold", isShortage ? "text-rose-600" : "text-emerald-600")}>{data.final.toLocaleString()}</span></div>
                          <button onClick={() => { setFilterPogoPins([name]); setActiveTab('detailed'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-all shadow-sm active:scale-95"> {t('requiredPogoPin.details')}</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'detailed' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="p-2 border-b border-zinc-100 bg-zinc-50/50 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 py-2">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">{t('requiredPogoPin.detailedAnalysis')}</h3>
                <p className="text-xs text-zinc-500">{t('requiredPogoPin.detailedAnalysisSubtitle')}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl px-1 py-1 shadow-sm">
                  <button onClick={expandAll} title={t('requiredPogoPin.expandAll')} className="p-1.5 text-zinc-500 hover:text-brand-primary hover:bg-zinc-100 rounded-lg transition-all"><ChevronsUpDown className="h-4 w-4" /></button>
                  <button onClick={collapseAll} title={t('requiredPogoPin.collapseAll')} className="p-1.5 text-zinc-500 hover:text-brand-primary hover:bg-zinc-100 rounded-lg transition-all"><ChevronsDownUp className="h-4 w-4" /></button>
                </div>
                <button onClick={handleExportDetailed} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95 text-sm font-bold">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{t('requiredPogoPin.exportDetailed')}</span>
                </button>
                <button onClick={handleExportDetailedAll} className="flex items-center gap-2 px-4 py-2 border border-zinc-900 bg-white text-zinc-900 rounded-xl hover:bg-zinc-50 transition-all shadow-lg shadow-black/5 active:scale-95 text-sm font-bold">
                  <Download className="h-4 w-4" />
                  <span>{t('requiredPogoPin.exportDetailedAll')}</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between surface-card p-2 mx-2 mb-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 w-full lg:w-auto pb-2 lg:pb-0">
                <button onClick={() => { setFilterPogoPins([]); setFilterNicknames([]); setFilterDevices([]); setFilterInsertions([]); setFilterRequiredQty('all'); }} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors">{t('sharedTable.clear')}</button>
                <div className="flex items-center gap-1 bg-zinc-50 rounded-lg p-1 border border-zinc-100">
                  <button onClick={() => setFilterRequiredQty(filterRequiredQty === 'gt0' ? 'all' : 'gt0')} className={cn("px-2 py-1 text-[10px] font-bold rounded-md", filterRequiredQty === 'gt0' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400")}>{t('requiredPogoPin.filters.gt0')}</button>
                  <button onClick={() => setFilterRequiredQty(filterRequiredQty === 'lte0' ? 'all' : 'lte0')} className={cn("px-2 py-1 text-[10px] font-bold rounded-md", filterRequiredQty === 'lte0' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400")}>{t('requiredPogoPin.filters.lte0')}</button>
                </div>
                <MultiSelectDropdown values={filterPogoPins} onChange={setFilterPogoPins} options={uniquePogoPins as string[]} placeholder={t('requiredPogoPin.filters.pogoPins')} />
                <MultiSelectDropdown values={filterNicknames} onChange={setFilterNicknames} options={uniqueNicknames as string[]} placeholder={t('requiredPogoPin.filters.nicknames')} />
                <MultiSelectDropdown values={filterDevices} onChange={setFilterDevices} options={uniqueDevices as string[]} placeholder={t('requiredPogoPin.filters.devices')} />
                <MultiSelectDropdown values={filterInsertions} onChange={setFilterInsertions} options={uniqueInsertions as string[]} placeholder={t('requiredPogoPin.filters.insertions')} />
              </div>
            </div>
          </div>
          <DoubleScrollbar className="p-6">
            <table className="w-full text-sm text-zinc-700 border-collapse">
              <thead className="bg-zinc-100 text-xs uppercase text-zinc-600 border-b border-zinc-300">
                <tr>
                  {visibleColumns.includes('pinName') && <th className="border border-zinc-300 px-3 py-2 font-medium text-left cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('pinName')}>{t('requiredPogoPin.columns.pinName')}</th>}
                  {visibleColumns.includes('final') && <th className="border border-zinc-300 px-3 py-2 font-medium text-right cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('final')}>{t('requiredPogoPin.columns.final')}</th>}
                  {visibleColumns.includes('required') && <th className="border border-zinc-300 px-3 py-2 font-medium text-right cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('required')}>{t('requiredPogoPin.columns.required')}</th>}
                  {visibleColumns.includes('onHand') && <th className="border border-zinc-300 px-3 py-2 font-medium text-right cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('onHand')}>{t('requiredPogoPin.columns.onHand')}</th>}
                  {visibleColumns.includes('nickName') && <th className="border border-zinc-300 px-3 py-2 font-medium text-left cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('nickName')}>{t('requiredPogoPin.columns.nickName')}</th>}
                  {visibleColumns.includes('device') && <th className="border border-zinc-300 px-3 py-2 font-medium text-left cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('device')}>{t('requiredPogoPin.columns.device')}</th>}
                  {visibleColumns.includes('insertion') && <th className="border border-zinc-300 px-3 py-2 font-medium text-left cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('insertion')}>{t('requiredPogoPin.columns.insertion')}</th>}
                  {visibleColumns.includes('site') && <th className="border border-zinc-300 px-3 py-2 font-medium text-right cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('site')}>{t('requiredPogoPin.columns.site')}</th>}
                  {visibleColumns.includes('fcst') && <th className="border border-zinc-300 px-3 py-2 font-medium text-right cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('fcst')}>{t('requiredPogoPin.columns.fcst')}</th>}
                  {visibleColumns.includes('lifetime') && <th className="border border-zinc-300 px-3 py-2 font-medium text-right cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('lifetime')}>{t('requiredPogoPin.columns.lifetime')}</th>}
                  {visibleColumns.includes('reqPinQtyInOneSocket') && <th className="border border-zinc-300 px-3 py-2 font-medium text-right cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('reqPinQtyInOneSocket')}>{t('requiredPogoPin.columns.reqPinQtyInOneSocket')}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredDetailedSummaryData.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-zinc-500 border border-zinc-300">
                      {t('requiredPogoPin.noMatchingPins')}
                    </td>
                  </tr>
                ) : (
                  filteredDetailedSummaryData.map((pinGroup, pinIndex) => {
                    const isExpanded = expandedPins[pinGroup.pinName];
                    const detailsToShow = isExpanded ? pinGroup.details : (pinGroup.details.length > 0 ? [pinGroup.details[0]] : []);
                    const hasDetails = pinGroup.details.length > 0;

                    if (!hasDetails) {
                      const remainingCols = visibleColumns.filter(c => !['pinName', 'final', 'required', 'onHand'].includes(c)).length;
                      return (
                        <tr key={pinGroup.pinName} className="hover:bg-zinc-50 group">
                          {visibleColumns.includes('pinName') && (
                            <td className="border border-zinc-300 px-3 py-2 text-left font-medium sticky left-0 bg-white group-hover:bg-zinc-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors">
                              <div className="flex items-center gap-2 pl-6">{pinGroup.pinName}</div>
                            </td>
                          )}
                          {visibleColumns.includes('final') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right font-bold text-red-600">{pinGroup.final.toLocaleString()}</td>
                          )}
                          {visibleColumns.includes('required') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{pinGroup.required.toLocaleString()}</td>
                          )}
                          {visibleColumns.includes('onHand') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{pinGroup.onHand.toLocaleString()}</td>
                          )}
                          {remainingCols > 0 && (
                            <td className="border border-zinc-300 px-3 py-2 text-center text-zinc-400" colSpan={remainingCols}>{t('requiredPogoPin.noDeviceDetails')}</td>
                          )}
                        </tr>
                      );
                    }

                    return detailsToShow.map((detail, detailIndex) => {
                      const isFirstPin = detailIndex === 0;

                      let isFirstNickName = false;
                      let nickNameRowSpan = 1;
                      if (isExpanded) {
                        if (detailIndex === 0 || pinGroup.details[detailIndex - 1].nickName !== detail.nickName) {
                          isFirstNickName = true;
                          let count = 1;
                          for (let i = detailIndex + 1; i < pinGroup.details.length; i++) {
                            if (pinGroup.details[i].nickName === detail.nickName) count++;
                            else break;
                          }
                          nickNameRowSpan = count;
                        }
                      } else {
                        isFirstNickName = true;
                      }

                      let isFirstDevice = false;
                      let deviceRowSpan = 1;
                      if (isExpanded) {
                        if (detailIndex === 0 || pinGroup.details[detailIndex - 1].device !== detail.device || pinGroup.details[detailIndex - 1].nickName !== detail.nickName) {
                          isFirstDevice = true;
                          let count = 1;
                          for (let i = detailIndex + 1; i < pinGroup.details.length; i++) {
                            if (pinGroup.details[i].device === detail.device && pinGroup.details[i].nickName === detail.nickName) count++;
                            else break;
                          }
                          deviceRowSpan = count;
                        }
                      } else {
                        isFirstDevice = true;
                      }

                      return (
                        <tr key={`${pinGroup.pinName}-${detailIndex}`} className={cn("hover:bg-zinc-50/50 group", !isExpanded && "bg-zinc-50/30")}>
                          {isFirstPin && (
                            <>
                              {visibleColumns.includes('pinName') && (
                                <td className="border border-zinc-300 px-3 py-2 align-top text-left font-bold bg-yellow-100/50 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" rowSpan={isExpanded ? pinGroup.details.length : 1}>
                                  <button
                                    onClick={() => togglePin(pinGroup.pinName)}
                                    className="flex items-center gap-2 hover:text-brand-primary transition-colors w-full text-left"
                                  >
                                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                                    {pinGroup.pinName}
                                  </button>
                                </td>
                              )}
                              {visibleColumns.includes('final') && (
                                <td className="border border-zinc-300 px-3 py-2 align-top text-right font-bold text-red-600 bg-yellow-100/50" rowSpan={isExpanded ? pinGroup.details.length : 1}>
                                  {pinGroup.final.toLocaleString()}
                                </td>
                              )}
                              {visibleColumns.includes('required') && (
                                <td className="border border-zinc-300 px-3 py-2 align-top text-right bg-yellow-100/50" rowSpan={isExpanded ? pinGroup.details.length : 1}>
                                  {pinGroup.required.toLocaleString()}
                                </td>
                              )}
                              {visibleColumns.includes('onHand') && (
                                <td className="border border-zinc-300 px-3 py-2 align-top text-right bg-yellow-100/50" rowSpan={isExpanded ? pinGroup.details.length : 1}>
                                  {pinGroup.onHand.toLocaleString()}
                                </td>
                              )}
                            </>
                          )}
                          {visibleColumns.includes('nickName') && isFirstNickName && (
                            <td className="border border-zinc-300 px-3 py-2 align-top text-left font-medium bg-white" rowSpan={isExpanded ? nickNameRowSpan : 1}>
                              {detail.nickName}
                            </td>
                          )}
                          {visibleColumns.includes('device') && isFirstDevice && (
                            <td className="border border-zinc-300 px-3 py-2 align-top text-left bg-white" rowSpan={isExpanded ? deviceRowSpan : 1}>
                              {detail.device}
                            </td>
                          )}
                          {visibleColumns.includes('insertion') && (
                            <td className="border border-zinc-300 px-3 py-2 text-left">
                              {isExpanded ? detail.insertion : (
                                <span className="text-zinc-400 italic text-xs">
                                  {pinGroup.details.length > 1 ? t('requiredPogoPin.moreDetails', { count: pinGroup.details.length - 1 }) : detail.insertion}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.includes('site') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{isExpanded ? detail.site : '-'}</td>
                          )}
                          {visibleColumns.includes('fcst') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{isExpanded ? (detail.fcst || 0).toLocaleString() : '-'}</td>
                          )}
                          {visibleColumns.includes('lifetime') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{isExpanded ? detail.lifetime : '-'}</td>
                          )}
                          {visibleColumns.includes('reqPinQtyInOneSocket') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{isExpanded ? detail.reqPinQtyInOneSocket : '-'}</td>
                          )}
                        </tr>
                      );
                    });
                  })
                )}
              </tbody>
            </table>
          </DoubleScrollbar>
        </motion.div>
      )}

      <AnimatePresence>
        {isClearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-2">{t('requiredPogoPin.clearAllTitle')}</h3>
              <p className="text-sm text-zinc-500 mb-6">{t('requiredPogoPin.clearAllMessage')}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  {t('sharedTable.cancel')}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const batch = writeBatch(db);
                      rows.forEach(row => {
                        if (row.id) {
                          const docRef = doc(db, 'requiredPogoPinRows', row.id);
                          batch.delete(docRef);
                        }
                      });
                      await batch.commit();
                      setIsClearModalOpen(false);
                    } catch (error) {
                      console.error("Error clearing data: ", error);
                    }
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                >
                  {t('requiredPogoPin.clearAll')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
