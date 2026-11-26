export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-lg border border-transparent bg-[#DC2626] px-4 py-2.5 text-xs font-semibold text-white transition duration-150 ease-in-out hover:bg-[#B91C1C] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:ring-offset-1 active:bg-[#991B1B] ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
