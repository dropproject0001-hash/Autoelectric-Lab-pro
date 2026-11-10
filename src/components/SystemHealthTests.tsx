import React, { useState } from 'react';
import { VEHICLE_DATABASE } from '../data/automotiveDatabase';
import { WIRING_SYSTEMS } from '../data/wiringDiagramData';
import { calculateElectricalState, SimulationEnvironment, findPin } from '../services/electricalSimulationEngine';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  X,
  Cpu,
  Layers,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface TestCase {
  id: string;
  name: string;
  category: 'BENCH_PHYSICS' | 'FAULT_DIAGNOSTICS' | 'PROBE_VALIDATION' | 'SYSTEM_TOPOLOGY';
  description: string;
  run: () => { passed: boolean; message: string; measured: string; expected: string };
}

interface SystemHealthTestsProps {
  onClose: () => void;
}

export const SystemHealthTests: React.FC<SystemHealthTestsProps> = ({ onClose }) => {
  const [testResults, setTestResults] = useState<{ [id: string]: { passed: boolean; message: string; measured: string; expected: string } } | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const testCases: TestCase[] = [
    {
      id: 'test-1-5v-reference-nominal',
      name: '1. Verified 5.00V Sensor Reference Regulation (VC)',
      category: 'BENCH_PHYSICS',
      description: 'Measures Pin 1 on Connector B (VC / VCC1) with 13.8V bench supply and Key ON. Must read 4.95V - 5.05V and evaluate PASS.',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0]; // Toyota Hilux Revo
        const env: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
          multimeter: { 
            mode: 'VOLTAGE_DC', 
            redProbePin: 1, 
            redProbeConnectorId: 'conn-b', 
            blackProbePin: 5, 
            blackProbeConnectorId: 'conn-a' 
          },
          activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };
        const result = calculateElectricalState(vehicle, env);
        const val = result.multimeter.value ?? 0;
        const evaluation = result.multimeter.evaluation;
        const passed = val >= 4.95 && val <= 5.05 && evaluation === 'PASS';
        return {
          passed,
          message: passed ? '5.00V reference regulator holds within OEM ±1% tolerance and evaluates PASS' : '5V rail voltage outside specification',
          measured: `${val.toFixed(3)} V [${evaluation}]`,
          expected: '4.95 - 5.05 V [PASS]',
        };
      },
    },
    {
      id: 'test-2-missing-5v-open-circuit',
      name: '2. Missing 5V Sensor Reference (Open Circuit)',
      category: 'FAULT_DIAGNOSTICS',
      description: 'Injects OPEN_CIRCUIT on 5V rail. Voltage collapses to 0.000V and engine evaluates OPEN_CIRCUIT (never false PASS).',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0];
        const env: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
          multimeter: { 
            mode: 'VOLTAGE_DC', 
            redProbePin: 1, 
            redProbeConnectorId: 'conn-b', 
            blackProbePin: 5, 
            blackProbeConnectorId: 'conn-a' 
          },
          activeFault: { id: 'open-5v', name: 'Open 5V Line', description: '', faultType: 'OPEN_CIRCUIT', affectedCircuits: ['VC'] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };
        const result = calculateElectricalState(vehicle, env);
        const val = result.multimeter.value ?? 0;
        const evaluation = result.multimeter.evaluation;
        const passed = val === 0.0 && evaluation === 'OPEN_CIRCUIT';
        return {
          passed,
          message: passed ? 'Missing 5V line correctly evaluated as OPEN_CIRCUIT (0.000V reading)' : 'Failed to detect OPEN_CIRCUIT on disconnected line',
          measured: `${val.toFixed(3)} V [${evaluation}]`,
          expected: '0.000 V [OPEN_CIRCUIT]',
        };
      },
    },
    {
      id: 'test-3-open-ground-fault',
      name: '3. Open Ground Return Fault & Floating Plane',
      category: 'FAULT_DIAGNOSTICS',
      description: 'Disconnects ECU power ground return. Internal ground plane floats to battery voltage (~13.6V) and evaluates OPEN_CIRCUIT.',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0];
        const env: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: null }, // Ground return open!
          multimeter: { 
            mode: 'VOLTAGE_DC', 
            redProbePin: 1, 
            redProbeConnectorId: 'conn-c', 
            blackProbePin: 5, 
            blackProbeConnectorId: 'conn-a' 
          },
          activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };
        const result = calculateElectricalState(vehicle, env);
        const powerState = result.powerSupply.powerState;
        const evaluation = result.multimeter.evaluation;
        const passed = powerState === 'OPEN_GROUND' && evaluation === 'OPEN_CIRCUIT';
        return {
          passed,
          message: passed ? 'Open ground return recognized: powerState is OPEN_GROUND and evaluation is OPEN_CIRCUIT' : 'Failed to detect open ground condition',
          measured: `PowerState: ${powerState} [${evaluation}]`,
          expected: 'OPEN_GROUND [OPEN_CIRCUIT]',
        };
      },
    },
    {
      id: 'test-4-short-to-ground',
      name: '4. Direct Short to Ground Fault (0.02V Collapse)',
      category: 'FAULT_DIAGNOSTICS',
      description: 'Injects SHORT_TO_GND on 5V sensor line. Voltage collapses to 0.02V and multimeter evaluates SHORT_CIRCUIT.',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0];
        const env: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
          multimeter: { 
            mode: 'VOLTAGE_DC', 
            redProbePin: 1, 
            redProbeConnectorId: 'conn-b', 
            blackProbePin: 5, 
            blackProbeConnectorId: 'conn-a' 
          },
          activeFault: { id: 'short-gnd', name: '5V Short to GND', description: '', faultType: 'SHORT_TO_GND', affectedCircuits: ['VC'] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };
        const result = calculateElectricalState(vehicle, env);
        const val = result.multimeter.value ?? 0;
        const evaluation = result.multimeter.evaluation;
        const passed = val <= 0.05 && evaluation === 'SHORT_CIRCUIT';
        return {
          passed,
          message: passed ? '5V reference collapsed to ground potential and signaled diagnostic SHORT_CIRCUIT' : 'Short circuit evaluation failed',
          measured: `${val.toFixed(3)} V [${evaluation}]`,
          expected: '< 0.05 V [SHORT_CIRCUIT]',
        };
      },
    },
    {
      id: 'test-5-short-to-battery',
      name: '5. Short to Battery (+13.8V on 5V Rail)',
      category: 'FAULT_DIAGNOSTICS',
      description: 'Injects SHORT_TO_BATT on 5V sensor circuit. Voltage spikes to 13.8V and evaluates SHORT_CIRCUIT.',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0];
        const env: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
          multimeter: { 
            mode: 'VOLTAGE_DC', 
            redProbePin: 1, 
            redProbeConnectorId: 'conn-b', 
            blackProbePin: 5, 
            blackProbeConnectorId: 'conn-a' 
          },
          activeFault: { id: 'short-batt', name: 'Short to Battery', description: '', faultType: 'SHORT_TO_BATT', affectedCircuits: ['VC'] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };
        const result = calculateElectricalState(vehicle, env);
        const val = result.multimeter.value ?? 0;
        const evaluation = result.multimeter.evaluation;
        const passed = val >= 13.0 && evaluation === 'SHORT_CIRCUIT';
        return {
          passed,
          message: passed ? 'Overvoltage short to battery (+13.8V) safely detected as SHORT_CIRCUIT' : 'Failed to detect short to battery',
          measured: `${val.toFixed(2)} V [${evaluation}]`,
          expected: '>= 13.0 V [SHORT_CIRCUIT]',
        };
      },
    },
    {
      id: 'test-6-unpowered-bench-state',
      name: '6. Unpowered Bench Circuit (Zero-Volt Reading !== PASS)',
      category: 'BENCH_PHYSICS',
      description: 'Bench supply OFF (0V). DMM reads 0.000V. Must evaluate as NOT_APPLICABLE with explicit note, NEVER false PASS.',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0];
        const env: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: false, reversePolarity: false }, // OFF
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
          multimeter: { 
            mode: 'VOLTAGE_DC', 
            redProbePin: 1, 
            redProbeConnectorId: 'conn-b', 
            blackProbePin: 5, 
            blackProbeConnectorId: 'conn-a' 
          },
          activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
          simulatedRPM: 0,
          simulatedRailPressureBar: 0,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 0,
        };
        const result = calculateElectricalState(vehicle, env);
        const val = result.multimeter.value ?? 0;
        const evaluation = result.multimeter.evaluation;
        const passed = val === 0.0 && evaluation === 'NOT_APPLICABLE';
        return {
          passed,
          message: passed ? '0.000V unpowered reading correctly prevented from passing (evaluates NOT_APPLICABLE)' : 'Zero-volt reading improperly evaluated as PASS',
          measured: `${val.toFixed(3)} V [${evaluation}]`,
          expected: '0.000 V [NOT_APPLICABLE]',
        };
      },
    },
    {
      id: 'test-7-ground-resistance-voltage-drop',
      name: '7. Excessive Circuit Resistance (Corroded Ground +20Ω)',
      category: 'FAULT_DIAGNOSTICS',
      description: 'Injects POOR_GROUND_20_OHM fault. Ground voltage offset rises to 0.42V (>50mV OEM threshold) and evaluates FAIL.',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0];
        const env: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
          multimeter: { 
            mode: 'VOLTAGE_DC', 
            redProbePin: 5, // Ground pin E01
            redProbeConnectorId: 'conn-a', 
            blackProbePin: 18, // Logic GND E1
            blackProbeConnectorId: 'conn-a' 
          },
          activeFault: { id: 'corroded-gnd', name: 'Corroded Ground', description: '', faultType: 'POOR_GROUND_20_OHM', affectedCircuits: ['E01'] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };
        const result = calculateElectricalState(vehicle, env);
        const val = result.multimeter.value ?? 0;
        const evaluation = result.multimeter.evaluation;
        const passed = val > 0.05 && evaluation === 'FAIL';
        return {
          passed,
          message: passed ? 'High ground resistance creates 0.42V drop exceeding 50mV threshold, evaluating FAIL' : 'Ground drop failed to trigger FAIL',
          measured: `${val.toFixed(2)} V [${evaluation}]`,
          expected: '> 0.05 V drop [FAIL]',
        };
      },
    },
    {
      id: 'test-8-incorrect-probe-placement',
      name: '8. Incorrect Probe Placement (Same Pin & Open Probe)',
      category: 'PROBE_VALIDATION',
      description: 'Connects both probes to the same pin, or leaves black probe floating. Evaluates INVALID_CONNECTION.',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0];
        // Test subcase A: same pin
        const envSamePin: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
          multimeter: { 
            mode: 'VOLTAGE_DC', 
            redProbePin: 1, 
            redProbeConnectorId: 'conn-a', 
            blackProbePin: 1, 
            blackProbeConnectorId: 'conn-a' 
          },
          activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };
        const resA = calculateElectricalState(vehicle, envSamePin);

        // Test subcase B: black probe null (open circuit reference)
        const envNullBlack: SimulationEnvironment = {
          ...envSamePin,
          multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, redProbeConnectorId: 'conn-a', blackProbePin: null },
        };
        const resB = calculateElectricalState(vehicle, envNullBlack);

        const passed = resA.multimeter.evaluation === 'INVALID_CONNECTION' && resB.multimeter.evaluation === 'INVALID_CONNECTION';
        return {
          passed,
          message: passed ? 'Both same-pin connection and floating reference correctly trigger INVALID_CONNECTION' : 'Probe validation failed to catch invalid placement',
          measured: `Same Pin: [${resA.multimeter.evaluation}], Floating: [${resB.multimeter.evaluation}]`,
          expected: 'INVALID_CONNECTION across both cases',
        };
      },
    },
    {
      id: 'test-9-overcurrent-limiting-foldback',
      name: '9. Power Supply Overcurrent Limiter & Voltage Foldback',
      category: 'BENCH_PHYSICS',
      description: 'Direct short to GND with 2.0A limit clamps current and folds back voltage (V = I_limit * R_load < 1.0V).',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0];
        const env: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
          multimeter: { mode: 'VOLTAGE_DC', redProbePin: 1, blackProbePin: 5 },
          activeFault: { id: 'short', name: 'Short GND', description: '', faultType: 'SHORT_TO_GND', affectedCircuits: [] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };
        const result = calculateElectricalState(vehicle, env);
        const clamped = result.powerSupply.isClamped && result.powerSupply.actualCurrent === 2.0;
        const foldedVoltage = result.powerSupply.actualVoltage < 1.0;
        const isOvercurrent = result.powerSupply.isOvercurrent;
        const passed = clamped && foldedVoltage && isOvercurrent;
        return {
          passed,
          message: passed ? 'Power supply folded back voltage and clamped at 2.000A (OVERCURRENT_TRIP)' : 'Overcurrent foldback failed to trigger',
          measured: `${result.powerSupply.actualVoltage}V @ ${result.powerSupply.actualCurrent}A [${result.powerSupply.powerState}]`,
          expected: '< 1.0V @ 2.000A [OVERCURRENT_TRIP]',
        };
      },
    },
    {
      id: 'test-10-unpopulated-pin-selection',
      name: '10. Invalid ECU Pin Selection (Blank Cavity Position)',
      category: 'PROBE_VALIDATION',
      description: 'Probing Pin 9 on Connector A (unpopulated blank cavity). Displays O.L and evaluates NOT_APPLICABLE.',
      run: () => {
        const vehicle = VEHICLE_DATABASE[0];
        const env: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: 1, ignPin: 4, groundPin: 5 },
          multimeter: { 
            mode: 'VOLTAGE_DC', 
            redProbePin: 9, // Pin 9 is NC (Blank Cavity) on Hilux Conn A
            redProbeConnectorId: 'conn-a', 
            blackProbePin: 5, 
            blackProbeConnectorId: 'conn-a' 
          },
          activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };
        const result = calculateElectricalState(vehicle, env);
        const display = result.multimeter.displayString;
        const evaluation = result.multimeter.evaluation;
        const passed = display === 'O.L' && evaluation === 'NOT_APPLICABLE';
        return {
          passed,
          message: passed ? 'Blank cavity correctly identified as O.L high impedance and evaluated NOT_APPLICABLE' : 'Blank cavity failed validation',
          measured: `Display: ${display} [${evaluation}]`,
          expected: 'Display: O.L [NOT_APPLICABLE]',
        };
      },
    },
  ];

  const handleRunAllTests = () => {
    setIsRunning(true);
    const results: { [id: string]: any } = {};

    setTimeout(() => {
      testCases.forEach((tc) => {
        try {
          results[tc.id] = tc.run();
        } catch (e: any) {
          results[tc.id] = {
            passed: false,
            message: `Runtime exception: ${e.message}`,
            measured: 'CRASH',
            expected: 'Valid calculation',
          };
        }
      });
      setTestResults(results);
      setIsRunning(false);
    }, 250);
  };

  const totalTests = testCases.length;
  const passedTests = testResults ? Object.values(testResults).filter((r) => r.passed).length : 0;
  const failedTests = testResults ? Object.values(testResults).filter((r) => !r.passed).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Automotive Engineering Self-Test Suite</h3>
              <p className="text-xs text-slate-400 font-mono">
                10-Point automated verification of mathematical circuit calculations, probe logic, and fault responses
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scorecard Bar */}
        <div className="flex items-center justify-between p-3.5 my-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Total Checks: {totalTests}</span>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400 font-bold">Passed: {passedTests}</span>
            <span className="text-slate-700">|</span>
            <span className="text-rose-400 font-bold">Failed: {failedTests}</span>
          </div>

          <button
            onClick={handleRunAllTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-md transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{testResults ? 'Re-Run All 10 Tests' : 'Execute 10-Test Suite'}</span>
          </button>
        </div>

        {/* Test Cases List */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {testCases.map((tc) => {
            const res = testResults ? testResults[tc.id] : null;
            return (
              <div
                key={tc.id}
                className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {res ? (
                      res.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                    )}
                    <h5 className="font-bold text-xs text-white">{tc.name}</h5>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {tc.category}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug pl-6">{tc.description}</p>

                {res && (
                  <div className="mt-2 pl-6 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className={res.passed ? 'text-emerald-400 font-medium' : 'text-rose-400 font-bold'}>
                      {res.message}
                    </span>
                    <div className="flex gap-3 text-slate-400">
                      <span>Measured: <strong className="text-white">{res.measured}</strong></span>
                      <span>Target: <strong className="text-cyan-400">{res.expected}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Engine: TypeScript 7 + Physical Ohm & Kirchhoff Solver</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
