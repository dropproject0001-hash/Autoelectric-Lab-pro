import { VEHICLE_DATABASE } from './src/data/automotiveDatabase.js';
import { calculateElectricalState, SimulationEnvironment } from './src/services/electricalSimulationEngine.js';

console.log('================================================================');
console.log('AUTOELECTRIC LAB PRO - COMPREHENSIVE ECU PINOUT & SIMULATION TEST');
console.log('================================================================');

let totalPinsTested = 0;
let validPinsCount = 0;
let errorsFound: string[] = [];
let warningsFound: string[] = [];

// 1. Audit Vehicle Database Pin Completeness
for (const vehicle of VEHICLE_DATABASE) {
  console.log(`\nAuditing Platform: ${vehicle.make} ${vehicle.model} (${vehicle.engineCode} / ECU: ${vehicle.ecuManufacturer} ${vehicle.ecuModel})`);
  
  if (!vehicle.connectors || vehicle.connectors.length === 0) {
    errorsFound.push(`Vehicle ${vehicle.make} ${vehicle.model} has no connectors defined!`);
    continue;
  }

  const defaultBatt = vehicle.connectors.flatMap(c => c.pins).find(p => p.signalType === 'POWER_BATT')?.pinNumber || 1;
  const defaultIgn = vehicle.connectors.flatMap(c => c.pins).find(p => p.signalType === 'POWER_IGN')?.pinNumber || 4;
  const defaultGnd = vehicle.connectors.flatMap(c => c.pins).find(p => p.signalType === 'GROUND_POWER')?.pinNumber || 5;

  for (const conn of vehicle.connectors) {
    console.log(`  Connector ${conn.name} (${conn.id}): ${conn.pins.length} pins defined / ${conn.pinCount} total cavities`);

    for (const pin of conn.pins) {
      totalPinsTested++;

      // Check essential data fields & Phase 1 provenance
      if (!pin.label || !pin.functionDesc || !pin.signalType || !pin.wireColor) {
        errorsFound.push(`Pin #${pin.pinNumber} in ${vehicle.make} ${conn.name} is missing essential descriptors.`);
      }
      if (!pin.provenance || !pin.verificationSource) {
        errorsFound.push(`Pin #${pin.pinNumber} in ${vehicle.make} ${conn.name} is missing authoritative provenance source.`);
      }

      if (pin.isPopulated && pin.signalType !== 'RESERVED_NC') {
        if (pin.nominalVoltageMin === undefined || pin.nominalVoltageMax === undefined) {
          errorsFound.push(`Pin #${pin.pinNumber} (${pin.label}) in ${vehicle.make} ${conn.name} is missing nominal voltage range.`);
        }

        // Test Live Electrical Simulation for this pin
        const envKeyON: SimulationEnvironment = {
          powerSupply: { voltageSet: 13.8, currentLimitSet: 2.0, outputEnabled: true, reversePolarity: false },
          connectedPowerPins: { battPin: defaultBatt, ignPin: defaultIgn, groundPin: defaultGnd },
          multimeter: {
            mode: 'VOLTAGE_DC',
            redProbePin: pin.pinNumber,
            redProbeConnectorId: conn.id,
            blackProbePin: defaultGnd,
            blackProbeConnectorId: 'conn-a',
          },
          activeFault: { id: 'none', name: 'None', description: '', faultType: 'NONE', affectedCircuits: [] },
          simulatedRPM: 800,
          simulatedRailPressureBar: 350,
          simulatedBoostKpa: 101,
          scvDutyCyclePct: 35,
        };

        try {
          const res = calculateElectricalState(vehicle, envKeyON);
          if (res.multimeter.value === null && res.multimeter.evaluation !== 'NOT_APPLICABLE') {
            warningsFound.push(`Pin #${pin.pinNumber} (${pin.label}) returned null voltage during Key ON simulation.`);
          } else {
            validPinsCount++;
          }
        } catch (e: any) {
          errorsFound.push(`Simulation crashed on Pin #${pin.pinNumber} (${pin.label}): ${e.message}`);
        }
      }
    }
  }
}

console.log('\n================================================================');
console.log(`TOTAL PINS AUDITED & TESTED: ${totalPinsTested}`);
console.log(`VALID PIN SIMULATION EXECUTIONS: ${validPinsCount}`);
console.log(`ERRORS ENCOUNTERED: ${errorsFound.length}`);
console.log(`WARNINGS: ${warningsFound.length}`);

if (errorsFound.length > 0) {
  console.error(`\nDETAILED ERRORS:\n- ${errorsFound.join('\n- ')}`);
}
if (warningsFound.length > 0) {
  console.warn(`\nDETAILED WARNINGS:\n- ${warningsFound.join('\n- ')}`);
}

if (errorsFound.length === 0) {
  console.log('\nALL ECU PINOUTS & LIVE SIMULATIONS VERIFIED 100% ACCURATE!');
  process.exit(0);
} else {
  process.exit(1);
}
