import { WiringNode, WiringTrace } from '../types/automotive';

export interface WiringDiagramSystem {
  id: string;
  name: string;
  description: string;
  nodes: WiringNode[];
  traces: WiringTrace[];
}

export const WIRING_SYSTEMS: WiringDiagramSystem[] = [
  {
    id: 'sys-crdi-power',
    name: 'Common Rail Diesel Power & Wake-Up Circuit',
    description: 'Battery feed, 30A EFI Fuse, EFI Main Relay, Ignition Switch wake-up, and ECU Main Power (+B, +B2, IGSW, E01, ME01).',
    nodes: [
      { id: 'node-batt-12v', label: '12V Lead-Acid Battery', type: 'BATTERY', componentName: 'Vehicle Battery (Terminal 30)', ratingOrValue: '12.6V 75Ah', x: 60, y: 140 },
      { id: 'node-chassis-gnd', label: 'Chassis Ground G1', type: 'CHASSIS_GROUND', componentName: 'Battery Negative to Engine Block', ratingOrValue: '0.0V Ground', x: 60, y: 340 },
      { id: 'node-fusible-link', label: 'Main Fusible Link 100A', type: 'FUSE', componentName: 'Battery Distribution Block', ratingOrValue: '100A Bolt-on', x: 170, y: 140 },
      { id: 'node-ign-switch', label: 'Ignition Key Switch', type: 'IGNITION_SWITCH', componentName: 'Steering Column Switch (IGSW)', ratingOrValue: 'OFF - ACC - ON - START', x: 280, y: 70 },
      { id: 'node-ign-fuse', label: 'IGN Fuse 10A', type: 'FUSE', componentName: 'Cabin Fuse Box', ratingOrValue: '10A Blade', x: 420, y: 70 },
      { id: 'node-efi-fuse', label: 'EFI Main Fuse 30A', type: 'FUSE', componentName: 'Engine Room Fuse Box', ratingOrValue: '30A JCASE', x: 280, y: 190 },
      { id: 'node-relay-contact-in', label: 'EFI Relay Pin 30', type: 'JUNCTION', componentName: 'Relay Power Input', ratingOrValue: '+12V Direct', x: 400, y: 190 },
      { id: 'node-main-relay', label: 'EFI Main Relay', type: 'MAIN_RELAY', componentName: 'Denso 4-Pin Sealed Micro Relay', ratingOrValue: '12V 40A Coil ~80Ω', x: 490, y: 220 },
      { id: 'node-relay-coil-gnd', label: 'Relay Coil M-REL Control', type: 'JUNCTION', componentName: 'ECU Low-Side Coil Drive', ratingOrValue: '0V active', x: 490, y: 310 },
      { id: 'node-relay-out-87', label: 'EFI Relay Switched Pin 87', type: 'JUNCTION', componentName: 'Relay Switched Output', ratingOrValue: '+12V Switched', x: 580, y: 190 },
      { id: 'node-ecu-b1', label: 'ECU Pin C1 (+B)', type: 'ECU_PIN', componentName: 'Denso ECU Pin C1 Main Power', ratingOrValue: '+12V Switched', x: 740, y: 170 },
      { id: 'node-ecu-b2', label: 'ECU Pin C2 (+B2)', type: 'ECU_PIN', componentName: 'Denso ECU Pin C2 Actuator Power', ratingOrValue: '+12V Switched', x: 740, y: 220 },
      { id: 'node-ecu-igsw', label: 'ECU Pin C4 (IGSW)', type: 'ECU_PIN', componentName: 'Denso ECU Pin C4 Ignition Wakeup', ratingOrValue: '+12V Wakeup', x: 740, y: 70 },
      { id: 'node-ecu-mrel', label: 'ECU Pin C5 (M-REL)', type: 'ECU_PIN', componentName: 'Denso ECU Pin C5 Relay Coil Output', ratingOrValue: 'High-Side Switch', x: 740, y: 310 },
      { id: 'node-ecu-e01', label: 'ECU Pin A5 (E01 Power GND)', type: 'ECU_PIN', componentName: 'Denso ECU Pin A5 Power Ground', ratingOrValue: 'GND Return', x: 740, y: 380 },
      { id: 'node-ecu-me01', label: 'ECU Pin C10 (ME01 Main GND)', type: 'ECU_PIN', componentName: 'Denso ECU Pin C10 Engine Ground', ratingOrValue: 'GND Return', x: 740, y: 430 }
    ],
    traces: [
      {
        id: 'trace-batt-to-link',
        name: 'Battery Positive Feed',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'R',
        wireGauge: '20 mm²',
        nodeIds: ['node-batt-12v', 'node-fusible-link'],
        nominalVoltage: 12.6,
        currentNormalAmps: 15.0,
        status: 'NORMAL'
      },
      {
        id: 'trace-link-to-ign',
        name: 'Unswitched Battery to Ignition Switch',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'W-R',
        wireGauge: '2.0 mm²',
        nodeIds: ['node-fusible-link', 'node-ign-switch'],
        nominalVoltage: 12.6,
        currentNormalAmps: 1.2,
        status: 'NORMAL'
      },
      {
        id: 'trace-ign-to-fuse',
        name: 'Ignition Switch Switched Output',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'B-R',
        wireGauge: '1.25 mm²',
        nodeIds: ['node-ign-switch', 'node-ign-fuse'],
        nominalVoltage: 12.5,
        currentNormalAmps: 0.8,
        status: 'NORMAL'
      },
      {
        id: 'trace-ign-fuse-to-ecu',
        name: 'IGSW Ignition Signal Wire to ECU',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'B-O',
        wireGauge: '0.75 mm²',
        nodeIds: ['node-ign-fuse', 'node-ecu-igsw'],
        nominalVoltage: 12.5,
        currentNormalAmps: 0.05,
        status: 'NORMAL'
      },
      {
        id: 'trace-link-to-efi-fuse',
        name: 'Constant 12V to EFI Main Fuse',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'W-B',
        wireGauge: '3.0 mm²',
        nodeIds: ['node-fusible-link', 'node-efi-fuse'],
        nominalVoltage: 12.6,
        currentNormalAmps: 8.5,
        status: 'NORMAL'
      },
      {
        id: 'trace-efi-fuse-to-relay',
        name: 'EFI Relay Supply Contact Wire',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'B-W',
        wireGauge: '2.0 mm²',
        nodeIds: ['node-efi-fuse', 'node-relay-contact-in', 'node-main-relay'],
        nominalVoltage: 12.6,
        currentNormalAmps: 8.5,
        status: 'NORMAL'
      },
      {
        id: 'trace-relay-to-ecu-b1',
        name: 'Switched Main Power +B to ECU',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'B-R',
        wireGauge: '1.5 mm²',
        nodeIds: ['node-main-relay', 'node-relay-out-87', 'node-ecu-b1'],
        nominalVoltage: 12.5,
        currentNormalAmps: 4.2,
        status: 'NORMAL'
      },
      {
        id: 'trace-relay-to-ecu-b2',
        name: 'Switched Actuator Power +B2 to ECU',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'B-R',
        wireGauge: '1.5 mm²',
        nodeIds: ['node-relay-out-87', 'node-ecu-b2'],
        nominalVoltage: 12.5,
        currentNormalAmps: 3.8,
        status: 'NORMAL'
      },
      {
        id: 'trace-ecu-to-mrel-coil',
        name: 'M-REL Relay Coil Control Line',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'G-R',
        wireGauge: '0.75 mm²',
        nodeIds: ['node-ecu-mrel', 'node-relay-coil-gnd', 'node-main-relay'],
        nominalVoltage: 12.0,
        currentNormalAmps: 0.15,
        status: 'NORMAL'
      },
      {
        id: 'trace-ecu-ground-return',
        name: 'Main Engine Ground Return',
        circuitType: 'POWER_DISTRIBUTION',
        wireColor: 'W-B',
        wireGauge: '2.0 mm²',
        nodeIds: ['node-ecu-me01', 'node-ecu-e01', 'node-chassis-gnd'],
        nominalVoltage: 0.02,
        currentNormalAmps: 8.0,
        status: 'NORMAL'
      }
    ]
  },
  {
    id: 'sys-sensor-5v-crdi',
    name: '5V Sensor Reference & Rail Pressure Circuit',
    description: 'ECU internal regulated 5.00V reference (VC), clean isolated sensor ground (E2), and Fuel Rail Pressure & Boost (MAP) transducer feedback.',
    nodes: [
      { id: 'node-ecu-vc', label: 'ECU Pin B1 (VC 5V Ref)', type: 'ECU_PIN', componentName: 'Denso 5V Precision Linear Regulator', ratingOrValue: '5.00V ± 0.05V', x: 120, y: 120 },
      { id: 'node-ecu-e2', label: 'ECU Pin B2 (E2 Sensor GND)', type: 'ECU_PIN', componentName: 'Denso Isolated Sensor Ground Return', ratingOrValue: '0.00V ADC GND', x: 120, y: 260 },
      { id: 'node-ecu-pcr', label: 'ECU Pin B3 (PCR Rail Signal)', type: 'ECU_PIN', componentName: 'Denso ADC Channel 4 Rail Pressure', ratingOrValue: '0.5V - 4.5V', x: 120, y: 190 },
      { id: 'node-ecu-pim', label: 'ECU Pin B4 (PIM Boost Signal)', type: 'ECU_PIN', componentName: 'Denso ADC Channel 5 Manifold Pressure', ratingOrValue: '1.0V - 4.2V', x: 120, y: 340 },
      { id: 'node-junc-5v-splice', label: 'Harness 5V Splice J/B 2', type: 'JUNCTION', componentName: 'Engine Harness Factory Ultrasonically Welded Splice', ratingOrValue: '5.0V Bus', x: 340, y: 120 },
      { id: 'node-junc-gnd-splice', label: 'Harness Sensor GND Splice J/B 3', type: 'JUNCTION', componentName: 'Engine Harness Clean Sensor Return Splice', ratingOrValue: '0V Bus', x: 340, y: 260 },
      { id: 'node-rail-sensor', label: 'Common Rail Pressure Sensor', type: 'SENSOR', componentName: 'Denso Piezo-Resistive Pressure Transducer (2500 Bar)', ratingOrValue: 'Pin 1: 5V | Pin 2: Sig | Pin 3: GND', x: 620, y: 160 },
      { id: 'node-map-sensor', label: 'MAP / Boost Pressure Sensor', type: 'SENSOR', componentName: 'Denso Silicon Micro-machined Diaphragm (3.0 Bar)', ratingOrValue: 'Pin 1: GND | Pin 2: Sig | Pin 3: 5V', x: 620, y: 320 }
    ],
    traces: [
      {
        id: 'trace-vc-to-splice',
        name: '5V Sensor Reference Main Line',
        circuitType: 'SENSOR_5V_REF',
        wireColor: 'R-W',
        wireGauge: '0.5 mm²',
        nodeIds: ['node-ecu-vc', 'node-junc-5v-splice'],
        nominalVoltage: 5.0,
        currentNormalAmps: 0.045,
        status: 'NORMAL'
      },
      {
        id: 'trace-splice-to-rail-vc',
        name: '5V Supply to Rail Pressure Sensor',
        circuitType: 'SENSOR_5V_REF',
        wireColor: 'R-W',
        wireGauge: '0.5 mm²',
        nodeIds: ['node-junc-5v-splice', 'node-rail-sensor'],
        nominalVoltage: 5.0,
        currentNormalAmps: 0.025,
        status: 'NORMAL'
      },
      {
        id: 'trace-splice-to-map-vc',
        name: '5V Supply to MAP Sensor',
        circuitType: 'SENSOR_5V_REF',
        wireColor: 'R-W',
        wireGauge: '0.5 mm²',
        nodeIds: ['node-junc-5v-splice', 'node-map-sensor'],
        nominalVoltage: 5.0,
        currentNormalAmps: 0.02,
        status: 'NORMAL'
      },
      {
        id: 'trace-rail-signal-to-ecu',
        name: 'PCR Rail Pressure Signal Wire',
        circuitType: 'SENSOR_5V_REF',
        wireColor: 'LG-B',
        wireGauge: '0.5 mm²',
        nodeIds: ['node-rail-sensor', 'node-ecu-pcr'],
        nominalVoltage: 1.35,
        currentNormalAmps: 0.001,
        status: 'NORMAL'
      },
      {
        id: 'trace-map-signal-to-ecu',
        name: 'PIM Boost Pressure Signal Wire',
        circuitType: 'SENSOR_5V_REF',
        wireColor: 'Y-G',
        wireGauge: '0.5 mm²',
        nodeIds: ['node-map-sensor', 'node-ecu-pim'],
        nominalVoltage: 1.85,
        currentNormalAmps: 0.001,
        status: 'NORMAL'
      },
      {
        id: 'trace-sensor-gnd-return',
        name: 'Sensor Ground Return Loop (E2)',
        circuitType: 'SENSOR_5V_REF',
        wireColor: 'BR-W',
        wireGauge: '0.5 mm²',
        nodeIds: ['node-rail-sensor', 'node-map-sensor', 'node-junc-gnd-splice', 'node-ecu-e2'],
        nominalVoltage: 0.01,
        currentNormalAmps: 0.045,
        status: 'NORMAL'
      }
    ]
  },
  {
    id: 'sys-can-network',
    name: 'Powertrain High-Speed CAN Bus (500 kbps)',
    description: 'Controller Area Network differential pair (CAN-H / CAN-L) linking Engine ECU, Transmission TCM, ABS/VSC, and Steering Angle Sensor with two 120Ω end-of-line termination resistors (60Ω net).',
    nodes: [
      { id: 'node-ecu-canh', label: 'Engine ECU Pin D1 (CAN-H)', type: 'ECU_PIN', componentName: 'Denso ECM Internal 120Ω Terminator', ratingOrValue: '2.5V-3.5V (500 kbps)', x: 100, y: 150 },
      { id: 'node-ecu-canl', label: 'Engine ECU Pin D2 (CAN-L)', type: 'ECU_PIN', componentName: 'Denso ECM Internal 120Ω Terminator', ratingOrValue: '2.5V-1.5V (500 kbps)', x: 100, y: 270 },
      { id: 'node-tcm-node', label: 'Aisin 6-Speed TCM', type: 'ACTUATOR', componentName: 'Transmission Control Module', ratingOrValue: 'Node ID: 0x1F0', x: 320, y: 210 },
      { id: 'node-abs-node', label: 'Advics ABS / VSC Skid Control', type: 'ACTUATOR', componentName: 'Brake ECU with 120Ω Terminator #2', ratingOrValue: 'Node ID: 0x0B0', x: 540, y: 210 },
      { id: 'node-obd-dlc3', label: 'DLC3 OBD-II Diagnostic Port', type: 'JUNCTION', componentName: 'Under-dash Diagnostic Connector (Pins 6 & 14)', ratingOrValue: 'CAN Pin 6 & 14', x: 740, y: 210 }
    ],
    traces: [
      {
        id: 'trace-can-high',
        name: 'CAN-High Twisted Bus Line (500 kbps)',
        circuitType: 'CAN_NETWORK',
        wireColor: 'B',
        wireGauge: '0.5 mm² Twisted',
        nodeIds: ['node-ecu-canh', 'node-tcm-node', 'node-abs-node', 'node-obd-dlc3'],
        nominalVoltage: 2.7,
        currentNormalAmps: 0.035,
        status: 'NORMAL'
      },
      {
        id: 'trace-can-low',
        name: 'CAN-Low Twisted Bus Line (500 kbps)',
        circuitType: 'CAN_NETWORK',
        wireColor: 'W',
        wireGauge: '0.5 mm² Twisted',
        nodeIds: ['node-ecu-canl', 'node-tcm-node', 'node-abs-node', 'node-obd-dlc3'],
        nominalVoltage: 2.3,
        currentNormalAmps: 0.035,
        status: 'NORMAL'
      }
    ]
  }
];
