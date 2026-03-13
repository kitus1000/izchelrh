'use client'

import BlockLibrary from '@/components/contratos/BlockLibrary'
import ContractCanvas from '@/components/contratos/ContractCanvas'
import BlockConfigurator from '@/components/contratos/BlockConfigurator'
import { FileDown, LayoutPanelLeft, ListChecks, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useContractStore } from '@/store/contractStore'
import TemplateManager from '@/components/contratos/TemplateManager'
import EmpleadoSelector from '@/components/contratos/EmpleadoSelector'

export default function ConstructorClient() {
    const [exporting, setExporting] = useState(false)
    const canvasRef = useRef<HTMLDivElement>(null)
    const updateBlockData = useContractStore(state => state.updateBlockData)
    const blocks = useContractStore(state => state.blocks)

    useEffect(() => {
        const fetchEmpresa = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('configuracion_empresa')
                .select('nombre_empresa')
                .single()
            if (data?.nombre_empresa) {
                // Find the encabezado block and pre-fill patron field
                const encabezadoBlock = blocks.find(b => b.type === 'encabezado')
                if (encabezadoBlock && !encabezadoBlock.data.patron) {
                    updateBlockData(encabezadoBlock.id, { patron: data.nombre_empresa })
                }
            }
        }
        if (blocks.length > 0) {
            fetchEmpresa()
        }
    }, [blocks.length]) // Only re-run when blocks count changes

    // ─── PDF Export ─────────────────────────────────────────────────────
    const handleExport = async () => {
        if (!canvasRef.current || exporting) return
        setExporting(true)

        try {
            console.log('Iniciando exportación con dom-to-image-more...');
            const [jsPDFModule, domToImageModule] = await Promise.all([
                import('jspdf'),
                import('dom-to-image-more')
            ])

            const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default
            const domtoimage = domToImageModule.default || domToImageModule

            const el = canvasRef.current
            if (!el) throw new Error('Canvas element not found.');

            // Deep Clean CSS Reset for Export
            const styleEl = document.createElement('style');
            styleEl.innerHTML = `
                #contract-canvas-print * {
                    box-shadow: none !important;
                    outline: none !important;
                    --tw-ring-offset-shadow: 0 0 #0000 !important;
                    --tw-ring-shadow: 0 0 #0000 !important;
                    ring: 0 !important;
                }
                /* Remove global borders but KEEP those that are part of the document structure (signature lines) */
                #contract-canvas-print *:not(.border-t) {
                    border: 0 !important;
                }
                #contract-canvas-print .border-t {
                    border-top-width: 1px !important;
                    border-top-color: #000000 !important;
                    border-top-style: solid !important;
                }
                #contract-canvas-print {
                    border: 0 !important;
                    box-shadow: none !important;
                }
            `;
            document.head.appendChild(styleEl);

            console.log('Capturando imagen del canvas...');
            const dataUrl = await domtoimage.toJpeg(el, {
                quality: 0.95,
                bgcolor: '#ffffff',
                filter: (node: HTMLElement) => {
                    if (node.getAttribute?.('data-export-ignore') === 'true') return false;
                    return true;
                }
            })

            // Remove reset style
            document.head.removeChild(styleEl);

            console.log('Imagen capturada con éxito. Procesando PDF...');

            // Create a temporary image to get dimensions
            const img = new Image()
            img.src = dataUrl
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Error al cargar la imagen capturada.'));
            })

            const imgWidth = img.width
            const imgHeight = img.height

            // A4 dimensions in mm
            const PAGE_W = 210
            const PAGE_H = 297
            const MARGIN = 15
            const printW = PAGE_W - MARGIN * 2
            const printH = PAGE_H - MARGIN * 2

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

            // Scale image to fit width
            const scaleRatio = printW / imgWidth
            const scaledH = imgHeight * scaleRatio

            let yOffset = 0
            let page = 0

            while (yOffset < scaledH) {
                if (page > 0) pdf.addPage()

                // Calculate which part of the image to show on this page
                // Note: jspdf's addImage with cropping/offsetting can be tricky.
                // A simpler way is to add the full image multiple times with different Y positions
                // and a white overlay OR use the source coordinates if supported.

                // For jspdf, if we add image with a negative Y, it acts as an offset
                // We need to clip it. jspdf doesn't have a great clipping for images easily.

                // Alternative: Use canvas to slice the dataUrl into pages
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')!

                // Page height in pixels relative to scaled image
                const pageHPx = printH / scaleRatio

                canvas.width = imgWidth
                canvas.height = Math.min(pageHPx, imgHeight - (yOffset / scaleRatio))

                ctx.drawImage(
                    img,
                    0, yOffset / scaleRatio, imgWidth, canvas.height, // source
                    0, 0, imgWidth, canvas.height // destination
                )

                const pageData = canvas.toDataURL('image/jpeg', 0.95)
                const pageScaledH = canvas.height * scaleRatio

                pdf.addImage(pageData, 'JPEG', MARGIN, MARGIN, printW, pageScaledH)

                yOffset += printH
                page++
                console.log(`Página ${page} generada...`);
            }

            console.log('PDF finalizado. Guardando...');
            pdf.save('Contrato_Individual_de_Trabajo.pdf')
        } catch (err) {
            console.error('Error detallado al generar PDF:', err)
            alert('Error al generar PDF. Intenta nuevamente.')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] -m-4 sm:-m-6 lg:-m-8">
            {/* Header */}
            <div className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm relative">
                <div className="flex items-center gap-3">
                    <Link href="/documentos" className="text-zinc-500 hover:text-zinc-900 text-sm font-medium transition-colors">
                        ← Volver
                    </Link>
                    <div className="h-4 w-px bg-zinc-300"></div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-md">
                        <LayoutPanelLeft className="w-4 h-4" />
                        <span className="hidden xl:inline">Constructor Inteligente</span>
                    </div>
                </div>

                <div className="flex-1 flex justify-center px-4">
                    <EmpleadoSelector />
                </div>

                <div className="flex items-center gap-4">
                    <TemplateManager />
                    <div className="h-6 w-px bg-zinc-200"></div>
                    <button className="text-sm font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        <span className="hidden md:inline">Validar Legalidad (Próximamente)</span>
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="bg-black text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
                    >
                        {exporting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Generando PDF...</>
                        ) : (
                            <><FileDown className="w-4 h-4" /> Exportar PDF</>
                        )}
                    </button>
                </div>
            </div>

            {/* 3-column layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Library */}
                <div className="w-64 xl:w-72 shrink-0 z-10 shadow-lg relative">
                    <BlockLibrary />
                </div>

                {/* Center: Canvas */}
                <div className="flex-1 relative z-0">
                    <ContractCanvas canvasRef={canvasRef} isExporting={exporting} />
                </div>

                {/* Right: Configurator */}
                <div className="w-80 shrink-0 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] relative">
                    <BlockConfigurator />
                </div>
            </div>
        </div>
    )
}
