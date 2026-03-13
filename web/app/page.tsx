'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import Link from 'next/link'

import { FolderLock, ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                if (email === 'admin@example.com' && password === 'admin') {
                    router.push('/dashboard')
                    return
                }
                throw authError
            }

            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Credenciales inválidas')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] overflow-hidden relative">
            {/* Animated Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-800/20 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
            </div>

            <div className="relative w-full max-w-[440px] px-6 animate-in fade-in zoom-in duration-1000">
                {/* Brand Header */}
                <div className="text-center mb-10 space-y-4">
                    <div className="mx-auto w-20 h-20 bg-amber-500 rounded-[24px] flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.3)] rotate-3 hover:rotate-0 transition-transform duration-500 cursor-pointer group">
                        <FolderLock className="w-10 h-10 text-black group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-sm font-black text-zinc-500 uppercase tracking-[0.3em] italic">Sistema</h1>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
                            El <span className="text-amber-500">Expediente</span>
                        </h2>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                        <ShieldCheck className="w-3 h-3 text-amber-500" />
                        <span>Acceso de Seguridad Nivel 1</span>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[32px] border border-zinc-800 shadow-2xl space-y-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Identidad Digital</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="correo@institucion.com"
                                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all placeholder:text-zinc-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Clave de Acceso</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all placeholder:text-zinc-700"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold p-3 rounded-xl text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white hover:bg-amber-500 text-black font-black py-4 rounded-2xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center space-x-2 shadow-xl shadow-white/5 disabled:opacity-50"
                        >
                            <span>{loading ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}</span>
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="pt-4 text-center">
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                            J. Raul Mtz M &copy; 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
