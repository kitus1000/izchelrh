import { create } from 'zustand'
import { arrayMove } from '@dnd-kit/sortable'

export type BlockType =
    | 'encabezado'
    | 'tipo_contrato'
    | 'puesto_funciones'
    | 'jornada_horario'
    | 'salario'
    | 'vacaciones'
    | 'descanso_semanal'
    | 'clausula_libre'
    | 'firmas'

export interface ContractBlock {
    id: string; // unique shortid
    type: BlockType;
    isClause: boolean; // if true, it will be auto-numbered (PRIMERA, SEGUNDA)
    optionalTitle: string; // Title for the interface / pdf
    data: any; // arbitrary form data
    articles: string[]; // array of short strings 'Art. 47'
    ordinal?: string; // computed value by engine 'PRIMERA'
}

interface ContractConfig {
    showLegalData: boolean;
    fechaContrato: string;
    lugarFirma: string;
}

interface ContractState {
    blocks: ContractBlock[];
    config: ContractConfig;
    activeBlockId: string | null;
    selectedEmpleado: any | null;
    setBlocks: (blocks: ContractBlock[]) => void;
    setSelectedEmpleado: (empleado: any | null) => void;
    addBlock: (type: BlockType, id: string) => void;
    removeBlock: (id: string) => void;
    updateBlockData: (id: string, data: any) => void;
    updateBlockDetails: (id: string, updates: Partial<ContractBlock>) => void;
    reorderBlocks: (oldIndex: number, newIndex: number) => void;
    setActiveBlock: (id: string | null) => void;
    setConfig: (config: Partial<ContractConfig>) => void;
    reset: () => void;
}

const getDefaultData = (type: BlockType) => {
    switch (type) {
        case 'encabezado': return { patron: '', clasePatron: 'moral' };
        case 'tipo_contrato': return { tipo: 'indeterminado', periodo_prueba: false, dias_prueba: 30 };
        case 'puesto_funciones': return { puesto: '', departamento: '', funciones: '' };
        case 'jornada_horario': return { tipo: 'diurna', dias: 'Lunes a Viernes', entrada: '09:00', salida: '18:00', comidaMinutos: 60 };
        case 'salario': return { monto: 0, periodicidad: 'quincenal', medio_pago: 'transferencia bancaria' };
        case 'vacaciones': return { dias_iniciales: 12, prima_porcentaje: 25, dias_aguinaldo: 15 };
        case 'descanso_semanal': return { dias: 'Domingo' };
        case 'clausula_libre': return { texto: '' };
        case 'firmas': return { texto_cierre: 'Leído que fue el presente contrato por las partes y enteradas de su contenido y alcance legal, lo firman al calce para constancia.', conTestigos: true };
        default: return {};
    }
}

const getDefaultTitle = (type: BlockType) => {
    switch (type) {
        case 'encabezado': return 'Encabezado y Declaraciones';
        case 'tipo_contrato': return 'DEL TIPO DE CONTRATO';
        case 'puesto_funciones': return 'DEL PUESTO Y FUNCIONES';
        case 'jornada_horario': return 'DE LA JORNADA DE TRABAJO';
        case 'salario': return 'DEL SALARIO Y FORMA DE PAGO';
        case 'vacaciones': return 'DE LAS VACACIONES Y AGUINALDO';
        case 'descanso_semanal': return 'DÍAS DE DESCANSO';
        case 'clausula_libre': return 'CLÁUSULA LIBRE';
        case 'firmas': return 'Cierre y Firmas';
        default: return '';
    }
}

const isClauseDefault = (type: BlockType) => {
    return !['encabezado', 'firmas'].includes(type)
}

export const useContractStore = create<ContractState>((set, get) => ({
    blocks: [],
    config: {
        showLegalData: true,
        fechaContrato: new Date().toISOString().split('T')[0],
        lugarFirma: 'Monterrey, Nuevo León'
    },
    activeBlockId: null,
    selectedEmpleado: null,

    setBlocks: (blocks) => set({ blocks }),
    setSelectedEmpleado: (empleado) => set({ selectedEmpleado: empleado }),

    addBlock: (type: BlockType, id: string) => {
        set((state) => {
            const newBlock: ContractBlock = {
                id,
                type,
                isClause: isClauseDefault(type),
                optionalTitle: getDefaultTitle(type),
                data: getDefaultData(type),
                articles: []
            };
            return { blocks: [...state.blocks, newBlock], activeBlockId: id };
        })
    },

    removeBlock: (id: string) => {
        set((state) => ({
            blocks: state.blocks.filter(b => b.id !== id),
            activeBlockId: state.activeBlockId === id ? null : state.activeBlockId
        }))
    },

    updateBlockData: (id: string, data: any) => {
        set((state) => ({
            blocks: state.blocks.map(b => b.id === id ? { ...b, data: { ...b.data, ...data } } : b)
        }))
    },

    updateBlockDetails: (id: string, updates: Partial<ContractBlock>) => {
        set((state) => ({
            blocks: state.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
        }))
    },

    reorderBlocks: (oldIndex: number, newIndex: number) => {
        set((state) => ({
            blocks: arrayMove(state.blocks, oldIndex, newIndex)
        }))
    },

    setActiveBlock: (id: string | null) => set({ activeBlockId: id }),

    setConfig: (configUpdate) => set((state) => ({ config: { ...state.config, ...configUpdate } })),

    reset: () => set({ blocks: [], activeBlockId: null, selectedEmpleado: null })
}));
