import React, { useState } from 'react';
import { VEHICLE_DATABASE } from './data/automotiveDatabase';
import { VehicleProfile, BenchReading, ConnectorPin, ElectricalFault } from './types/automotive';
import { AppShell } from './components/AppShell';
import { Overview } from './components/Overview';
import { VirtualBenchWorkbench } from './components/VirtualBenchWorkbench';
import { WiringDiagramExplorer } from './components/WiringDiagramExplorer';
import { EcuPinoutExplorer } from './components/EcuPinoutExplorer';
import { ComponentReadingsLab } from './components/ComponentReadingsLab';
import { DtcTroubleshooting } from './components/DtcTroubleshooting';
import { AiEngineeringAssistant } from './components/AiEngineeringAssistant';
import { SchematicPcbScanner } from './components/SchematicPcbScanner';
import { VehicleSelectorModal } from './components/VehicleSelectorModal';
import { TestReportModal } from './components/TestReportModal';
import { SystemHealthTests } from './components/SystemHealthTests';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProfile>(VEHICLE_DATABASE[0]);
  const [selectedPinNumber, setSelectedPinNumber] = useState<number | null>(1); // Pin 1
  const [showVehicleModal, setShowVehicleModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showTestsModal, setShowTestsModal] = useState<boolean>(false);

  // Active bench readings log
  const [benchReadings, setBenchReadings] = useState<BenchReading[]>([
    {
      id: 'read-init-1',
      pinNumber: 1,
      connectorId: 'conn-c',
      pinLabel: '+B (Main Battery 12V)',
      measurementType: 'VOLTAGE_DC',
      measuredValue: 13.8,
      unit: 'V DC',
      expectedMin: 11.5,
      expectedMax: 14.5,
      status: 'PASS',
      notes: 'Initial bench supply baseline with Key ON (IGSW = 13.8V).',
      timestamp: '08:15:20 AM',
    },
    {
      id: 'read-init-2',
      pinNumber: 1,
      connectorId: 'conn-b',
      pinLabel: 'VC / VCC (5V Sensor Reference)',
      measurementType: 'VOLTAGE_DC',
      measuredValue: 5.002,
      unit: 'V DC',
      expectedMin: 4.95,
      expectedMax: 5.05,
      status: 'PASS',
      notes: 'Denso internal linear regulator holding precisely at 5.00V.',
      timestamp: '08:16:04 AM',
    },
  ]);

  const [activeFault, setActiveFault] = useState<ElectricalFault>({
    id: 'fault-none',
    name: 'Normal Operation',
    description: 'No electrical fault injected.',
    faultType: 'NONE',
    affectedCircuits: [],
  });

  const handleAddReading = (newReading: BenchReading) => {
    setBenchReadings((prev) => [newReading, ...prev]);
  };

  const handleDeleteReading = (id: string) => {
    setBenchReadings((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSelectPinForBench = (pinNum: number) => {
    setSelectedPinNumber(pinNum);
    setActiveTab('workbench');
  };

  const handleAskAiAboutReading = (reading: BenchReading) => {
    setActiveTab('ai-assistant');
  };

  const allPins = selectedVehicle.connectors.flatMap((c) => c.pins);
  const activePinObj = allPins.find((p) => p.pinNumber === selectedPinNumber) || null;

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      selectedVehicle={selectedVehicle}
      onOpenVehicleModal={() => setShowVehicleModal(true)}
      onOpenReportModal={() => setShowReportModal(true)}
      onOpenTestsModal={() => setShowTestsModal(true)}
    >
      {activeTab === 'overview' && (
        <Overview 
          vehicle={selectedVehicle} 
          readings={benchReadings} 
          onNavigate={setActiveTab} 
        />
      )}

      {activeTab === 'workbench' && (
        <VirtualBenchWorkbench
          vehicle={selectedVehicle}
          initialPinNumber={selectedPinNumber}
          onLogReading={handleAddReading}
          onAskAiAboutReading={handleAskAiAboutReading}
        />
      )}

      {activeTab === 'scanner' && (
        <SchematicPcbScanner
          vehicle={selectedVehicle}
          onSendPinToBench={handleSelectPinForBench}
        />
      )}

      {activeTab === 'wiring' && (
        <WiringDiagramExplorer
          vehicle={selectedVehicle}
          onSelectPinForBench={handleSelectPinForBench}
        />
      )}

      {activeTab === 'pinouts' && (
        <EcuPinoutExplorer
          vehicle={selectedVehicle}
          selectedPinNumber={selectedPinNumber}
          onSelectPin={(pinNum) => setSelectedPinNumber(pinNum)}
          onSendToBench={handleSelectPinForBench}
        />
      )}

      {activeTab === 'database' && (
        <EcuPinoutExplorer
          vehicle={selectedVehicle}
          selectedPinNumber={selectedPinNumber}
          onSelectPin={(pinNum) => setSelectedPinNumber(pinNum)}
          onSendToBench={handleSelectPinForBench}
        />
      )}

      {activeTab === 'readings' && (
        <ComponentReadingsLab
          vehicle={selectedVehicle}
          readings={benchReadings}
          onAddReading={handleAddReading}
          onDeleteReading={handleDeleteReading}
          onExportPdf={() => setShowReportModal(true)}
          onSelectPinForBench={handleSelectPinForBench}
        />
      )}

      {activeTab === 'dtc' && (
        <DtcTroubleshooting
          vehicle={selectedVehicle}
          onSelectPinForBench={handleSelectPinForBench}
        />
      )}

      {activeTab === 'ai-assistant' && (
        <AiEngineeringAssistant
          vehicle={selectedVehicle}
          selectedPin={activePinObj}
          readings={benchReadings}
          activeFault={activeFault}
        />
      )}

      {activeTab === 'reports' && (
        <ComponentReadingsLab
          vehicle={selectedVehicle}
          readings={benchReadings}
          onAddReading={handleAddReading}
          onDeleteReading={handleDeleteReading}
          onExportPdf={() => setShowReportModal(true)}
          onSelectPinForBench={handleSelectPinForBench}
        />
      )}

      {/* Modals */}
      {showVehicleModal && (
        <VehicleSelectorModal
          currentVehicle={selectedVehicle}
          onSelectVehicle={(veh) => {
            setSelectedVehicle(veh);
            setSelectedPinNumber(1);
          }}
          onClose={() => setShowVehicleModal(false)}
        />
      )}

      {showReportModal && (
        <TestReportModal
          vehicle={selectedVehicle}
          readings={benchReadings}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showTestsModal && (
        <SystemHealthTests
          onClose={() => setShowTestsModal(false)}
        />
      )}
    </AppShell>
  );
}
