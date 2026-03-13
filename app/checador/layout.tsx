export default function ChecadorLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 w-full h-screen overflow-hidden bg-black text-white select-none touch-none overscroll-none font-sans">
            {children}
        </div>
    )
}
