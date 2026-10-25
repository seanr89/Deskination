import React, { useState, useRef, useEffect } from 'react';
import { Desk, Floor, FloorElement, DeskType } from '../types/deskBooking';
import { useDeskBooking } from '../context/DeskBookingContext';
import { 
  Move, 
  RotateCw, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Check, 
  Grid, 
  Copy, 
  Maximize2, 
  Sliders, 
  Layers, 
  DoorOpen, 
  Coffee, 
  Sparkles, 
  HelpCircle,
  Undo2
} from 'lucide-react';

interface EditableFloorPlanProps {
  floor: Floor;
  desks: Desk[];
  onClose: () => void;
  onSaved?: () => void;
}

export const EditableFloorPlan: React.FC<EditableFloorPlanProps> = ({
  floor,
  desks,
  onClose,
  onSaved
}) => {
  const { 
    currentLocationId, 
    updateDeskPosition, 
    batchUpdateDeskPositions, 
    updateFloorElements, 
    addDesk, 
    deleteDesk,
    updateDesk
  } = useDeskBooking();

  // Local state for desks and elements before saving
  const [localDesks, setLocalDesks] = useState<Desk[]>(() => {
    return desks.filter(d => d.floorId === floor.id);
  });

  const [localElements, setLocalElements] = useState<FloorElement[]>(() => {
    return floor.elements && floor.elements.length > 0
      ? [...floor.elements]
      : [
          {
            id: 'elem-lift-default',
            name: 'Elevator Core & Stairs',
            type: 'stairs',
            x: 2,
            y: 40,
            width: 7,
            height: 20,
            label: 'Lift Core'
          },
          {
            id: 'elem-meeting-default',
            name: 'Boardroom A',
            type: 'room',
            x: 82,
            y: 8,
            width: 15,
            height: 26,
            label: 'Conf Room A'
          },
          {
            id: 'elem-coffee-default',
            name: 'Coffee Bar',
            type: 'kitchen',
            x: 78,
            y: 42,
            width: 18,
            height: 18,
            label: 'Coffee Point'
          },
          {
            id: 'elem-restroom-default',
            name: 'Restrooms',
            type: 'restroom',
            x: 2,
            y: 75,
            width: 9,
            height: 18,
            label: 'Restrooms'
          }
        ];
  });

  // Selected item: { type: 'desk' | 'element', id: string } | null
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'desk' | 'element'>('desk');

  // Modes
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [placementMode, setPlacementMode] = useState<'none' | 'desk' | 'room' | 'kitchen' | 'entrance'>('none');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dragging state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingTarget, setDraggingTarget] = useState<{ id: string; type: 'desk' | 'element'; offsetX: number; offsetY: number } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Convert mouse event clientX/clientY to percentage on canvas
  const getCoordinatesFromEvent = (e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 50, y: 50 };
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    let x = Math.max(3, Math.min(97, rawX));
    let y = Math.max(3, Math.min(97, rawY));

    if (snapToGrid) {
      // Snap to 2% grid
      x = Math.round(x / 2) * 2;
      y = Math.round(y / 2) * 2;
    }

    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  // Mouse Move listener while dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingTarget || !canvasRef.current) return;
      const { x, y } = getCoordinatesFromEvent(e);

      if (draggingTarget.type === 'desk') {
        setLocalDesks(prev => prev.map(d => {
          if (d.id === draggingTarget.id) {
            return {
              ...d,
              position: { x, y }
            };
          }
          return d;
        }));
      } else {
        setLocalElements(prev => prev.map(el => {
          if (el.id === draggingTarget.id) {
            return {
              ...el,
              x,
              y
            };
          }
          return el;
        }));
      }
      setHasUnsavedChanges(true);
    };

    const handleMouseUp = () => {
      if (draggingTarget) {
        setDraggingTarget(null);
      }
    };

    if (draggingTarget) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTarget, snapToGrid]);

  // Handle Canvas Click (e.g. for placing new items)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (placementMode === 'none') {
      // Deselect if clicked empty background
      if (e.target === canvasRef.current) {
        setSelectedId(null);
      }
      return;
    }

    const { x, y } = getCoordinatesFromEvent(e);

    if (placementMode === 'desk') {
      const nextNum = localDesks.length + 1;
      const prefix = floor.name.includes('Floor 22') ? 'NY-22' : floor.name.includes('Berlin') ? 'BER-' : 'LDN-4';
      const code = `${prefix}${String(nextNum).padStart(2, '0')}`;
      
      const newDesk: Desk = {
        id: `desk-custom-${Date.now()}`,
        code,
        name: `Desk ${code} - Hot Desk`,
        locationId: floor.locationId,
        floorId: floor.id,
        zoneId: floor.zones[0]?.id || 'zone-default',
        deskType: 'standing',
        equipment: ['Single 27" Dell Monitor', 'Electric Sit-Stand', 'USB-C 90W'],
        status: 'active',
        position: { x, y },
        rotation: 0
      };

      setLocalDesks(prev => [...prev, newDesk]);
      setSelectedId(newDesk.id);
      setSelectedType('desk');
      showToast(`Added ${code} at (${x}%, ${y}%)`);
    } else {
      // Placing an architectural element
      const elemType = placementMode === 'room' ? 'room' : placementMode === 'kitchen' ? 'kitchen' : 'entrance';
      const name = placementMode === 'room' ? 'New Meeting Room' : placementMode === 'kitchen' ? 'Kitchenette' : 'Main Entrance';
      
      const newElement: FloorElement = {
        id: `elem-${Date.now()}`,
        name,
        type: elemType,
        x,
        y,
        width: placementMode === 'room' ? 16 : 12,
        height: placementMode === 'room' ? 20 : 14,
        label: name
      };

      setLocalElements(prev => [...prev, newElement]);
      setSelectedId(newElement.id);
      setSelectedType('element');
      showToast(`Added ${name}`);
    }

    setPlacementMode('none');
    setHasUnsavedChanges(true);
  };

  // Rotate selected desk
  const handleRotateSelected = () => {
    if (!selectedId || selectedType !== 'desk') return;
    setLocalDesks(prev => prev.map(d => {
      if (d.id === selectedId) {
        const nextRotation = ((d.rotation || 0) + 90) % 360;
        return { ...d, rotation: nextRotation };
      }
      return d;
    }));
    setHasUnsavedChanges(true);
  };

  // Duplicate selected desk
  const handleDuplicateSelected = () => {
    if (!selectedId || selectedType !== 'desk') return;
    const source = localDesks.find(d => d.id === selectedId);
    if (!source) return;

    const nextNum = localDesks.length + 1;
    const prefix = source.code.split('-')[0] + '-';
    const newCode = `${prefix}${String(nextNum).padStart(2, '0')}`;

    const duplicated: Desk = {
      ...source,
      id: `desk-dup-${Date.now()}`,
      code: newCode,
      name: `Desk ${newCode}`,
      position: {
        x: Math.min(94, source.position.x + 8),
        y: source.position.y
      }
    };

    setLocalDesks(prev => [...prev, duplicated]);
    setSelectedId(duplicated.id);
    setHasUnsavedChanges(true);
    showToast(`Duplicated ${source.code} as ${newCode}`);
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (!selectedId) return;
    if (selectedType === 'desk') {
      setLocalDesks(prev => prev.filter(d => d.id !== selectedId));
      showToast('Desk removed from layout.');
    } else {
      setLocalElements(prev => prev.filter(el => el.id !== selectedId));
      showToast('Room / element removed from layout.');
    }
    setSelectedId(null);
    setHasUnsavedChanges(true);
  };

  // Save changes to Context and storage
  const handleSaveLayout = () => {
    // 1. Batch update desk positions and new desks
    const updates = localDesks.map(d => ({
      id: d.id,
      position: d.position,
      rotation: d.rotation || 0
    }));

    // Update positions of existing desks
    batchUpdateDeskPositions(updates);

    // Add any completely new desks created in the editor
    for (const ld of localDesks) {
      const exists = desks.some(d => d.id === ld.id);
      if (!exists) {
        addDesk(ld);
      } else {
        updateDesk(ld);
      }
    }

    // Delete any desks that were removed in the editor
    const currentFloorOriginalDesks = desks.filter(d => d.floorId === floor.id);
    for (const od of currentFloorOriginalDesks) {
      const stillPresent = localDesks.some(d => d.id === od.id);
      if (!stillPresent) {
        deleteDesk(od.id);
      }
    }

    // 2. Save architectural elements to floor
    updateFloorElements(floor.locationId, floor.id, localElements);

    setHasUnsavedChanges(false);
    showToast('Office floor map layout saved successfully!');
    if (onSaved) {
      onSaved();
    }
  };

  // Selected item object
  const selectedDesk = selectedType === 'desk' ? localDesks.find(d => d.id === selectedId) : null;
  const selectedElement = selectedType === 'element' ? localElements.find(el => el.id === selectedId) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-5 space-y-4">
      
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)}>&times;</button>
        </div>
      )}

      {/* Editor Header & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-600 text-white uppercase font-mono">
              Layout Designer
            </span>
            <h3 className="text-base font-semibold text-slate-900">
              Custom Office Map Editor: {floor.name}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Drag desks, add meeting rooms, rotate workstations, and align desks to match your exact physical floorplan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Snap Grid Toggle */}
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              snapToGrid ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
            title="Snap coordinates to align desks in neat rows"
          >
            <Grid className="w-3.5 h-3.5" />
            Snap to Grid ({snapToGrid ? 'ON' : 'OFF'})
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveLayout}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-all ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold ring-2 ring-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{hasUnsavedChanges ? 'Save Layout Changes *' : 'Save Layout'}</span>
          </button>

          {/* Exit Editor */}
          <button
            onClick={() => {
              if (hasUnsavedChanges && !confirm('You have unsaved changes. Exit layout editor anyway?')) {
                return;
              }
              onClose();
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Exit Editor
          </button>
        </div>
      </div>

      {/* Editor Tool Palette */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
        
        {/* Placement Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700">Add to Floor:</span>
          
          <button
            onClick={() => setPlacementMode(placementMode === 'desk' ? 'none' : 'desk')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              placementMode === 'desk'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Desk
          </button>

          <button
            onClick={() => setPlacementMode(placementMode === 'room' ? 'none' : 'room')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              placementMode === 'room'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Meeting Room
          </button>

          <button
            onClick={() => setPlacementMode(placementMode === 'kitchen' ? 'none' : 'kitchen')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              placementMode === 'kitchen'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            Kitchen / Coffee Point
          </button>

          <button
            onClick={() => setPlacementMode(placementMode === 'entrance' ? 'none' : 'entrance')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              placementMode === 'entrance'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            Entrance Door
          </button>

          {placementMode !== 'none' && (
            <span className="text-indigo-700 font-medium animate-pulse ml-2">
              Click anywhere on the floor map to place it!
            </span>
          )}
        </div>

        {/* Selected Item Quick Controls */}
        {selectedId && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="text-slate-500 font-mono">
              Selected: <strong className="text-slate-900">{selectedDesk ? selectedDesk.code : selectedElement?.name}</strong>
            </span>

            {selectedType === 'desk' && (
              <>
                <button
                  onClick={handleRotateSelected}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded text-slate-700 font-medium flex items-center gap-1"
                  title="Rotate desk 90 degrees"
                >
                  <RotateCw className="w-3 h-3" />
                  Rotate
                </button>
                <button
                  onClick={handleDuplicateSelected}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded text-slate-700 font-medium flex items-center gap-1"
                  title="Duplicate this desk"
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </button>
              </>
            )}

            <button
              onClick={handleDeleteSelected}
              className="px-2.5 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded text-rose-700 font-medium flex items-center gap-1"
              title="Remove item"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}

      </div>

      {/* Main Interactive Canvas */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`relative w-full aspect-[16/10] bg-slate-50 rounded-lg border-2 border-dashed overflow-hidden select-none transition-colors ${
          placementMode !== 'none'
            ? 'border-indigo-400 bg-indigo-50/20 cursor-crosshair'
            : 'border-slate-300 cursor-default'
        }`}
      >
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Placement instructions banner */}
        {placementMode !== 'none' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-indigo-900 text-white px-4 py-1.5 rounded-full text-xs font-medium shadow-lg z-30 pointer-events-none flex items-center gap-2">
            <span>Click on the floor to position {placementMode}</span>
            <span className="text-[11px] text-indigo-300 font-mono">(Esc to cancel)</span>
          </div>
        )}

        {/* Architectural Floor Elements (Rooms, Coffee, Restrooms, Stairs) */}
        {localElements.map(el => {
          const isSelected = selectedId === el.id;

          let bgClass = 'bg-slate-200/90 border-slate-300 text-slate-700';
          if (el.type === 'room') bgClass = 'bg-blue-50/80 border-blue-300 text-blue-900';
          if (el.type === 'kitchen') bgClass = 'bg-amber-50/80 border-amber-300 text-amber-900';
          if (el.type === 'restroom') bgClass = 'bg-slate-100 border-slate-300 text-slate-600';
          if (el.type === 'stairs') bgClass = 'bg-slate-200 border-slate-400 text-slate-700';

          return (
            <div
              key={el.id}
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.width}%`,
                height: `${el.height}%`,
              }}
              onMouseDown={e => {
                e.stopPropagation();
                setSelectedId(el.id);
                setSelectedType('element');
                setDraggingTarget({ id: el.id, type: 'element', offsetX: 0, offsetY: 0 });
              }}
              className={`absolute rounded border p-2 cursor-move flex flex-col justify-between transition-shadow ${bgClass} ${
                isSelected ? 'ring-2 ring-slate-900 shadow-md' : 'hover:border-slate-400'
              }`}
            >
              <div className="text-[10px] font-semibold tracking-tight uppercase flex items-center justify-between">
                <span className="truncate">{el.label || el.name}</span>
                <Move className="w-2.5 h-2.5 opacity-50" />
              </div>
              <div className="text-[9px] text-slate-500 font-mono">
                {el.width}×{el.height}%
              </div>
            </div>
          );
        })}

        {/* Desks on Floor Canvas */}
        {localDesks.map(desk => {
          const isSelected = selectedId === desk.id;
          const rotation = desk.rotation || 0;

          return (
            <div
              key={desk.id}
              style={{
                left: `${desk.position.x}%`,
                top: `${desk.position.y}%`,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`
              }}
              onMouseDown={e => {
                e.stopPropagation();
                setSelectedId(desk.id);
                setSelectedType('desk');
                setDraggingTarget({ id: desk.id, type: 'desk', offsetX: 0, offsetY: 0 });
              }}
              className={`absolute cursor-grab active:cursor-grabbing z-20 transition-transform`}
            >
              <div
                className={`w-14 h-11 rounded-md border text-[11px] font-mono flex flex-col items-center justify-center select-none shadow-xs transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-950 ring-4 ring-indigo-400 shadow-lg'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400'
                }`}
              >
                {/* Desk code */}
                <span className="font-bold tracking-tight px-1 truncate max-w-full">
                  {desk.code.replace('LDN-', '').replace('NY-', '').replace('BER-', '')}
                </span>

                {/* Desk Type mini tag */}
                <span className={`text-[9px] font-sans truncate max-w-[48px] ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {desk.deskType === 'standing' ? 'Stand' : desk.deskType === 'dual_screen' ? 'Dual' : desk.deskType === 'ultrawide' ? 'Wide' : 'Desk'}
                </span>

                {/* Orientation Direction Indicator Bar */}
                <div className={`absolute top-0 left-2 right-2 h-1 rounded-full ${
                  isSelected ? 'bg-indigo-400' : 'bg-slate-400'
                }`} title="Front edge facing direction" />
              </div>

              {/* Coordinates badge while selected */}
              {isSelected && (
                <div 
                  style={{ transform: `rotate(-${rotation}deg)` }}
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-mono text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm pointer-events-none"
                >
                  X: {desk.position.x}% · Y: {desk.position.y}%
                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* Selected Item Editor Sidebar / Drawer */}
      {selectedDesk && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Desk Code</label>
            <input
              type="text"
              value={selectedDesk.code}
              onChange={e => {
                const val = e.target.value;
                setLocalDesks(prev => prev.map(d => d.id === selectedDesk.id ? { ...d, code: val } : d));
                setHasUnsavedChanges(true);
              }}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Desk Name</label>
            <input
              type="text"
              value={selectedDesk.name}
              onChange={e => {
                const val = e.target.value;
                setLocalDesks(prev => prev.map(d => d.id === selectedDesk.id ? { ...d, name: val } : d));
                setHasUnsavedChanges(true);
              }}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Desk Type</label>
            <select
              value={selectedDesk.deskType}
              onChange={e => {
                const val = e.target.value as DeskType;
                setLocalDesks(prev => prev.map(d => d.id === selectedDesk.id ? { ...d, deskType: val } : d));
                setHasUnsavedChanges(true);
              }}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
            >
              <option value="standing">Electric Standing</option>
              <option value="dual_screen">Dual 4K Displays</option>
              <option value="ultrawide">UltraWide Curved</option>
              <option value="quiet_booth">Silent Focus Pod</option>
              <option value="window_view">Window View</option>
              <option value="standard">Standard Desk</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Status</label>
            <select
              value={selectedDesk.status}
              onChange={e => {
                const val = e.target.value as 'active' | 'maintenance';
                setLocalDesks(prev => prev.map(d => d.id === selectedDesk.id ? { ...d, status: val } : d));
                setHasUnsavedChanges(true);
              }}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
            >
              <option value="active">Active (Bookable)</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      )}

      {selectedElement && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Element Label / Name</label>
            <input
              type="text"
              value={selectedElement.label || selectedElement.name}
              onChange={e => {
                const val = e.target.value;
                setLocalElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, label: val, name: val } : el));
                setHasUnsavedChanges(true);
              }}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Width (%)</label>
            <input
              type="number"
              min="5"
              max="50"
              value={selectedElement.width}
              onChange={e => {
                const val = Number(e.target.value);
                setLocalElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, width: val } : el));
                setHasUnsavedChanges(true);
              }}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Height (%)</label>
            <input
              type="number"
              min="5"
              max="50"
              value={selectedElement.height}
              onChange={e => {
                const val = Number(e.target.value);
                setLocalElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, height: val } : el));
                setHasUnsavedChanges(true);
              }}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
            />
          </div>
        </div>
      )}

    </div>
  );
};
