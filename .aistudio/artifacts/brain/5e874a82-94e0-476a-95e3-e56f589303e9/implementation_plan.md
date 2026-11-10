# Revised Implementation Plan: AI Schematic & PCB Intelligence Scanner

## System Constitution & Engineering Principles

> **AI ASSISTED. ENGINEER VERIFIED.**  
> The system must never invent hidden copper tracks, internal PCB layers, component values, or circuit paths without visual or documented evidence. When evidence is incomplete, the system must explicitly mark status as `UNVERIFIED` or `UNKNOWN` and display `CONNECTION PATH INCOMPLETE`.

---

## 1. User Interface & Workspace Layout Architecture
Based on technician user feedback, the workspace uses a **Full-Screen Canvas with Expandable Floating Inspection HUD**:

- **Central Interactive Canvas**:
  - Full-screen high-resolution viewer supporting pan, multi-touch zoom ($50\% - 500\%$), coordinate-synchronized vector overlays, and image coordinate normalization.
  - Interactive SVG overlay rendering detected component bounding boxes, pin terminals, test points, and illuminated copper trace nets.
- **Expandable Floating Inspection HUD (Right/Top)**:
  - Collapsible overlay panel displaying selected component properties: Reference Designator (e.g., R103, D12, U10), Decoded Value (1 kΩ, 4.7 µF), Package Style (SMD 0805, TO-252, QFP-64), Circuit Net, Verification Status (`VERIFIED`, `CROSS_REFERENCED`, `UNVERIFIED`, `UNKNOWN`), Confidence Score, Datasheet excerpts, and Failure Symptoms.
  - **Readout Classification Indicator**: Explicitly labels measurements as `SIMULATED`, `MEASURED`, `EXPECTED`, or `UNKNOWN`.
- **Floating Document & Layer Drawer (Left)**:
  - Drawer storing pre-loaded Philippine market ECU documents (Toyota Hilux 1GD-FTV 5V & Injector Circuit, Isuzu D-Max 4JJ1 Transtron PCB Top/Bottom photos, Mitsubishi Montero 4N15 Piezo PCB, Ford Ranger SID208 Power Supply) as well as custom technician file uploads (PNG, JPG, WEBP, PDF up to 20MB).
- **ECU Board Comparison & Revision Detection Panel**:
  - Side-by-side or overlay comparison of two ECU boards (e.g. Known-Good Board vs Damaged Board, or Revision A vs Revision B) highlighting component differences, missing components, changed markings, and trace routing shifts.
- **Floating Engineering Control Bar (Bottom)**:
  - Controls for Net Tracing, Virtual Probe Snapping (DMM Red/Black probes directly on PCB pads), Virtual Fault Injection, Manual Audit Corrections, and Technical PDF Report Export.

---

## 2. Technical Architecture & File Structure

```
src/
├── types/
│   └── pcbScanner.ts                   # Models for PCBProject, DetectedComponent, Net, AuditHistory, ImagePage, BoardComparison
├── services/
│   ├── pcbAnalysisEngine.ts            # Vision AI extraction parser, OCR normalizer, evidence classifier
│   └── pcbStorageEngine.ts             # IndexedDB & LocalStorage persistent project storage & export
├── data/
│   └── samplePcbDatabase.ts            # Pre-loaded Philippine ECU schematics, PCB photos, and component datasets
├── components/
│   ├── SchematicPcbScanner.tsx         # Main scanner module workspace container
│   ├── FloatingComponentHud.tsx        # Floating expandable component dossier & simulation controller
│   ├── PcbCanvasOverlay.tsx            # High-resolution interactive SVG coordinate overlay & zoom canvas
│   ├── BoardComparisonView.tsx         # ECU Board Revision & Side-by-side Comparison tool
│   ├── NetTracingDrawer.tsx            # Circuit net path trace visualizer with incomplete path handling
│   ├── PcbManualCorrectionModal.tsx    # Technician verification & audit correction modal
│   └── PcbReportExportModal.tsx        # Engineering PDF report generator for PCB projects
└── server.ts                           # Server-side /api/gemini/analyze-schematic multimodal vision endpoint with rate limiting & validation
```

---

## 3. Implementation Schedule by Phases

### Phase A: Core Data Architecture, Multi-Format Import & Storage Persistence
- Implement `pcbScanner.ts` data structures with ID tracking, evidence sources, and confidence scores.
- Create `pcbStorageEngine.ts` utilizing IndexedDB / LocalStorage to store projects, original images, SVG coordinates, technician annotations, and audit logs.
- Populate `samplePcbDatabase.ts` with authentic Philippine market ECU schematics and PCB photographs.
- Build security-validated file upload pipeline (MIME validation for PNG, JPG, WEBP, PDF up to 20MB, error handling, rate limiting).

### Phase B: Gemini Vision AI Analysis & OCR Component Recognition
- Extend `server.ts` with `/api/gemini/analyze-schematic` endpoint using `@google/genai` vision capabilities.
- Extract component reference designators (R103, C25, D12, Q5, U10, IC1, TP1, J1), component categories, package styles, values, and bounding coordinates `[ymin, xmin, ymax, xmax]`.
- Enforce evidence-based classification (`VERIFIED`, `CROSS_REFERENCED`, `UNVERIFIED`, `UNKNOWN`) and local computer-vision fallback for offline viewing/annotation.

### Phase C: Interactive SVG Overlay & Copper Track Net Tracing
- Build `PcbCanvasOverlay.tsx` rendering high-resolution interactive SVG bounding boxes, pads, and trace paths over the original source image.
- Build `NetTracingDrawer.tsx` allowing technicians to select component terminals and trace established electrical paths (e.g. ECU +12V Input $\rightarrow$ Protection Diode $\rightarrow$ Voltage Regulator $\rightarrow$ 5V Ref Out).
- Display explicit `CONNECTION PATH INCOMPLETE` warnings when internal copper layers or unverified connections exist.

### Phase D: Component Dossier, Datasheet Library & ECU Board Comparison
- Build `FloatingComponentHud.tsx` displaying full component specifications, pin assignments, test procedures, failure symptoms, and matching datasheets.
- Build `BoardComparisonView.tsx` enabling side-by-side and overlay comparison between two ECU boards/revisions (e.g. Known-Good vs Damaged Board), highlighting component differences, missing parts, and changed markings.

### Phase E: Deterministic Simulation Integration & Virtual Probe Snapping
- Connect mapped PCB pads and test points directly to `electricalSimulationEngine.ts`.
- Snap virtual DMM Red/Black probes directly to pads on the schematic image to compute exact mathematical voltages, currents, diode drops ($V_f$), and live waveforms.
- Label all HUD readouts explicitly as `SIMULATED`, `MEASURED`, `EXPECTED`, or `UNKNOWN`.

### Phase F: Fault Injection & Gemini Engineering Assistant Integration
- Implement virtual fault injection (open resistor, shorted capacitor, shorted MOSFET, corroded trace, missing ground) and compute circuit telemetry changes.
- Pass current scanner context (document type, selected component, circuit graph, DMM readouts, injected faults) to Gemini AI for technical diagnostic guidance.

### Phase G: Manual Technician Corrections, Audit Trail & PDF Report Export
- Build `PcbManualCorrectionModal.tsx` allowing technicians to add missing components, edit designators/values, adjust bounding boxes, and log verification history.
- Maintain audit trail recording previous value, new value, technician ID, timestamp, and rationale.
- Build `PcbReportExportModal.tsx` generating a technical PDF engineering report with annotated image overlay, component table, net traces, and test results.

---

## 4. Acceptance Criteria & Required Verification Scenarios

1. **Test 1 - Schematic Parsing**: Upload/select Toyota Hilux ECU power schematic; verify symbols (resistors, diodes, ICs) and reference designators (R103, D12, U10) are detected and rendered as clickable overlays.
2. **Test 2 - Resistor Inspection**: Select R103 on canvas image; verify decoded value (1 kΩ), package style, confidence score, and bounding box highlight.
3. **Test 3 - Diode & Orientation**: Select protection diode D12; verify cathode stripe orientation and diode drop ($V_f = 0.55\text{V}$) are displayed.
4. **Test 4 - Net Tracing & Incomplete Path Handling**: Select ECU 12V terminal and click "Trace Circuit Net"; verify path to 5V regulator is highlighted, or displays `CONNECTION PATH INCOMPLETE` if unverified.
5. **Test 5 - PCB Photo Mapping**: Load Isuzu 4JJ1 PCB photograph; verify components and visible pads map without creating fictional hidden internal trace assumptions.
6. **Test 6 - Multi-Image Project & Board Comparison**: Load top and bottom PCB photos of Montero 4N15 ECU and run side-by-side comparison with a known-good revision board to highlight component differences.
7. **Test 7 - Virtual Multimeter Probe Snap**: Snap DMM probes to 5V test point on schematic; verify live 5.000V DC reading in HUD explicitly labeled `SIMULATED`.
8. **Test 8 - Mathematical Simulation**: Change resistor value from 1 kΩ to 10 kΩ; verify simulated node voltage recalculates mathematically.
9. **Test 9 - Fault Injection**: Inject open-circuit fault on protection diode; verify 5V output collapses and HUD explains failure mode.
10. **Test 10 - Manual Correction & Audit Log**: Edit component reference from R103 to R104; verify audit log stores timestamp, previous value, new value, and technician ID.
11. **Test 11 - Project Persistence**: Save PCB project, reload workspace, and verify all overlays, annotations, and audit logs persist via IndexedDB.
12. **Test 12 - Engineering PDF Export**: Export PDF report and verify annotated image, component table, and simulation results.
