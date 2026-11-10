/**
 * Automotive Electrical Calculation & Numerical Simulation Engine
 * AutoElectric Lab Pro - RAMT Engineering Suite
 * 
 * Strict physical circuit simulation:
 * - Ohm's law, node potential calculation, and voltage dividers
 * - Non-linear semiconductors: MOSFET body diodes, flyback clamp diodes
 * - Power supply loading, current limits, foldback, and reverse polarity
 * - Pin-specific measurement validation with strict evaluation categories:
 *   PASS, FAIL, OPEN_CIRCUIT, SHORT_CIRCUIT, INVALID_CONNECTION, UNVERIFIED, NOT_APPLICABLE
 */

import { 
  ConnectorPin, 
  ElectricalFault, 
  MeasurementEvaluation, 
  SignalType, 
  VehicleProfile 
} from '../types/automotive';

export interface SimulationEnvironment {
  powerSupply: {
    voltageSet: number; // 0 - 30 V
    currentLimitSet: number; // 0.1 - 5.0 A
    outputEnabled: boolean;
    reversePolarity: boolean;
  };
  connectedPowerPins: {
    battPin: number | null; // Terminal 30 / +B
    battConnectorId?: string | null;
    ignPin: number | null;  // Terminal 15 / IGSW
    ignConnectorId?: string | null;
    groundPin: number | null;// Terminal 31 / E01, ME01
    groundConnectorId?: string | null;
  };
  multimeter: {
    mode: 'VOLTAGE_DC' | 'VOLTAGE_AC' | 'RESISTANCE' | 'DIODE' | 'CONTINUITY';
    redProbePin: number | null;
    redProbeConnectorId?: string | null;
    blackProbePin: number | null;
    blackProbeConnectorId?: string | null;
  };
  activeFault: ElectricalFault;
  simulatedRPM: number; // 0 - 4500 RPM
  simulatedRailPressureBar: number; // 0 - 2000 Bar
  simulatedBoostKpa: number; // 100 - 300 kPa
  scvDutyCyclePct: number; // 10 - 90 %
}

export interface SimulationResult {
  powerSupply: {
    actualVoltage: number;
    actualCurrent: number;
    isOvercurrent: boolean;
    isClamped: boolean;
    powerState: 'OFF' | 'ACTIVE_NORMAL' | 'OVERCURRENT_TRIP' | 'REVERSE_POLARITY_PROTECTED' | 'OPEN_GROUND';
    quiescentDrawMa: number;
  };
  multimeter: {
    value: number | null;
    displayString: string;
    unit: string;
    isBeeping: boolean;
    isOverLimit: boolean;
    evaluation: MeasurementEvaluation;
    explanation: string;
    nodeVoltageRed: number;
    nodeVoltageBlack: number;
  };
  waveformCh1: { timeMs: number; voltage: number }[];
  waveformCh2: { timeMs: number; voltage: number }[];
  signalMetrics: {
    ch1Vpp: number;
    ch1FreqHz: number;
    ch1DutyCycle: number;
    ch2Vpp: number;
  };
}

export function calculateElectricalState(
  vehicle: VehicleProfile,
  env: SimulationEnvironment
): SimulationResult {
  const { powerSupply, connectedPowerPins, multimeter, activeFault } = env;

  // 1. Calculate Power Supply State & Circuit Loading
  let actualVoltage = 0;
  let actualCurrent = 0;
  let isOvercurrent = false;
  let isClamped = false;
  let powerState: SimulationResult['powerSupply']['powerState'] = 'OFF';
  let quiescentDrawMa = 0;

  const isGroundConnected = connectedPowerPins.groundPin !== null;
  const isBattConnected = connectedPowerPins.battPin !== null;
  const isIgnConnected = connectedPowerPins.ignPin !== null;

  if (powerSupply.outputEnabled) {
    if (powerSupply.reversePolarity || activeFault.faultType === 'REVERSED_POLARITY') {
      // Reverse polarity protection diode inside ECU conducts heavily
      actualVoltage = 0.72; // Clamped to forward drop of protection diode
      actualCurrent = Math.min(powerSupply.currentLimitSet, 4.8);
      isOvercurrent = true;
      isClamped = true;
      powerState = 'REVERSE_POLARITY_PROTECTED';
    } else if (!isGroundConnected || activeFault.faultType === 'OPEN_CIRCUIT' && activeFault.name.includes('Ground')) {
      // Ground return is open!
      actualVoltage = powerSupply.voltageSet;
      actualCurrent = 0.001; // tiny microamp leakage
      isOvercurrent = false;
      isClamped = false;
      powerState = 'OPEN_GROUND';
      quiescentDrawMa = 1;
    } else {
      // Normal polarity and ground connected
      const setV = powerSupply.voltageSet;
      
      // Calculate effective load resistance of ECU
      let effectiveResistance = 100000; // Open circuit by default

      if (isBattConnected) {
        effectiveResistance = 810.0; // Standby sleep draw ~17mA at 13.8V
        if (isIgnConnected) {
          // Key ON wakes up microcontroller and 5V power ASIC (SE657 / TLE6244X)
          effectiveResistance = 38.0; // Normal active draw ~363mA at 13.8V
        }
      }

      // Circuit Faults affecting power consumption
      if (activeFault.faultType === 'SHORT_TO_GND' && (isBattConnected || isIgnConnected)) {
        // Direct short to ground on power rail
        effectiveResistance = 0.05; // 50 milliohms
      } else if (activeFault.faultType === 'POOR_GROUND_20_OHM') {
        effectiveResistance += 20.0;
      } else if (activeFault.faultType === 'HIGH_RESISTANCE_50_OHM') {
        effectiveResistance += 50.0;
      }

      const calculatedCurrent = setV / effectiveResistance;

      // Check current limiting
      if (calculatedCurrent >= powerSupply.currentLimitSet) {
        // Current limiter clamps current and folds back voltage: V = I_limit * R_load
        actualCurrent = powerSupply.currentLimitSet;
        actualVoltage = Math.min(setV, actualCurrent * effectiveResistance);
        isOvercurrent = true;
        isClamped = true;
        powerState = 'OVERCURRENT_TRIP';
        quiescentDrawMa = Math.round(actualCurrent * 1000);
      } else {
        actualCurrent = calculatedCurrent;
        actualVoltage = setV;
        isOvercurrent = false;
        isClamped = false;
        powerState = 'ACTIVE_NORMAL';
        quiescentDrawMa = Math.round(actualCurrent * 1000);
      }
    }
  }

  // 2. Multimeter Measurement Engine
  const redPin = findPin(vehicle, multimeter.redProbePin, multimeter.redProbeConnectorId);
  const blackPin = findPin(vehicle, multimeter.blackProbePin, multimeter.blackProbeConnectorId);
  let mmValue: number | null = null;
  let mmDisplay = '---';
  let mmUnit = 'V DC';
  let isBeeping = false;
  let isOverLimit = false;
  let evaluation: MeasurementEvaluation = 'NOT_APPLICABLE';
  let explanation = 'Select pins and connect probes to measure.';
  let nodeVRed = 0.0;
  let nodeVBlack = 0.0;

  const isSamePin =
    (redPin && blackPin && redPin.connectorId === blackPin.connectorId && redPin.pinNumber === blackPin.pinNumber) ||
    (!redPin && !blackPin && multimeter.redProbePin !== null && multimeter.redProbePin === multimeter.blackProbePin);

  // PRIORITY 1: Rigorous probe connection validation
  if (multimeter.redProbePin === null) {
    mmDisplay = 'NO PROBE';
    evaluation = 'INVALID_CONNECTION';
    explanation = 'Red probe (+) is not connected to any ECU pin. Connect the red probe to begin measurement.';
  } else if (multimeter.blackProbePin === null) {
    mmDisplay = 'FLOAT';
    evaluation = 'INVALID_CONNECTION';
    explanation = 'Black probe (-) reference return is open. The multimeter requires a complete reference circuit. Connect the black probe to an ECU ground pin (e.g. E01 or ME01).';
  } else if (isSamePin) {
    mmDisplay = '0.000';
    mmValue = 0.0;
    evaluation = 'INVALID_CONNECTION';
    explanation = `Both multimeter probes are connected to the exact same pin (Pin #${redPin?.pinNumber || multimeter.redProbePin}). The measured potential difference across the same point is 0.000V. Place probes across different nodes.`;
  } else if (redPin && (!redPin.isPopulated || redPin.signalType === 'RESERVED_NC')) {
    mmDisplay = 'O.L';
    evaluation = 'NOT_APPLICABLE';
    explanation = `Pin #${redPin.pinNumber} is an unpopulated blank cavity on this ECU hardware variant. No internal circuit trace exists.`;
  } else if (blackPin && (!blackPin.isPopulated || blackPin.signalType === 'RESERVED_NC')) {
    mmDisplay = 'FLOAT';
    evaluation = 'INVALID_CONNECTION';
    explanation = `Black probe is connected to an unpopulated blank cavity (Pin #${blackPin.pinNumber}). It cannot serve as a ground or voltage reference.`;
  } else if (multimeter.mode === 'VOLTAGE_DC') {
    mmUnit = 'V DC';

    if (!powerSupply.outputEnabled) {
      // Circuit is unpowered!
      nodeVRed = 0.0;
      nodeVBlack = 0.0;
      mmValue = 0.0;
      mmDisplay = '0.000';

      if (redPin?.signalType === 'GROUND_POWER' || redPin?.signalType === 'GROUND_LOGIC' || redPin?.signalType === 'SENSOR_GROUND') {
        evaluation = 'PASS';
        explanation = 'Circuit unpowered. Ground pins remain at zero potential (0.000V).';
      } else {
        evaluation = 'NOT_APPLICABLE';
        explanation = `Circuit is unpowered (Bench Power Supply is OFF). Measured 0.000V on Pin #${redPin?.pinNumber} (${redPin?.label}). Turn bench power supply ON to measure live operating voltage.`;
      }
    } else if (powerState === 'REVERSE_POLARITY_PROTECTED') {
      nodeVRed = 0.72;
      nodeVBlack = 0.0;
      mmValue = 0.72;
      mmDisplay = '0.720';
      evaluation = 'FAIL';
      explanation = 'Reverse polarity condition! Internal protection diode conducts heavily. Output voltage clamped to diode drop.';
    } else if (powerState === 'OPEN_GROUND') {
      // Open ground causes the internal ground plane to float near battery voltage!
      nodeVRed = actualVoltage;
      nodeVBlack = actualVoltage - 0.15;
      mmValue = Number((nodeVRed - nodeVBlack).toFixed(3));
      mmDisplay = `${nodeVRed.toFixed(2)}`;
      evaluation = 'OPEN_CIRCUIT';
      explanation = 'OPEN GROUND FAULT: ECU main ground return is disconnected. The internal ground plane is floating near battery potential. ECU is inoperative.';
    } else {
      // Power supply is ON and circuit is active. Calculate node potentials:
      nodeVRed = calculateNodeVoltage(redPin, actualVoltage, env);
      nodeVBlack = calculateNodeVoltage(blackPin, actualVoltage, env);

      // Measure potential difference between Red (+) and Black (-) probes
      const measuredDiff = nodeVRed - nodeVBlack;
      mmValue = Number(measuredDiff.toFixed(3));
      mmDisplay = mmValue.toFixed(3);

      // Pin-specific measurement validation
      if (redPin) {
        evaluation = evaluateVoltageMeasurement(redPin, mmValue, actualVoltage, env, blackPin);
        explanation = getVoltageExplanation(redPin, mmValue, evaluation, env);
      }
    }
  } else if (multimeter.mode === 'VOLTAGE_AC') {
    mmUnit = 'V AC';

    if (!powerSupply.outputEnabled) {
      mmValue = 0.0;
      mmDisplay = '0.000';
      evaluation = 'NOT_APPLICABLE';
      explanation = 'Power supply is OFF. Zero AC signal present.';
    } else {
      // Calculate True RMS AC component
      const isInductiveCrank = redPin?.label.includes('NE+') || redPin?.label.includes('CKP');
      const isCamVR = redPin?.label.includes('G2+');

      if (isInductiveCrank) {
        // Variable Reluctance Sensor AC amplitude increases with RPM
        const rpm = Math.max(300, env.simulatedRPM);
        const peakV = 2.0 + (rpm / 1000) * 3.5;
        const vRms = Number((peakV / Math.SQRT2).toFixed(3));
        mmValue = vRms;
        mmDisplay = vRms.toFixed(3);
        evaluation = 'PASS';
        explanation = `Inductive Variable Reluctance Crank Sensor AC RMS potential (${vRms} V AC at ${rpm} RPM). Measured differential to NE-.`;
      } else if (isCamVR) {
        const peakV = 1.5 + (env.simulatedRPM / 1200) * 2.0;
        const vRms = Number((peakV / Math.SQRT2).toFixed(3));
        mmValue = vRms;
        mmDisplay = vRms.toFixed(3);
        evaluation = 'PASS';
        explanation = `Inductive Camshaft VR Sensor AC RMS voltage (${vRms} V AC).`;
      } else {
        // On DC power or sensor rails, AC mode measures residual ripple voltage
        const rippleV = Number((0.008 + (simResultRipple(actualCurrent) * 0.01)).toFixed(3));
        mmValue = rippleV;
        mmDisplay = rippleV.toFixed(3);
        evaluation = rippleV < 0.05 ? 'PASS' : 'FAIL';
        explanation = `DC Rail AC ripple voltage: ${mmDisplay} V AC (Clean DC ripple < 50mV).`;
      }
    }
  } else if (multimeter.mode === 'RESISTANCE') {
    mmUnit = 'Ω';

    if (powerSupply.outputEnabled) {
      mmDisplay = 'ERR LIVE';
      isOverLimit = true;
      evaluation = 'INVALID_CONNECTION';
      explanation = 'ELECTRICAL SAFETY WARNING: Resistance must NEVER be measured on a live/powered circuit! Turn bench power supply OFF to protect multimeter ADC shunt.';
    } else if (redPin && blackPin) {
      const calculatedR = calculateLoopResistance(redPin, blackPin, activeFault);

      if (calculatedR > 2000000) {
        mmDisplay = 'O.L';
        isOverLimit = true;
        mmValue = 9999999;
        if (activeFault.faultType === 'OPEN_CIRCUIT') {
          evaluation = 'OPEN_CIRCUIT';
          explanation = 'OPEN CIRCUIT FAULT: Impedance > 2 MΩ (Open circuit detected across selected pins).';
        } else if (redPin.signalType === 'RESERVED_NC') {
          evaluation = 'NOT_APPLICABLE';
          explanation = 'Cavity unpopulated. High impedance (O.L).';
        } else {
          evaluation = 'OPEN_CIRCUIT';
          explanation = `Open loop impedance (> 2 MΩ) between Pin #${redPin.pinNumber} and Pin #${blackPin.pinNumber}.`;
        }
      } else if (calculatedR < 1.0 && activeFault.faultType === 'SHORT_TO_GND') {
        mmValue = Number(calculatedR.toFixed(2));
        mmDisplay = mmValue.toFixed(2);
        evaluation = 'SHORT_CIRCUIT';
        explanation = `DIRECT SHORT CIRCUIT DETECTED (${calculatedR.toFixed(2)} Ω). Circuit is shorted directly to ground plane.`;
      } else if (calculatedR < 1000) {
        mmValue = Number(calculatedR.toFixed(2));
        mmDisplay = mmValue.toFixed(2);
        evaluation = evaluateResistanceSpec(redPin, blackPin, calculatedR);
        explanation = getResistanceExplanation(redPin, blackPin, calculatedR, evaluation);
      } else {
        mmValue = Number((calculatedR / 1000).toFixed(2));
        mmDisplay = `${mmValue.toFixed(2)} k`;
        mmUnit = 'kΩ';
        evaluation = evaluateResistanceSpec(redPin, blackPin, calculatedR);
        explanation = getResistanceExplanation(redPin, blackPin, calculatedR, evaluation);
      }
    }
  } else if (multimeter.mode === 'CONTINUITY') {
    mmUnit = 'Ω';

    if (powerSupply.outputEnabled) {
      mmDisplay = 'ERR LIVE';
      isOverLimit = true;
      evaluation = 'INVALID_CONNECTION';
      explanation = 'Turn power supply OFF before testing continuity.';
    } else if (redPin && blackPin) {
      const loopR = calculateLoopResistance(redPin, blackPin, activeFault);

      if (loopR <= 20.0) {
        isBeeping = true;
        mmValue = Number(loopR.toFixed(2));
        mmDisplay = `${mmValue.toFixed(2)}`;
        evaluation = 'PASS';
        explanation = `CONTINUITY CONFIRMED (${loopR.toFixed(2)} Ω < 20.0 Ω threshold). Solid electrical bond established; internal buzzer active.`;
      } else {
        isBeeping = false;
        mmDisplay = loopR > 1000 ? 'O.L' : loopR.toFixed(1);
        evaluation = loopR > 100000 ? 'OPEN_CIRCUIT' : 'FAIL';
        explanation = `NO CONTINUITY (${loopR > 1000 ? 'Open circuit > 1 kΩ' : `${loopR.toFixed(1)} Ω`}). Impedance exceeds 20.0 Ω threshold; beeper inactive.`;
      }
    }
  } else if (multimeter.mode === 'DIODE') {
    mmUnit = 'V';

    if (powerSupply.outputEnabled) {
      mmDisplay = 'ERR LIVE';
      isOverLimit = true;
      evaluation = 'INVALID_CONNECTION';
      explanation = 'Turn power supply OFF before testing diode forward voltage drop.';
    } else if (redPin) {
      let vf = redPin.diodeModeVfMin ?? 0.55;

      if (activeFault.faultType === 'SHORT_TO_GND') {
        vf = 0.001;
      } else if (activeFault.faultType === 'OPEN_CIRCUIT') {
        vf = 999.0;
      }

      if (vf > 3.0) {
        mmDisplay = 'O.L';
        isOverLimit = true;
        evaluation = 'OPEN_CIRCUIT';
        explanation = 'Open semiconductor P-N junction or reverse-biased test probes.';
      } else if (vf < 0.05) {
        mmDisplay = '0.000';
        mmValue = 0.00;
        evaluation = 'SHORT_CIRCUIT';
        explanation = 'SHORTED SEMICONDUCTOR: Output MOSFET body diode or flyback suppression diode has collapsed (0.000V).';
      } else {
        mmValue = Number(vf.toFixed(3));
        mmDisplay = mmValue.toFixed(3);
        evaluation = 'PASS';
        explanation = `Normal silicon P-N / Schottky junction forward drop (${mmValue} V). Internal driver clamp diode verified healthy.`;
      }
    }
  }

  // 3. Oscilloscope Waveform Synthesis
  const waveformCh1: { timeMs: number; voltage: number }[] = [];
  const waveformCh2: { timeMs: number; voltage: number }[] = [];
  const totalSamples = 120;
  const timeWindowMs = 20.0;

  const rpm = Math.max(300, env.simulatedRPM);
  const crankFreqHz = (rpm / 60) * 36;
  const isCrankProbe = redPin?.label.includes('NE+') || redPin?.label.includes('CKP');
  const isInjectorProbe = redPin?.label.includes('INJ') || redPin?.label.includes('#10');
  const isSCVProbe = redPin?.label.includes('SCV');
  const isCANProbe = redPin?.signalType === 'CAN_HIGH';

  for (let i = 0; i < totalSamples; i++) {
    const tMs = (i / totalSamples) * timeWindowMs;
    const tSec = tMs / 1000;
    let v1 = 0;
    let v2 = 0;

    if (!powerSupply.outputEnabled && !isCrankProbe) {
      v1 = 0;
      v2 = 0;
    } else if (isCrankProbe) {
      const cyclePos = (tSec * (rpm / 60)) % 1.0;
      const amplitude = Math.min(18.0, 2.0 + (rpm / 1000) * 3.5);
      if (cyclePos > 0.94) {
        v1 = 0.05 * Math.sin(2 * Math.PI * crankFreqHz * tSec);
      } else {
        v1 = amplitude * Math.sin(2 * Math.PI * crankFreqHz * tSec);
      }
      v2 = cyclePos > 0.45 && cyclePos < 0.55 ? 5.0 : 0.2;
    } else if (isInjectorProbe) {
      const injCycle = (tSec * 25) % 1.0;
      if (injCycle < 0.05) {
        v1 = 78.5; // High voltage boost spike ~80V
        v2 = 14.2;
      } else if (injCycle < 0.15) {
        v1 = Math.sin(2 * Math.PI * 25000 * tSec) > 0 ? 13.8 : 0.0;
        v2 = 4.5;
      } else if (injCycle < 0.18) {
        v1 = 48.0;
        v2 = 0.0;
      } else {
        v1 = actualVoltage;
        v2 = 0.0;
      }
    } else if (isSCVProbe) {
      const periodMs = 1.0;
      const phase = (tMs % periodMs) / periodMs;
      const duty = env.scvDutyCyclePct / 100;
      v1 = phase < duty ? 0.4 : actualVoltage;
      v2 = actualVoltage;
    } else if (isCANProbe) {
      const bitRate = 5000;
      const bitState = Math.sin(2 * Math.PI * bitRate * tSec) > 0.2;
      v1 = bitState ? 3.5 : 2.5;
      v2 = bitState ? 1.5 : 2.5;
    } else {
      v1 = mmValue ?? 0.0;
      v1 += (Math.random() - 0.5) * 0.01;
      v2 = 0.0;
    }

    waveformCh1.push({ timeMs: Number(tMs.toFixed(2)), voltage: Number(v1.toFixed(2)) });
    waveformCh2.push({ timeMs: Number(tMs.toFixed(2)), voltage: Number(v2.toFixed(2)) });
  }

  const v1Values = waveformCh1.map((p) => p.voltage);
  const maxV1 = Math.max(...v1Values);
  const minV1 = Math.min(...v1Values);
  const ch1Vpp = Number((maxV1 - minV1).toFixed(2));

  return {
    powerSupply: {
      actualVoltage: Number(actualVoltage.toFixed(2)),
      actualCurrent: Number(actualCurrent.toFixed(3)),
      isOvercurrent,
      isClamped,
      powerState,
      quiescentDrawMa,
    },
    multimeter: {
      value: mmValue,
      displayString: mmDisplay,
      unit: mmUnit,
      isBeeping,
      isOverLimit,
      evaluation,
      explanation,
      nodeVoltageRed: Number(nodeVRed.toFixed(3)),
      nodeVoltageBlack: Number(nodeVBlack.toFixed(3)),
    },
    waveformCh1,
    waveformCh2,
    signalMetrics: {
      ch1Vpp,
      ch1FreqHz: isCrankProbe ? Math.round(crankFreqHz) : isSCVProbe ? 1000 : 0,
      ch1DutyCycle: isSCVProbe ? env.scvDutyCyclePct : 50,
      ch2Vpp: 5.0,
    },
  };
}

function calculateNodeVoltage(
  pin: ConnectorPin | null,
  systemSupplyV: number,
  env: SimulationEnvironment
): number {
  if (!pin) return 0.0;
  const { activeFault, connectedPowerPins } = env;

  // Ground pins: normal is 0.01V
  if (pin.signalType === 'GROUND_POWER') {
    if (activeFault.faultType === 'POOR_GROUND_20_OHM') {
      return 0.42; // High current return develops 0.42V drop across corroded 20 ohm eyelet
    }
    return 0.01;
  }
  if (pin.signalType === 'GROUND_LOGIC' || pin.signalType === 'SENSOR_GROUND') {
    return 0.01;
  }

  // Battery Power Feed (+B, +B2, BATT)
  if (pin.signalType === 'POWER_BATT') {
    if (activeFault.faultType === 'SHORT_TO_GND') return 0.08;
    if (activeFault.faultType === 'HIGH_RESISTANCE_50_OHM') return 4.85; // 50 ohm inline drop under ECU quiescent draw
    return systemSupplyV;
  }

  // Ignition Switched (IGSW)
  if (pin.signalType === 'POWER_IGN') {
    if (connectedPowerPins.ignPin === null) return 0.0; // Key OFF
    if (activeFault.faultType === 'SHORT_TO_GND') return 0.08;
    if (activeFault.faultType === 'HIGH_RESISTANCE_50_OHM') return 4.85;
    return systemSupplyV;
  }

  // 5V Regulated Reference (VC / VCC1)
  if (pin.signalType === 'SENSOR_5V_REF') {
    if (connectedPowerPins.ignPin === null) return 0.0; // unpowered when Key OFF
    if (activeFault.faultType === 'SHORT_TO_GND') return 0.02; // collapsed
    if (activeFault.faultType === 'SHORT_TO_BATT') return systemSupplyV; // shorted to 12V
    if (activeFault.faultType === 'OPEN_CIRCUIT') return 0.0;
    // If power supply is in foldback, 5V regulator drops proportionally
    if (systemSupplyV < 10.0) return Number((systemSupplyV * 0.42).toFixed(3));
    return 5.002;
  }

  // Analog Sensors
  if (pin.signalType === 'SENSOR_ANALOG_IN') {
    if (connectedPowerPins.ignPin === null) return 0.0;
    if (activeFault.faultType === 'SHORT_TO_GND') return 0.01;
    if (activeFault.faultType === 'SHORT_TO_5V') return 5.0;

    if (pin.label.includes('PCR') || pin.label.includes('Rail')) {
      // Common rail pressure sensor: 0.5V at 0 bar, 4.5V at 2000 bar
      return Number((0.5 + (env.simulatedRailPressureBar / 2000) * 4.0).toFixed(3));
    }
    if (pin.label.includes('PIM') || pin.label.includes('MAP')) {
      // MAP sensor: 1.0V at 50 kPa, 4.5V at 300 kPa
      return Number((1.0 + ((env.simulatedBoostKpa - 50) / 250) * 3.5).toFixed(3));
    }
    if (pin.label.includes('THW')) return 1.25; // Warm engine coolant
    if (pin.label.includes('VPA')) return 0.85; // Throttle pedal idle
    return 2.5;
  }

  // CAN Bus Lines
  if (pin.signalType === 'CAN_HIGH') {
    if (activeFault.faultType === 'SHORT_TO_GND') return 0.0;
    return 2.68; // average DC voltage of CAN-H
  }
  if (pin.signalType === 'CAN_LOW') {
    if (activeFault.faultType === 'SHORT_TO_GND') return 0.0;
    return 2.32; // average DC voltage of CAN-L
  }

  // Actuator Low-Side Drivers (e.g. Injector, SCV)
  if (pin.signalType === 'ACTUATOR_LOW_SIDE') {
    if (activeFault.faultType === 'SHORT_TO_GND') return 0.02;
    // In idle bench test without external coil pull-up: high-Z floating (0.2V)
    // If in vehicle with coil: pulled up to battery voltage (13.8V)
    return pin.expectedIdleVoltageMin ?? systemSupplyV;
  }

  return 0.0;
}

function evaluateVoltageMeasurement(
  pin: ConnectorPin,
  measuredDiff: number,
  systemSupplyV: number,
  env: SimulationEnvironment,
  blackPin: ConnectorPin | null
): MeasurementEvaluation {
  const { activeFault } = env;

  // If unverified, always return UNVERIFIED
  if (pin.verificationLevel === 'UNVERIFIED') {
    return 'UNVERIFIED';
  }

  // Check for short circuits
  if (activeFault.faultType === 'SHORT_TO_GND' && measuredDiff < 0.1 && pin.nominalVoltageMin > 1.0) {
    return 'SHORT_CIRCUIT';
  }
  if (activeFault.faultType === 'SHORT_TO_BATT' && measuredDiff > 11.0 && pin.nominalVoltageMax < 6.0) {
    return 'SHORT_CIRCUIT';
  }

  // Check for ground pin evaluation
  if (pin.signalType === 'GROUND_POWER' || pin.signalType === 'GROUND_LOGIC' || pin.signalType === 'SENSOR_GROUND') {
    if (measuredDiff > 0.05) {
      return 'FAIL'; // Excessive ground voltage drop!
    }
    return 'PASS';
  }

  // For 5V reference: strict tolerance 4.95V to 5.05V
  if (pin.signalType === 'SENSOR_5V_REF') {
    if (measuredDiff >= 4.95 && measuredDiff <= 5.05) {
      return 'PASS';
    }
    if (activeFault.faultType === 'OPEN_CIRCUIT' || measuredDiff === 0.0) {
      return 'OPEN_CIRCUIT';
    }
    if (activeFault.faultType === 'SHORT_TO_GND' || measuredDiff < 0.1) return 'SHORT_CIRCUIT';
    if (activeFault.faultType === 'SHORT_TO_BATT') return 'SHORT_CIRCUIT';
    return 'FAIL';
  }

  // For Power rails (+B, IGSW): must be within 11.5V - 14.5V
  if (pin.signalType === 'POWER_BATT' || pin.signalType === 'POWER_IGN') {
    if (measuredDiff >= 11.5 && measuredDiff <= 14.5) {
      return 'PASS';
    }
    if (measuredDiff < 0.5) return 'OPEN_CIRCUIT';
    return 'FAIL';
  }

  // For Analog Sensor Inputs (e.g. Rail Pressure 0.5V - 4.5V)
  if (pin.signalType === 'SENSOR_ANALOG_IN') {
    if (measuredDiff >= pin.nominalVoltageMin && measuredDiff <= pin.nominalVoltageMax) {
      return 'PASS';
    }
    return 'FAIL';
  }

  // General bounds check
  if (measuredDiff >= pin.nominalVoltageMin && measuredDiff <= pin.nominalVoltageMax) {
    return 'PASS';
  }

  return 'FAIL';
}

function getVoltageExplanation(
  pin: ConnectorPin,
  measuredVal: number,
  evaluation: MeasurementEvaluation,
  env: SimulationEnvironment
): string {
  if (evaluation === 'PASS') {
    return `PASS: Measured ${measuredVal.toFixed(3)}V is within verified OEM specification (${pin.nominalVoltageMin}V – ${pin.nominalVoltageMax}V). Source: ${pin.verificationSource}.`;
  }
  if (evaluation === 'SHORT_CIRCUIT') {
    return `SHORT CIRCUIT DETECTED: Measured ${measuredVal.toFixed(3)}V on Pin #${pin.pinNumber} (${pin.label}) indicates a dead short to ground or power rail. ${pin.failureSymptom}`;
  }
  if (evaluation === 'OPEN_CIRCUIT') {
    return `OPEN CIRCUIT FAULT: Measured 0.000V. Feed circuit is disconnected or power supply line has an open fuse/relay.`;
  }
  if (evaluation === 'FAIL') {
    return `FAIL: Out of specification! Measured ${measuredVal.toFixed(3)}V (Expected OEM range: ${pin.nominalVoltageMin}V – ${pin.nominalVoltageMax}V). ${pin.failureSymptom}`;
  }
  if (evaluation === 'UNVERIFIED') {
    return `TECHNICAL INFORMATION NOT VERIFIED: Measured ${measuredVal.toFixed(3)}V. Please confirm pin specification with physical manufacturer documentation before applying live circuit bench test.`;
  }
  return `Test status: ${evaluation}. ${pin.expectedBehavior}`;
}

function calculateLoopResistance(
  redPin: ConnectorPin,
  blackPin: ConnectorPin,
  activeFault: ElectricalFault
): number {
  if (redPin.pinNumber === blackPin.pinNumber) return 0.02;

  // Probing CAN-H to CAN-L
  const isCANPair =
    (redPin.signalType === 'CAN_HIGH' && blackPin.signalType === 'CAN_LOW') ||
    (redPin.signalType === 'CAN_LOW' && blackPin.signalType === 'CAN_HIGH');

  // Probing Crank VR NE+ to NE-
  const isVRPair =
    (redPin.label.includes('NE+') && blackPin.label.includes('NE-')) ||
    (redPin.label.includes('NE-') && blackPin.label.includes('NE+'));

  // Probing Ground to Ground
  const isGroundPair =
    (redPin.signalType === 'GROUND_POWER' || redPin.signalType === 'GROUND_LOGIC') &&
    (blackPin.signalType === 'GROUND_POWER' || blackPin.signalType === 'GROUND_LOGIC');

  if (isCANPair) {
    if (activeFault.faultType === 'OPEN_CIRCUIT') return 99999999;
    if (activeFault.faultType === 'SHORT_TO_GND') return 0.2;
    return 120.4; // 120 Ohm internal terminator
  }

  if (isVRPair) {
    if (activeFault.faultType === 'OPEN_CIRCUIT') return 99999999;
    return 2150.0; // 2.15k Ohm coil
  }

  if (isGroundPair) {
    if (activeFault.faultType === 'POOR_GROUND_20_OHM') return 21.4;
    return 0.05;
  }

  return 9999999; // Open circuit by default between unrelated pins
}

function evaluateResistanceSpec(
  redPin: ConnectorPin,
  blackPin: ConnectorPin,
  measuredR: number
): MeasurementEvaluation {
  const isCANPair =
    (redPin.signalType === 'CAN_HIGH' && blackPin.signalType === 'CAN_LOW') ||
    (redPin.signalType === 'CAN_LOW' && blackPin.signalType === 'CAN_HIGH');

  if (isCANPair) {
    if (measuredR >= 115.0 && measuredR <= 125.0) return 'PASS';
    if (measuredR < 10.0) return 'SHORT_CIRCUIT';
    return 'FAIL';
  }

  if (redPin.label.includes('NE+') && blackPin.label.includes('NE-')) {
    if (measuredR >= 1800.0 && measuredR <= 2500.0) return 'PASS';
    return 'FAIL';
  }

  if (measuredR < 0.2) return 'PASS';
  return 'FAIL';
}

function getResistanceExplanation(
  redPin: ConnectorPin,
  blackPin: ConnectorPin,
  measuredR: number,
  evaluation: MeasurementEvaluation
): string {
  if (evaluation === 'PASS') {
    return `PASS: Loop resistance (${measuredR} Ω) meets OEM specification between Pin #${redPin.pinNumber} and Pin #${blackPin.pinNumber}.`;
  }
  return `Evaluation: ${evaluation}. Measured resistance is ${measuredR} Ω.`;
}

function simResultRipple(currentA: number): number {
  return currentA * 0.05;
}

export function findPin(
  vehicle: VehicleProfile, 
  pinNumber: number | null, 
  connectorId?: string | null
): ConnectorPin | null {
  if (pinNumber === null) return null;
  if (connectorId) {
    const conn = vehicle.connectors.find((c) => c.id === connectorId);
    if (conn) {
      const found = conn.pins.find((p) => p.pinNumber === pinNumber);
      if (found) return found;
    }
  }
  for (const conn of vehicle.connectors) {
    const found = conn.pins.find((p) => p.pinNumber === pinNumber);
    if (found) return found;
  }
  return null;
}
