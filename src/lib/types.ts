// Centralized Firestore data types

export interface Product {
  id: string;
  device?: string;
  facility?: string;
  projectName?: string;
  nickname?: string;
  tester?: string;
  handler?: string;
  temperature?: string;
  insertion?: string;
  siteNumber?: string;
  ballCountDevice?: string;
  changeKitGroup?: string;
  kitName1?: string; kitName2?: string; kitName3?: string;
  kitName4?: string; kitName5?: string; kitName6?: string;
  lbGroup?: string;
  socketName1?: string;
  socketName2?: string;
}

export interface Socket {
  id: string;
  toolsId?: string;
  facility?: string;
  package?: string;
  pinBall?: string;
  packageSize?: string;
  project?: string;
  status?: string;
  contactCountPin1?: number | string;
  lifeCountPin1?: number | string;
  contactLimitPin1?: number | string;
  socketGroupPin1?: string;
  contactCountOver70Pin1?: boolean | string | number;
  pogoPinPnPin1?: string;
  socketPnPin1?: string;
  usedFag?: string;
  contactCountPin2?: number | string;
  lifeCountPin2?: number | string;
  contactLimitPin2?: number | string;
  contactCountOver70Pin2?: boolean | string | number;
  pogoPinPnPin2?: string;
  contactCountPcb?: number | string;
  lifeCountPcb?: number | string;
  contactLimitPcb?: number | string;
  contactCountOver70Pcb?: boolean | string | number;
  pnPcb?: string;
}

export interface ChangeKit {
  id: string;
  kind?: string;
  facility?: string;
  location?: string;
  toolsId?: string;
  packageSize?: string;
  changeKitGroup?: string;
  status?: string;
  idleTime?: string;
}

export interface PogoPin {
  id: string;
  pinPn?: string;
  facility?: string;
  qty?: number | string;
}

export interface LifeTime {
  id: string;
  socketGroup?: string;
  facility?: string;
  pogoPin1Pn?: string;
  pogoPinQty?: number | string;
  pogoPin2Pn?: string;
  pogoPin2Qty?: number | string;
  pogoPin3Pn?: string;
  pogoPin3Qty?: number | string;
  pogoPin4Pn?: string;
  pogoPin4Qty?: number | string;
  lifeTime?: string | number;
  loadBoardGroup?: string;
  remark?: string;
}

export interface LoadBoard {
  id: string;
  projectName?: string;
  lbName?: string;
  lbGroup?: string;
  location?: string;
  insertion?: string;
  availableQty?: string;
  remark?: string;
  sendBackDate?: string;
  targetReturnDate?: string;
  facility?: string;
}

export interface RequiredPogoPinRow {
  id: string;
  partNo?: string;
  qty?: number | string;
  remark?: string;
  pogoPins?: { name: string; need: number }[];
  facility?: string;
}

export interface MaintenanceRecord {
  id: string;
  facility?: string;
  lbNo?: string;
  sniNo?: string;
  lbType?: string;
  insertion?: string;
  vendor?: string;
  status?: string;
  site?: string;
  issue?: string;
  issueDate?: string;
  repairDate?: string;
  action?: string;
  createdBy?: string;
  createdAt?: string;
}
