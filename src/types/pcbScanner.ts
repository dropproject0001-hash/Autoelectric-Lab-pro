/**
 * Data Types & Interfaces for AI Schematic & PCB Intelligence Scanner
 * AutoElectric Lab Pro - RAMT Engineering Suite
 */

import { MeasurementEvaluation, SignalType } from './automotive';

export type DocumentType = 
  | 'ELECTRICAL_SCHEMATIC'
  | 'PCB_LAYOUT'
  | 'PHYSICAL_PCB_PHOTO'
  | 'CONNECTOR_PINOUT'
  | 'TECHNICAL_DOC'
  | 'UNKNOWN';

export type ComponentCategory =
  | 'RESISTOR'
  | 'CAPACITOR'
  | 'ELECTROLYTIC_CAP'
  | 'CERAMIC_CAP'
  | 'DIODE'
  | 'ZENER_DIODE'
  | 'TVS_DIODE'
  | 'TRANSISTOR'
  | 'MOSFET'
  | 'IGBT'
  | 'VOLTAGE_REGULATOR'
  | 'DCDC_CONVERTER'
  | 'OP_AMP'
  | 'COMPARATOR'
  | 'MICROCONTROLLER'
  | 'EEPROM'
  | 'CAN_TRANSCEIVER'
  | 'LIN_TRANSCEIVER'
  | 'INJECTOR_DRIVER_IC'
  | 'IGNITION_DRIVER_IC'
  | 'RELAY_DRIVER'
  | 'POWER_MANAGEMENT_IC'
  | 'CURRENT_SENSE_RESISTOR'
  | 'INDUCTOR'
  | 'TRANSFORMER'
  | 'CRYSTAL'
  | 'FUSE'
  | 'CONNECTOR'
  | 'TEST_POINT'
  | 'UNKNOWN';

export type VerificationStatus =
  | 'VERIFIED'
  | 'CROSS_REFERENCED'
  | 'UNVERIFIED'
  | 'UNKNOWN';

export type ReadoutClassification =
  | 'SIMULATED'
  | 'MEASURED'
  | 'EXPECTED'
  | 'UNKNOWN';

export interface BoundingBox {
  ymin: number; // 0 - 1000 (normalized relative coordinates)
  xmin: number; // 0 - 1000
  ymax: number; // 0 - 1000
  xmax: number; // 0 - 1000
}

export interface DetectedComponent {
  id: string;
  refDes: string; // e.g., R103, C25, D12, U10, Q5, TP1
  category: ComponentCategory;
  marking: string; // e.g., "102", "7805", "2N7002"
  decodedValue: string; // e.g., "1 kΩ", "5V 1A", "4.7 µF"
  packageType: string; // e.g., "SMD 0805", "TO-252 DPAK", "QFP-64"
  bbox: BoundingBox;
  confidenceScore: number; // 0.0 - 1.0
  verificationStatus: VerificationStatus;
  circuitFunction: string;
  connectedNetIds: string[];
  nominalVoltageMin?: number;
  nominalVoltageMax?: number;
  nominalResistanceMin?: number;
  nominalResistanceMax?: number;
  diodeModeVfMin?: number;
  diodeModeVfMax?: number;
  testCondition?: string;
  expectedBehavior?: string;
  failureSymptom?: string;
  datasheetRef?: string;
  sourceImageId: string;
  notes?: string;
}

export interface ComponentTerminal {
  id: string;
  componentId: string;
  terminalName: string; // e.g., "1", "2", "Gate", "Drain", "Source", "VCC", "GND"
  bbox: BoundingBox;
  netId?: string;
}

export interface ElectricalNet {
  id: string;
  name: string; // e.g., "NET_12V_BATT", "NET_5V_REF", "NET_INJ1_SINK"
  signalType: SignalType;
  connectedComponentIds: string[];
  connectedTerminalIds: string[];
  tracePoints: { x: number; y: number }[]; // 0-1000 normalized coordinates
  verificationStatus: VerificationStatus;
  isComplete: boolean;
  incompleteNotes?: string;
}

export interface AuditHistoryRecord {
  id: string;
  timestamp: string;
  technicianId: string;
  componentId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY';
  fieldChanged: string;
  previousValue: string;
  newValue: string;
  rationale: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  documentType: DocumentType;
  imageUrl: string;
  originalFileName: string;
  fileSizeMb: number;
  uploadTimestamp: string;
  widthPx: number;
  heightPx: number;
  description: string;
}

export interface BoardRevisionComparison {
  id: string;
  baseProjectName: string;
  targetProjectName: string;
  differences: {
    refDes: string;
    type: 'MISSING' | 'ADDED' | 'VALUE_CHANGED' | 'MARKING_CHANGED' | 'TRACE_SHIFT';
    baseValue?: string;
    targetValue?: string;
    description: string;
  }[];
  notes: string;
}

export interface TechnicianAnnotation {
  id: string;
  x: number; // 0-1000 normalized coordinates
  y: number; // 0-1000
  text: string;
  category: 'NOTE' | 'CORROSION' | 'BURNT_COMPONENT' | 'TEST_POINT_PIN' | 'BROKEN_TRACE';
  author: string;
  timestamp: string;
}

export interface LayerVisibilityConfig {
  showPhotoBase: boolean;
  showComponents: boolean;
  showTraces: boolean;
  showAnnotations: boolean;
}

export interface PCBProject {
  id: string;
  name: string;
  vehicleModel: string;
  ecuModel: string;
  ecuPartNumber: string;
  documents: UploadedDocument[];
  activeDocumentId: string;
  components: DetectedComponent[];
  nets: ElectricalNet[];
  annotations?: TechnicianAnnotation[];
  auditHistory: AuditHistoryRecord[];
  createdAt: string;
  updatedAt: string;
  notes: string;
}
