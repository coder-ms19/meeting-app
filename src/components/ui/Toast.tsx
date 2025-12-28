import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, X, Info } from "lucide-react";
import clsx from "clsx";

export type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "success") => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto dismiss
        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className={clsx(
                                "pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md p-4 rounded-xl shadow-2xl border backdrop-blur-md",
                                toast.type === "success" && "bg-[#1C1F26]/90 border-green-500/30 text-green-100",
                                toast.type === "error" && "bg-[#1C1F26]/90 border-red-500/30 text-red-100",
                                toast.type === "info" && "bg-[#1C1F26]/90 border-blue-500/30 text-blue-100"
                            )}
                        >
                            <div className={clsx(
                                "p-2 rounded-full",
                                toast.type === "success" && "bg-green-500/20 text-green-400",
                                toast.type === "error" && "bg-red-500/20 text-red-400",
                                toast.type === "info" && "bg-blue-500/20 text-blue-400"
                            )}>
                                {toast.type === "success" && <CheckCircle className="w-5 h-5" />}
                                {toast.type === "error" && <AlertCircle className="w-5 h-5" />}
                                {toast.type === "info" && <Info className="w-5 h-5" />}
                            </div>

                            <div className="flex-1 text-sm font-medium">{toast.message}</div>

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};
