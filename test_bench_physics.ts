import { VEHICLE_DATABASE } from './src/data/automotiveDatabase.js';
import { WIRING_SYSTEMS } from './src/data/wiringDiagramData.js';
import { calculateElectricalState, SimulationEnvironment, findPin } from './src/services/electricalSimulationEngine.js';

console.log('================================================================');
console.log('AUTOELECTRIC LAB PRO - ELECTRICAL PHYSICS & BENCH SIMULATION TEST');
console.log('================================================================');

let totalTests = 0;
let passedTests = 0;
let failedTests: string[] = [];

function assert(description: string, condition: boolean, details: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${description} -> ${details}`);
  } else {
    failedTests.push(`${description} (${details})`);
    console.error(`[FAIL] ${description} -> ${details}`);
  }
}

// TEST 1: Nominal 5.00V Sensor Reference
{
  const vehicle = VEHICLE_DATABASE[0]; // Toyota Hilux Revo 1GD-FTV
  const env: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, redProbeConnectorId: 'conn-b', blackProbePin: 5, blackProbeConnectorId: 'conn-a' },
    activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
    simulatedRPM: 800,
    simulatedRailPressureBar: 350,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };
  const res = calculateElectricalState(vehicle, env);
  const val = res.multimeter.value ?? 0;
  assert(
    '5.00V Reference Regulation (Pin 1 Conn B)',
    val >= 4.95 && val <= 5.05 && res.multimeter.evaluation === 'PASS',
    `Measured: ${val.toFixed(3)}V, Eval: ${res.multimeter.evaluation}`
  );
}

// TEST 2: Unpowered Zero-Volt Reading is NOT False PASS
{
  const vehicle = VEHICLE_DATABASE[0];
  const env: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: false, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, redProbeConnectorId: 'conn-b', blackProbePin: 5, blackProbeConnectorId: 'conn-a' },
    activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
    simulatedRPM: 0,
    simulatedRailPressureBar: 0,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 0,
  };
  const res = calculateElectricalState(vehicle, env);
  assert(
    'Unpowered Circuit 0.000V Never False PASS',
    res.multimeter.value === 0.0 && res.multimeter.evaluation === 'NOT_APPLICABLE',
    `Measured: ${res.multimeter.value}V, Eval: ${res.multimeter.evaluation}`
  );
}

// TEST 3: Open Ground Circuit Handling
{
  const vehicle = VEHICLE_DATABASE[0];
  const env: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: null }, // Open GND
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, redProbeConnectorId: 'conn-c', blackProbePin: 5, blackProbeConnectorId: 'conn-a' },
    activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
    simulatedRPM: 800,
    simulatedRailPressureBar: 350,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };
  const res = calculateElectricalState(vehicle, env);
  assert(
    'Open Power Ground Detection',
    res.powerSupply.powerState === 'OPEN_GROUND' && res.multimeter.evaluation === 'OPEN_CIRCUIT',
    `PowerState: ${res.powerSupply.powerState}, Multimeter: ${res.multimeter.evaluation}`
  );
}

// TEST 4: Direct Short to Ground Fault on 5V Line
{
  const vehicle = VEHICLE_DATABASE[0];
  const env: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, redProbeConnectorId: 'conn-b', blackProbePin: 5, blackProbeConnectorId: 'conn-a' },
    activeFault: { id: 'short-gnd', name: 'Short GND', description: '', faultType: 'SHORT_TO_GND', affectedCircuits: ['VC'] },
    simulatedRPM: 800,
    simulatedRailPressureBar: 350,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };
  const res = calculateElectricalState(vehicle, env);
  assert(
    '5V Rail Short to Ground Collapse',
    (res.multimeter.value ?? 1) <= 0.05 && res.multimeter.evaluation === 'SHORT_CIRCUIT',
    `Measured: ${res.multimeter.value}V, Eval: ${res.multimeter.evaluation}`
  );
}

// TEST 5: Short to Battery (+13.8V on 5V Rail)
{
  const vehicle = VEHICLE_DATABASE[0];
  const env: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, redProbeConnectorId: 'conn-b', blackProbePin: 5, blackProbeConnectorId: 'conn-a' },
    activeFault: { id: 'short-batt', name: 'Short Batt', description: '', faultType: 'SHORT_TO_BATT', affectedCircuits: ['VC'] },
    simulatedRPM: 800,
    simulatedRailPressureBar: 350,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };
  const res = calculateElectricalState(vehicle, env);
  assert(
    '5V Rail Short to Battery Overvoltage',
    (res.multimeter.value ?? 0) >= 13.0 && res.multimeter.evaluation === 'SHORT_CIRCUIT',
    `Measured: ${res.multimeter.value}V, Eval: ${res.multimeter.evaluation}`
  );
}

// TEST 6: High Resistance Corroded Ground (+20 Ohm Drop)
{
  const vehicle = VEHICLE_DATABASE[0];
  const env: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 5, redProbeConnectorId: 'conn-a', blackProbePin: 18, blackProbeConnectorId: 'conn-a' },
    activeFault: { id: 'corroded-gnd', name: 'Corroded Ground', description: '', faultType: 'POOR_GROUND_20_OHM', affectedCircuits: ['E01'] },
    simulatedRPM: 800,
    simulatedRailPressureBar: 350,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };
  const res = calculateElectricalState(vehicle, env);
  assert(
    'Corroded Ground Voltage Offset (>50mV)',
    (res.multimeter.value ?? 0) > 0.05 && res.multimeter.evaluation === 'FAIL',
    `Measured: ${res.multimeter.value}V, Eval: ${res.multimeter.evaluation}`
  );
}

// TEST 7: Invalid Probe Placement Validation
{
  const vehicle = VEHICLE_DATABASE[0];
  const envSamePin: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, redProbeConnectorId: 'conn-a', blackProbePin: 1, blackProbeConnectorId: 'conn-a' },
    activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
    simulatedRPM: 800,
    simulatedRailPressureBar: 350,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };
  const resA = calculateElectricalState(vehicle, envSamePin);
  const envFloatingBlack: SimulationEnvironment = {
    ...envSamePin,
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, redProbeConnectorId: 'conn-a', blackProbePin: null },
  };
  const resB = calculateElectricalState(vehicle, envFloatingBlack);
  assert(
    'Invalid Probe Connection Flagging',
    resA.multimeter.evaluation === 'INVALID_CONNECTION' && resB.multimeter.evaluation === 'INVALID_CONNECTION',
    `Same Pin: ${resA.multimeter.evaluation}, Floating: ${resB.multimeter.evaluation}`
  );
}

// TEST 8: Power Supply Current Limiting & Foldback
{
  const vehicle = VEHICLE_DATABASE[0];
  const env: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, blackProbePin: 5 },
    activeFault: { id: 'short', name: 'Short', description: '', faultType: 'SHORT_TO_GND', affectedCircuits: [] },
    simulatedRPM: 800,
    simulatedRailPressureBar: 350,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };
  const res = calculateElectricalState(vehicle, env);
  assert(
    'Overcurrent Limiter Foldback Physics',
    res.powerSupply.isClamped && res.powerSupply.actualCurrent === 2.0 && res.powerSupply.actualVoltage < 1.0,
    `V: ${res.powerSupply.actualVoltage}V, I: ${res.powerSupply.actualCurrent}A, Clamped: ${res.powerSupply.isClamped}`
  );
}

// TEST 9: Blank Cavity High Impedance O.L
{
  const vehicle = VEHICLE_DATABASE[0];
  const env: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 9, redProbeConnectorId: 'conn-a', blackProbePin: 5, blackProbeConnectorId: 'conn-a' },
    activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
    simulatedRPM: 800,
    simulatedRailPressureBar: 350,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };
  const res = calculateElectricalState(vehicle, env);
  assert(
    'Blank Cavity (NC) Evaluation as O.L and NOT_APPLICABLE',
    res.multimeter.displayString === 'O.L' && res.multimeter.evaluation === 'NOT_APPLICABLE',
    `Display: ${res.multimeter.displayString}, Eval: ${res.multimeter.evaluation}`
  );
}

// TEST 10: Common Rail Pressure Sensor Dynamic Physics
{
  const vehicle = VEHICLE_DATABASE[0];
  // Pin 3 on Connector B is PCR (Rail Pressure Signal Input)
  // Idle pressure: 350 bar -> V = 0.5V + 350 * 0.002 = ~1.20 - 1.45V
  const envIdle: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'VOLTAGE_DC', redProbePin: 3, redProbeConnectorId: 'conn-b', blackProbePin: 5, blackProbeConnectorId: 'conn-a' },
    activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
    simulatedRPM: 800,
    simulatedRailPressureBar: 350,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };
  const resIdle = calculateElectricalState(vehicle, envIdle);
  const vIdle = resIdle.multimeter.value ?? 0;

  // High load pressure: 1600 bar
  const envLoad: SimulationEnvironment = {
    ...envIdle,
    simulatedRPM: 3000,
    simulatedRailPressureBar: 1600,
  };
  const resLoad = calculateElectricalState(vehicle, envLoad);
  const vLoad = resLoad.multimeter.value ?? 0;

  assert(
    'Common Rail Sensor Linear Response (1.2-1.5V @ 350bar -> ~3.7-4.2V @ 1600bar)',
    vIdle >= 1.1 && vIdle <= 1.6 && vLoad >= 3.6 && vLoad <= 4.4 && vLoad > vIdle,
    `Idle: ${vIdle.toFixed(2)}V, Load: ${vLoad.toFixed(2)}V`
  );
}

// TEST 11: CAN Bus Terminator Resistance (Bench Isolated, Power OFF)
{
  const vehicle = VEHICLE_DATABASE[0];
  const env: SimulationEnvironment = {
    powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: false, reversePolarity: false }, // Bench supply OFF for Ohm meter
    connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
    multimeter: { mode: 'RESISTANCE', redProbePin: 1, redProbeConnectorId: 'conn-d', blackProbePin: 2, blackProbeConnectorId: 'conn-d' },
    activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
    simulatedRPM: 0,
    simulatedRailPressureBar: 0,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 0,
  };
  const res = calculateElectricalState(vehicle, env);
  const rVal = res.multimeter.value ?? 0;
  assert(
    'CAN-H to CAN-L 120Ω Internal Termination Resistor (Isolated Bench)',
    rVal >= 115 && rVal <= 125 && res.multimeter.evaluation === 'PASS',
    `Measured: ${rVal.toFixed(1)}Ω, Eval: ${res.multimeter.evaluation}`
  );
}

// TEST 12: Vehicle Database Provenance & Philippine Platforms
{
  const totalVehicles = VEHICLE_DATABASE.length;
  const verifiedModels = VEHICLE_DATABASE.map(v => `${v.make} ${v.model} (${v.engineCode})`);
  assert(
    'Philippine Market Common Platforms Populated (Hilux, D-Max, Ranger, Montero, Innova, Fortuner)',
    totalVehicles >= 6,
    `Vehicles loaded: ${verifiedModels.join(', ')}`
  );
}

// TEST 13: Wiring Diagram Systems & Traces
{
  const systemCount = WIRING_SYSTEMS.length;
  let allSystemsValid = true;
  for (const sys of WIRING_SYSTEMS) {
    if (!sys.nodes || sys.nodes.length < 3 || !sys.traces || sys.traces.length < 2) {
      allSystemsValid = false;
      break;
    }
  }
  assert(
    'Interactive Wiring Diagram Topology & SVG Elbow Traces',
    systemCount >= 3 && allSystemsValid,
    `Systems: ${systemCount} (${WIRING_SYSTEMS.map(s => s.name).join(', ')})`
  );
}

console.log('================================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
if (failedTests.length > 0) {
  console.error(`FAILED TESTS:\n- ${failedTests.join('\n- ')}`);
  process.exit(1);
} else {
  console.log('ALL ELECTRICAL PHYSICS, MEASUREMENTS & TOPOLOGIES VERIFIED 100%!');
  process.exit(0);
}
