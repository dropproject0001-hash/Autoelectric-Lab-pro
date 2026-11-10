/**
 * Automotive Electrical Engineering & ECU Bench Testing Types
 * AutoElectric Lab Pro - RAMT Engineering Suite
 */

export type SignalType =
  | 'POWER_BATT'       // Constant Battery +12V / +24V (Terminal 30 / +B)
  | 'POWER_IGN'        // Switched Ignition +12V (Terminal 15 / IGSW)
  | 'GROUND_POWER'     // High Current Chassis / Power Ground (Terminal 31 / E01, E02)
  | 'GROUND_LOGIC'     // ECU Logic / Microcontroller Ground (E1, ME01)
  | 'SENSOR_5V_REF'    // Regulated 5V Sensor Power Supply (VCC, VC, VREF)
  | 'SENSOR_GROUND'    // Clean Sensor Return Ground (E2, SGND)
  | 'SENSOR_ANALOG_IN' // Analog Sensor Signal Input (0-5V, e.g., MAP, Rail Pressure, TPS)
  | 'SENSOR_DIGITAL_IN'// Digital / Frequency Input (Hall Effect CKP/CMP, MAF freq)
  | 'SENSOR_VR_IN'     // Inductive Variable Reluctance AC Sensor (NE+, G+)
  | 'ACTUATOR_LOW_SIDE'// Low-Side Driver (MOSFET / transistor sinks to ground, e.g. Injector, SCV)
  | 'ACTUATOR_HIGH_SIDE'// High-Side Driver (Switches +12V out)
  | 'CAN_HIGH'         // High-Speed Controller Area Network (CAN-H 2.5V-3.5V)
  | 'CAN_LOW'          // High-Speed Controller Area Network (CAN-L 2.5V-1.5V)
  | 'LIN_BUS'          // Local Interconnect Network single wire bus
  | 'K_LINE'           // ISO 9141-2 / ISO 14230 K-Line diagnostic line
  | 'RESERVED_NC';     // Not connected, blank cavity, or reserved

export type VerificationLevel = 'VERIFIED' | 'CROSS_REFERENCED' | 'UNVERIFIED';

/**
 * Technical Record Provenance Source
 * Tracks the authoritative origin of vehicle specifications, pinouts, and test thresholds.
 * Enforces Phase 1 rule: AI inference must never automatically become OEM-verified data.
 */
export type TechnicalProvenanceSource =
  | 'OEM_MANUAL'               // OEM service / workshop / repair manual
  | 'OEM_WIRING_DIAGRAM'        // Factory electrical wiring diagram (EWD)
  | 'MANUFACTURER_DATASHEET'    // Component / IC manufacturer specification sheet
  | 'ENGINEERING_CALCULATION'   // Independently verified physics or electrical calculation
  | 'MEASUREMENT'               // Empirical physical technician measurement (DMM / DSO bench)
  | 'INFERENCE'                 // AI or computer-vision inference (strictly non-OEM verified)
  | 'UNKNOWN';                  // Unverified or legacy source

export interface ProvenanceRecord {
  source: TechnicalProvenanceSource;
  documentReference?: string;   // e.g. "Toyota Hilux EWD EM26F0E Sec. 2-A p. 44"
  verifiedBy?: string;          // e.g. "RAMT Senior Automotive Electrical Engineer"
  timestamp?: string;           // ISO date string
  confidenceScore?: number;     // 0.0 to 1.0 (for AI inference)
  notes?: string;
}

export type MeasurementEvaluation =
  | 'PASS'
  | 'FAIL'
  | 'OPEN_CIRCUIT'
  | 'SHORT_CIRCUIT'
  | 'INVALID_CONNECTION'
  | 'UNVERIFIED'
  | 'NOT_APPLICABLE';

export interface ConnectorPin {
  pinNumber: number;
  connectorId: string;
  connectorName: string;
  label: string;
  functionDesc: string;
  signalType: SignalType;
  wireColor: string; // e.g. "W-B" (White-Black), "B-R" (Black-Red), "NC"
  wireGaugeMm2?: number; // e.g. 0.5, 1.25, 2.0
  isPopulated: boolean; // false if empty / blank cavity
  row?: number; // 1-indexed row in connector
  col?: number; // 1-indexed col in connector
  nominalVoltageMin: number;
  nominalVoltageMax: number;
  expectedIdleVoltageMin?: number; // Expected live idle bench potential
  expectedIdleVoltageMax?: number;
  expectedKeyOffVoltage?: number; // Expected potential with Key OFF (0V or 12.6V)
  nominalResistanceMin?: number; // in Ohms
  nominalResistanceMax?: number; // in Ohms
  diodeModeVfMin?: number; // in Volts (e.g. 0.45 - 0.70 V)
  diodeModeVfMax?: number;
  testCondition: string; // e.g., "Key ON, engine stopped", "Key OFF, bench power 13.8V"
  expectedBehavior: string;
  verificationLevel: VerificationLevel;
  verificationSource: string; // e.g. "Toyota Hilux EWD Section 4, p. 112"
  provenance?: TechnicalProvenanceSource;
  provenanceDetails?: ProvenanceRecord;
  failureSymptom: string; // e.g. "No start, 5V reference short throws P0641"
  boardTestPoint?: string; // e.g. "TP_VCC5, Pin 12 of IC402"
}

export interface ConnectorCompleteness {
  connectorId: string;
  connectorName: string;
  totalCavities: number;
  populatedCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  blankCount: number;
  completenessPct: number;
}

export interface ECUConnector {
  id: string;
  name: string;
  color: string;
  pinCount: number; // total physical cavities
  rows: number;
  cols: number;
  receptacleType: string; // e.g. "Denso 34-pin Waterproof Sealed"
  pins: ConnectorPin[];
}

export interface VehicleProfile {
  id: string;
  make: string;
  model: string;
  productionYears: string;
  chassisCode: string; // e.g., "GUN126", "RF20", "KS0W"
  engineCode: string;
  engineDisp: string;
  fuelType: 'DIESEL' | 'GASOLINE' | 'HYBRID';
  market: string;
  ecuManufacturer: 'Denso' | 'Bosch' | 'Transtron' | 'Continental' | 'Delphi' | 'Hitachi' | 'Keihin';
  ecuModel: string;
  ecuPartNumber: string;
  ecuPartVariants?: string[];
  hardwareNumber: string;
  softwareNumber?: string;
  socketCount: number;
  connectors: ECUConnector[];
  description: string;
  verifiedStatus: VerificationLevel;
  pinoutSource: string;
  provenance?: TechnicalProvenanceSource;
  provenanceDetails?: ProvenanceRecord;
  completenessReports: ConnectorCompleteness[];
}

export interface WiringNode {
  id: string;
  label: string;
  type: 'BATTERY' | 'IGNITION_SWITCH' | 'MAIN_RELAY' | 'FUSE' | 'JUNCTION' | 'SENSOR' | 'ACTUATOR' | 'ECU_PIN' | 'CHASSIS_GROUND';
  componentName: string;
  ratingOrValue?: string;
  x: number;
  y: number;
}

export interface WiringTrace {
  id: string;
  name: string;
  circuitType: 'POWER_DISTRIBUTION' | 'SENSOR_5V_REF' | 'INJECTION_CONTROL' | 'CAN_NETWORK' | 'STARTING_CHARGING';
  wireColor: string;
  wireGauge: string;
  nodeIds: string[]; // sequence of connected nodes
  nominalVoltage: number;
  currentNormalAmps: number;
  status: 'NORMAL' | 'OPEN' | 'SHORT_GND' | 'SHORT_BATT' | 'HIGH_RESISTANCE';
}

export interface BenchReading {
  id: string;
  pinNumber: number;
  connectorId: string;
  pinLabel: string;
  measurementType: 'VOLTAGE_DC' | 'VOLTAGE_AC' | 'RESISTANCE' | 'DIODE' | 'CONTINUITY' | 'CURRENT';
  measuredValue: number;
  unit: string;
  expectedMin: number;
  expectedMax: number;
  status: MeasurementEvaluation;
  notes: string;
  timestamp: string;
  technicianName?: string;
}

export interface DTCRecord {
  code: string;
  title: string;
  description: string;
  ecuFamily: string;
  applicableVehicles: string[];
  possibleCauses: string[];
  pinReference?: string;
  benchTestStep: string;
  componentReadingRef: string;
  severity: 'CRITICAL_NO_START' | 'LIMP_MODE' | 'CHECK_ENGINE_WARNING';
}

export interface PCBComponent {
  id: string;
  designation: string; // e.g. "IC101", "D204", "Q301"
  partNumber: string; // e.g. "TLE6244X", "Bosch 30620", "IRFR5305"
  package: string; // e.g. "MQFP-64", "DPAK", "SOT-223"
  functionRole: string; // e.g. "Quad Low-Side Injector Peak-and-Hold Driver"
  testPins: {
    pin: string;
    description: string;
    normalReading: string;
    failureReading: string;
  }[];
  commonFailure: string;
  repairAdvice: string;
}

export interface ElectricalFault {
  id: string;
  name: string;
  description: string;
  targetPinNumber?: number;
  faultType:
    | 'NONE'
    | 'OPEN_CIRCUIT'
    | 'SHORT_TO_GND'
    | 'SHORT_TO_BATT'
    | 'SHORT_TO_5V'
    | 'HIGH_RESISTANCE_50_OHM'
    | 'POOR_GROUND_20_OHM'
    | 'OVERCURRENT_TRIP'
    | 'REVERSED_POLARITY';
  affectedCircuits: string[];
}

export interface VirtualInstrumentState {
  powerSupply: {
    voltageSet: number; // e.g. 13.8V
    currentLimitSet: number; // e.g. 2.0A
    outputEnabled: boolean;
    measuredVoltage: number;
    measuredCurrent: number;
    isOvercurrent: boolean;
    reversePolarity: boolean;
  };
  multimeter: {
    mode: 'VOLTAGE_DC' | 'VOLTAGE_AC' | 'RESISTANCE' | 'DIODE' | 'CONTINUITY';
    redProbePin: number | null;
    redProbeConnector: string | null;
    blackProbePin: number | null;
    blackProbeConnector: string | null;
    displayValue: string;
    displayUnit: string;
    isBeeping: boolean;
    isOverLimit: boolean;
  };
  oscilloscope: {
    ch1Pin: number | null;
    ch2Pin: number | null;
    timebaseMs: number; // e.g. 2ms / div
    voltsPerDivCh1: number; // e.g. 5V / div
    voltsPerDivCh2: number;
    triggerLevelV: number;
    isRunning: boolean;
    ch1FrequencyHz: number;
    ch1DutyCyclePct: number;
    ch1PeakToPeakV: number;
  };
  signalGenerator: {
    waveform: 'SINE' | 'SQUARE' | 'VR_CRANK_60_2' | 'PWM' | 'DC';
    frequencyHz: number;
    amplitudeV: number;
    dutyCyclePct: number;
    targetPin: number | null;
    outputEnabled: boolean;
  };
  activeFault: ElectricalFault;
}
